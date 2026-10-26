import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Phone, Video, Delete, Search, Star, Clock, Users, 
  Voicemail, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  MoreVertical, Hash, Plus, X, Shield, ShieldCheck, ShieldAlert,
  Zap, Lock, UserPlus, MessageCircle,
  CheckCircle2, Send, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CallOutcomeBadge } from './CallOutcomeBadge';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';
import { runShieldPipeline, clearShieldCache, ScoreOutput } from '@/lib/chatr-shield/shield-pipeline';
import { ShieldDashboardDialog } from '@/components/chatr-shield/ShieldDashboardDialog';
import { shieldMetricsService, ShieldLiveMetrics } from '@/services/shieldMetricsService';

interface Contact {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  phone_number?: string;
  phone_search?: string;
  is_favorite?: boolean;
  is_online?: boolean;
  last_seen?: string;
  isSelf?: boolean;
}

interface CallLog {
  id: string;
  caller_id: string;
  receiver_id: string;
  caller_name: string;
  caller_avatar: string | null;
  receiver_name: string;
  receiver_avatar: string | null;
  call_type: 'audio' | 'video';
  status: string;
  duration: number;
  started_at: string;
  created_at: string;
  connection_quality?: string;
  missed?: boolean;
}

interface NonChatrContact {
  phone: string;
  name?: string;
}

interface AdvancedPhoneDialerProps {
  onCall: (contactId: string, contactName: string, callType: 'voice' | 'video') => void;
}

const keypadDigits = [
  { digit: '1', letters: '', icon: <Voicemail className="h-3 w-3" /> },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' },
];

const DTMF_FREQUENCIES: Record<string, [number, number]> = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
};

export function AdvancedPhoneDialer({ onCall }: AdvancedPhoneDialerProps) {
  const navigate = useNavigate();
  const haptics = useNativeHaptics();
  const [dialedNumber, setDialedNumber] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [favorites, setFavorites] = useState<Contact[]>([]);
  const [recentCalls, setRecentCalls] = useState<CallLog[]>([]);
  const [matchingUsers, setMatchingUsers] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'keypad' | 'recents' | 'contacts' | 'favorites'>('keypad');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showSpeedDial, setShowSpeedDial] = useState(false);
  const [showShieldDialog, setShowShieldDialog] = useState(false);
  const [showNonChatrDialog, setShowNonChatrDialog] = useState(false);
  const [nonChatrTarget, setNonChatrTarget] = useState<NonChatrContact | null>(null);
  const [speedDials, setSpeedDials] = useState<Record<string, Contact>>({});
  const [liveShieldScore, setLiveShieldScore] = useState<ScoreOutput | null>(null);
  const [shieldMetrics, setShieldMetrics] = useState<ShieldLiveMetrics>(shieldMetricsService.getMetrics());
  const [qrMode, setQrMode] = useState<'app' | 'universal'>('app');
  const [mobileSynced, setMobileSynced] = useState<boolean>(false);
  const syncToken = useRef('sync_' + Math.random().toString(36).substring(2, 9)).current;

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const directoryRef = useRef<Contact[]>([]);

  // Subscribe to live Shield metrics
  useEffect(() => {
    const unsub = shieldMetricsService.subscribe(setShieldMetrics);
    return () => unsub();
  }, []);

  // Listen for mobile QR pairing broadcast from phone
  useEffect(() => {
    const channel = supabase.channel(`shield-sync-${syncToken}`);
    channel
      .on('broadcast', { event: 'synced' }, (payload) => {
        setMobileSynced(true);
        haptics.success();
        toast.success('Mobile Shield Synchronized! Real-time Cross-Device Mesh Active.');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [syncToken]);

  // Initialize and load cached directory immediately
  useEffect(() => {
    try {
      clearShieldCache();
      const cached = localStorage.getItem('chatr_dialer_directory');
      if (cached) {
        const parsed = JSON.parse(cached) as Contact[];
        // Filter out any stale mock data
        const clean = parsed.filter(c => 
          !c.full_name?.includes('Al-Mansoori') && 
          !c.username?.includes('Al-Mansoori') &&
          !c.full_name?.includes('Mohammed Al-')
        );
        directoryRef.current = clean;
        setContacts(clean);
      }
    } catch {}
    loadData();
  }, []);

  // CHATR Shield Live Intelligence Lookup
  useEffect(() => {
    const raw = dialedNumber.replace(/\D/g, '');
    if (raw.length >= 4) {
      runShieldPipeline(dialedNumber).then(res => {
        setLiveShieldScore(res);
      }).catch(() => {});
    } else {
      setLiveShieldScore(null);
    }
  }, [dialedNumber]);

  // Fast In-Memory & Database Search
  useEffect(() => {
    const query = activeTab === 'keypad' ? dialedNumber : searchQuery;
    if (!query || query.trim().length < 2) {
      setMatchingUsers([]);
      setSearching(false);
      return;
    }

    const cleanQuery = query.trim();
    const cleanDigits = cleanQuery.replace(/\D/g, '');
    const isPhoneQuery = /^[\d\s+\-()]+$/.test(cleanQuery.replace(/\s/g, ''));
    const last10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;

    let localFound = false;
    const directory = directoryRef.current;
    if (directory.length > 0) {
      const localMatches = directory.filter(contact => {
        const phone = (contact.phone_number || contact.phone || contact.phone_search || '').replace(/\D/g, '');
        const name = (contact.full_name || contact.username || '').toLowerCase();
        const qLower = cleanQuery.toLowerCase();

        if (isPhoneQuery && cleanDigits.length >= 2) {
          return (
            phone.includes(cleanDigits) ||
            phone.includes(last10) ||
            (cleanDigits.length >= 4 && phone.slice(-10).includes(cleanDigits))
          );
        }

        return name.includes(qLower) || phone.includes(cleanDigits);
      }).sort((a, b) => {
        const scoreA = (a.avatar_url ? 50 : 0) + (a.full_name && !/^\+?\d+$/.test(a.full_name) ? 30 : 0);
        const scoreB = (b.avatar_url ? 50 : 0) + (b.full_name && !/^\+?\d+$/.test(b.full_name) ? 30 : 0);
        return scoreB - scoreA;
      });

      if (localMatches.length > 0) {
        localFound = true;
        setMatchingUsers(localMatches.slice(0, 8));
      } else {
        setMatchingUsers([]);
      }
    } else {
      setMatchingUsers([]);
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        let profiles: any[] = [];
        if (isPhoneQuery && cleanDigits.length >= 2) {
          const searchVariants = Array.from(new Set([
            cleanDigits,
            last10,
            cleanDigits.length === 10 ? `91${cleanDigits}` : null
          ].filter(Boolean))) as string[];

          const orFilters = searchVariants.flatMap(v => [
            `phone_number.ilike.%${v}%`,
            `phone_search.ilike.%${v}%`,
            `username.ilike.%${v}%`,
            `full_name.ilike.%${v}%`
          ]).join(',');

          const { data } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, phone_number, phone_search, is_verified, is_phone_verified')
            .or(orFilters)
            .limit(10);
          profiles = data || [];
        } else {
          const { data } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, phone_number, phone_search, is_verified, is_phone_verified')
            .or(`username.ilike.%${cleanQuery}%,full_name.ilike.%${cleanQuery}%`)
            .limit(10);
          profiles = data || [];
        }

        if (profiles.length > 0) {
          const sortedProfiles = [...profiles].sort((a: any, b: any) => {
            const scoreA = (a.avatar_url ? 50 : 0) + 
                           (a.full_name && !/^\+?\d+$/.test(a.full_name.trim()) ? 30 : 0) + 
                           (a.username && !/^\+?\d+$/.test(a.username.trim()) ? 20 : 0);
            const scoreB = (b.avatar_url ? 50 : 0) + 
                           (b.full_name && !/^\+?\d+$/.test(b.full_name.trim()) ? 30 : 0) + 
                           (b.username && !/^\+?\d+$/.test(b.username.trim()) ? 20 : 0);
            return scoreB - scoreA;
          });

          const remoteUsers = sortedProfiles.map(p => ({
            id: p.id,
            username: p.username || 'Chatr Member',
            full_name: (p.full_name && p.full_name.trim()) 
              ? p.full_name.trim() 
              : (p.username && !/^\+?\d+$/.test(p.username.trim()) ? p.username.trim() : 'Chatr Member'),
            avatar_url: p.avatar_url || undefined,
            phone: p.phone_number || p.phone_search || undefined,
            phone_number: p.phone_number || undefined,
            phone_search: p.phone_search || undefined,
            isSelf: p.id === currentUserId
          }));

          setMatchingUsers(remoteUsers);

          const existingIds = new Set(directoryRef.current.map(c => c.id));
          const updatedContacts = [...directoryRef.current];
          remoteUsers.forEach(u => {
            if (!existingIds.has(u.id)) {
              existingIds.add(u.id);
              updatedContacts.push(u);
            }
          });
          directoryRef.current = updatedContacts;
          try {
            localStorage.setItem('chatr_dialer_directory', JSON.stringify(updatedContacts));
          } catch {}
        } else if (!localFound) {
          setMatchingUsers([]);
        }
      } catch (error) {
        console.error('Directory search failed:', error);
      } finally {
        setSearching(false);
      }
    }, 100);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [dialedNumber, searchQuery, activeTab, currentUserId]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentId = user?.id || null;
      if (currentId) setCurrentUserId(currentId);

      const addedIds = new Set<string>();
      const loadedContacts: Contact[] = [];

      // Query profiles with correct column names
      const { data: platformProfiles } = await supabase
        .from('profiles')
        .select('id, username, full_name, avatar_url, phone_number, phone_search')
        .limit(200);

      if (platformProfiles) {
        const sortedPlatforms = [...platformProfiles].sort((a: any, b: any) => {
          const scoreA = (a.avatar_url ? 50 : 0) + 
                         (a.full_name && !/^\+?\d+$/.test(a.full_name.trim()) ? 30 : 0) + 
                         (a.username && !/^\+?\d+$/.test(a.username.trim()) ? 20 : 0);
          const scoreB = (b.avatar_url ? 50 : 0) + 
                         (b.full_name && !/^\+?\d+$/.test(b.full_name.trim()) ? 30 : 0) + 
                         (b.username && !/^\+?\d+$/.test(b.username.trim()) ? 20 : 0);
          return scoreB - scoreA;
        });

        const seenPhones = new Set<string>();

        sortedPlatforms.forEach(p => {
          const rawPhone = (p.phone_number || p.phone_search || '').replace(/\D/g, '').slice(-10);
          if (rawPhone && seenPhones.has(rawPhone)) {
            // Already have a higher-quality profile with name/avatar for this phone number
            return;
          }
          if (rawPhone) seenPhones.add(rawPhone);

          if (!addedIds.has(p.id)) {
            const isSelf = currentId ? p.id === currentId : false;
            const cleanName = (p.full_name && p.full_name.trim()) 
              ? p.full_name.trim() 
              : (p.username && !/^\+?\d+$/.test(p.username.trim()) ? p.username.trim() : 'Chatr User');
            loadedContacts.push({
              id: p.id,
              username: p.username || 'Chatr User',
              full_name: cleanName,
              avatar_url: p.avatar_url || undefined,
              phone: p.phone_number || p.phone_search || undefined,
              phone_number: p.phone_number || undefined,
              phone_search: p.phone_search || undefined,
              isSelf
            });
            addedIds.add(p.id);
          }
        });
      }

      loadedContacts.sort((a, b) => (a.full_name || a.username).localeCompare(b.full_name || b.username));
      setContacts(loadedContacts);
      directoryRef.current = loadedContacts;
      try {
        localStorage.setItem('chatr_dialer_directory', JSON.stringify(loadedContacts));
      } catch {}

      // Load favorites
      const savedFavorites = JSON.parse(localStorage.getItem('chatr_favorites') || '[]');
      if (savedFavorites.length > 0 && loadedContacts.length > 0) {
        setFavorites(loadedContacts.filter(c => savedFavorites.includes(c.id)));
      }

      // Load recent calls
      if (user?.id) {
        const { data: callsData } = await supabase
          .from('calls')
          .select('*')
          .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(50);

        if (callsData) {
          setRecentCalls(callsData as CallLog[]);
        }
      }

      // Load speed dials
      const savedSpeedDials = localStorage.getItem('chatr_speed_dials');
      if (savedSpeedDials) {
        setSpeedDials(JSON.parse(savedSpeedDials));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const playDTMFTone = useCallback((digit: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      const context = audioContextRef.current;
      const [low, high] = DTMF_FREQUENCIES[digit] || [440, 880];
      
      const osc1 = context.createOscillator();
      const osc2 = context.createOscillator();
      const gain1 = context.createGain();
      const gain2 = context.createGain();
      
      osc1.frequency.value = low;
      osc2.frequency.value = high;
      gain1.gain.value = 0.10;
      gain2.gain.value = 0.10;
      
      osc1.connect(gain1);
      osc2.connect(gain2);
      gain1.connect(context.destination);
      gain2.connect(context.destination);
      
      const now = context.currentTime;
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.10);
      osc2.stop(now + 0.10);
    } catch {}
  }, []);

  const handleDigitPress = (digit: string) => {
    haptics.light();
    playDTMFTone(digit);
    setDialedNumber(prev => prev + digit);
  };

  const handleDigitDown = (digit: string) => {
    if (digit === '0') {
      longPressTimerRef.current = setTimeout(() => {
        haptics.medium();
        setDialedNumber(prev => prev.slice(0, -1) + '+');
      }, 450);
    } else if (['2', '3', '4', '5', '6', '7', '8', '9'].includes(digit)) {
      longPressTimerRef.current = setTimeout(() => {
        const contact = speedDials[digit];
        if (contact) {
          haptics.heavy();
          initiateCall(contact, 'voice');
        } else {
          setShowSpeedDial(true);
        }
      }, 650);
    }
  };

  const handleDigitUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDelete = () => {
    haptics.light();
    setDialedNumber(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setDialedNumber('');
    setMatchingUsers([]);
    setLiveShieldScore(null);
  };

  const initiateCall = (contact: Contact, type: 'voice' | 'video') => {
    haptics.medium();
    shieldMetricsService.recordCallScreened();
    onCall(contact.id, contact.full_name || contact.username, type);
  };

  const handleCall = (type: 'voice' | 'video') => {
    shieldMetricsService.recordCallScreened();
    if (liveShieldScore?.is_on_chatr && liveShieldScore.user_id) {
      onCall(liveShieldScore.user_id, liveShieldScore.display_name || 'Chatr User', type);
    } else if (matchingUsers.length > 0) {
      initiateCall(matchingUsers[0], type);
    } else if (dialedNumber.length === 0) {
      toast.error('Enter a number or username to call');
    } else {
      const cleanedNumber = dialedNumber.replace(/[\s\-()]/g, '');
      if (/^\+?\d{6,15}$/.test(cleanedNumber)) {
        handleNonChatrCall(dialedNumber);
      } else {
        toast.error('No user found with this number');
      }
    }
  };

  const handleNonChatrCall = (phone: string, name?: string) => {
    setNonChatrTarget({ phone, name });
    setShowNonChatrDialog(true);
  };

  const callCellular = (phone: string) => {
    window.location.href = `tel:${phone.replace(/\s/g, '')}`;
    setShowNonChatrDialog(false);
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/[\s\-()]/g, '').replace(/^\+/, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
    setShowNonChatrDialog(false);
  };

  const inviteToChatr = (phone: string) => {
    const message = encodeURIComponent("I'm calling you on Chatr — secure AI calls with CHATR Shield spam protection. Get it: https://chatr.chat");
    window.open(`sms:${phone}?body=${message}`, '_blank');
    setShowNonChatrDialog(false);
    toast.success('Invite link prepared!');
  };

  const toggleFavorite = (contact: Contact) => {
    const storedFavorites = JSON.parse(localStorage.getItem('chatr_favorites') || '[]');
    const isFav = storedFavorites.includes(contact.id);
    const newFavorites = isFav 
      ? storedFavorites.filter((id: string) => id !== contact.id)
      : [...storedFavorites, contact.id];
    localStorage.setItem('chatr_favorites', JSON.stringify(newFavorites));
    
    if (isFav) {
      setFavorites(prev => prev.filter(f => f.id !== contact.id));
    } else {
      setFavorites(prev => [...prev, contact]);
    }
    toast.success(isFav ? 'Removed from favorites' : 'Added to favorites');
  };

  const filteredContacts = searchQuery 
    ? contacts.filter(c => (c.full_name || c.username).toLowerCase().includes(searchQuery.toLowerCase()) || (c.phone || '').includes(searchQuery))
    : contacts;

  return (
    <div className="relative flex flex-col h-full w-full bg-[#030818] text-white overflow-hidden select-none font-sans">
      {/* Background Neon Glowing Ribbons on Left Side */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <svg 
          className="absolute -left-20 top-0 h-full w-[420px] opacity-35 md:opacity-55" 
          viewBox="0 0 500 900" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <g filter="url(#glowFilter)">
            <path 
              d="M-50 850 C 150 700, 320 500, 180 320 C 60 160, 240 60, 350 -50" 
              stroke="url(#blueWaveGradient)" 
              strokeWidth="5" 
              strokeLinecap="round" 
            />
            <path 
              d="M-80 920 C 120 740, 280 530, 140 360 C 20 200, 180 80, 290 -20" 
              stroke="url(#cyanWaveGradient)" 
              strokeWidth="2.5" 
              strokeOpacity="0.8"
            />
          </g>
          <defs>
            <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="16" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="blueWaveGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.1" />
              <stop offset="40%" stopColor="#2563eb" stopOpacity="0.8" />
              <stop offset="80%" stopColor="#06b6d4" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
            </linearGradient>
            <linearGradient id="cyanWaveGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0369a1" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>

        <div className="absolute top-1/4 left-1/3 w-[450px] h-[450px] rounded-full bg-blue-600/10 blur-[130px]" />
        <div className="absolute bottom-10 right-10 w-[350px] h-[350px] rounded-full bg-cyan-600/10 blur-[130px]" />
      </div>

      {/* Top Application Header */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3 border-b border-blue-500/15 bg-[#040c22]/85 backdrop-blur-md flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base font-extrabold tracking-wider text-white">CHATR</span>
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/30 text-cyan-400">
              <ShieldCheck className="w-3 h-3" />
            </div>
            <span className="hidden md:inline text-xs text-blue-200/60 font-medium">
              Universal messaging, voice & spam protection
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] sm:text-xs font-medium">Network good</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-0.5 sm:py-1 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-400">
            <Lock className="w-3 h-3" />
            <span className="text-[11px] sm:text-xs font-medium">Secure</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-full text-slate-300 hover:text-white hover:bg-white/10">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-[#0a142c] border border-blue-500/30 text-white shadow-xl">
              <DropdownMenuItem 
                onClick={() => setShowShieldDialog(true)}
                className="hover:bg-cyan-500/15 text-cyan-300 focus:bg-cyan-500/15 cursor-pointer text-xs"
              >
                <ShieldCheck className="h-4 w-4 mr-2 text-cyan-400" />
                CHATR Shield Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setShowSpeedDial(true)}
                className="hover:bg-blue-500/15 focus:bg-blue-500/15 cursor-pointer text-xs"
              >
                <Zap className="h-4 w-4 mr-2 text-amber-400" />
                Speed dial settings
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate('/call-history')}
                className="hover:bg-blue-500/15 focus:bg-blue-500/15 cursor-pointer text-xs"
              >
                <Clock className="h-4 w-4 mr-2 text-blue-400" />
                Full call ledger
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-blue-500/20" />
              <DropdownMenuItem 
                onClick={handleClear}
                className="hover:bg-red-500/15 text-red-400 focus:bg-red-500/15 cursor-pointer text-xs"
              >
                <Delete className="h-4 w-4 mr-2" />
                Clear dialed input
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Tabs List */}
      <Tabs 
        value={activeTab} 
        onValueChange={(v) => setActiveTab(v as any)} 
        className="relative z-10 flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        <div className="px-4 sm:px-6 pt-2 pb-1 border-b border-blue-500/10 flex-shrink-0">
          <TabsList className="bg-transparent p-0 h-auto gap-2 flex items-center justify-start">
            <TabsTrigger 
              value="keypad" 
              onClick={() => haptics.light()}
              className={cn(
                "gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold transition-all border",
                activeTab === 'keypad'
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                  : "bg-[#0b1736]/60 text-slate-400 border-blue-500/20 hover:text-white"
              )}
            >
              <Hash className="h-3 w-3" />
              <span>Keypad</span>
            </TabsTrigger>

            <TabsTrigger 
              value="recents" 
              onClick={() => haptics.light()}
              className={cn(
                "gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold transition-all border",
                activeTab === 'recents'
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                  : "bg-[#0b1736]/60 text-slate-400 border-blue-500/20 hover:text-white"
              )}
            >
              <Clock className="h-3 w-3" />
              <span>Recents</span>
              {recentCalls.length > 0 && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-blue-500/30 text-blue-200">
                  {recentCalls.length}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger 
              value="contacts" 
              onClick={() => haptics.light()}
              className={cn(
                "gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold transition-all border",
                activeTab === 'contacts'
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                  : "bg-[#0b1736]/60 text-slate-400 border-blue-500/20 hover:text-white"
              )}
            >
              <Users className="h-3 w-3" />
              <span>Contacts</span>
            </TabsTrigger>

            <TabsTrigger 
              value="favorites" 
              onClick={() => haptics.light()}
              className={cn(
                "gap-1.5 px-3.5 py-1 rounded-full text-xs font-semibold transition-all border",
                activeTab === 'favorites'
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.4)]"
                  : "bg-[#0b1736]/60 text-slate-400 border-blue-500/20 hover:text-white"
              )}
            >
              <Star className="h-3 w-3" />
              <span>Favorites</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: Keypad & CHATR Shield Split View */}
        <TabsContent value="keypad" className="flex-1 mt-0 p-2.5 sm:p-4 pb-8 overflow-y-auto min-h-0">
          <div className="max-w-5xl mx-auto min-h-full grid grid-cols-1 lg:grid-cols-12 gap-3.5 sm:gap-4 lg:gap-6 items-start lg:items-stretch">
            
            {/* LEFT CARD: Dark Dialpad Console */}
            <div className="lg:col-span-7 flex flex-col justify-between p-3.5 sm:p-4 md:p-5 rounded-2xl bg-[#071129]/80 backdrop-blur-2xl border border-blue-500/25 shadow-2xl relative">
              <div>
                {/* Search / Input Bar */}
                <div className="relative flex items-center bg-[#0c1c42]/90 border border-blue-400/30 focus-within:border-cyan-400 focus-within:shadow-[0_0_15px_rgba(6,182,212,0.3)] rounded-full px-3.5 py-1.5 sm:py-2 transition-all">
                  <Search className="w-4 h-4 text-cyan-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={dialedNumber}
                    onChange={(e) => setDialedNumber(e.target.value)}
                    placeholder="Enter number, username, or search contacts"
                    className="w-full bg-transparent border-0 outline-none text-white placeholder:text-blue-200/40 text-xs sm:text-sm font-medium tracking-wide"
                  />
                  {dialedNumber && (
                    <button 
                      onClick={handleClear}
                      className="p-1 rounded-full text-slate-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Subtitle / CHATR Shield Live Intelligence Banner */}
                <div className="mt-1.5 text-center min-h-[26px] flex items-center justify-center">
                  {liveShieldScore && dialedNumber.replace(/\D/g, '').length >= 4 ? (
                    <div 
                      onClick={() => setShowShieldDialog(true)}
                      className={cn(
                        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs cursor-pointer transition-all border shadow-md",
                        liveShieldScore.is_on_chatr
                          ? "bg-emerald-950/70 border-emerald-400/60 text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.35)] hover:border-emerald-300"
                          : "bg-cyan-950/50 border-cyan-400/30 text-blue-200 hover:border-cyan-400/60"
                      )}
                    >
                      {liveShieldScore.is_on_chatr && liveShieldScore.avatar_url ? (
                        <Avatar className="h-5 w-5 ring-1 ring-emerald-400 shrink-0">
                          <AvatarImage src={liveShieldScore.avatar_url} />
                          <AvatarFallback className="bg-emerald-800 text-[10px] text-white font-bold">
                            {liveShieldScore.display_name?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <span className="text-sm">{liveShieldScore.flag}</span>
                      )}
                      <span className="font-bold text-white tracking-wide">{liveShieldScore.display_name}</span>
                      <span className="text-blue-300/80 text-[11px]">• {liveShieldScore.carrier}</span>
                      <Badge className={cn(
                        "text-[9px] px-2 py-0.5 font-bold border tracking-wider",
                        liveShieldScore.is_on_chatr
                          ? "bg-emerald-500/25 text-emerald-300 border-emerald-400/60 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                          : liveShieldScore.trust_score >= 80 
                            ? "bg-blue-500/20 text-blue-300 border-blue-400/30" 
                            : "bg-red-500/20 text-red-300 border-red-400/30"
                      )}>
                        {liveShieldScore.is_on_chatr ? '✓ ON CHATR' : liveShieldScore.label}
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-[11px] text-blue-200/50 font-medium">
                      Dial a number or search someone on Chatr
                    </p>
                  )}
                </div>

                {/* Matching Contacts Dropdown */}
                {matchingUsers.length > 0 && dialedNumber.length >= 2 && (
                  <div className="mt-1.5 p-1.5 rounded-xl bg-[#091535]/95 border border-cyan-500/30 max-h-28 overflow-y-auto space-y-1">
                    {matchingUsers.map(user => (
                      <div 
                        key={user.id}
                        onClick={() => initiateCall(user, 'voice')}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-blue-600/20 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 ring-1 ring-cyan-400/40">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback className="bg-blue-900 text-[10px] font-bold text-cyan-300">
                              {(user.full_name || user.username)[0]?.toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-xs font-semibold text-white">{user.full_name || user.username}</p>
                            {user.phone && <p className="text-[9px] text-blue-300/60">{user.phone}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                            onClick={(e) => { e.stopPropagation(); initiateCall(user, 'voice'); }}
                          >
                            <Phone className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-6 w-6 rounded-full bg-blue-500/15 text-blue-400 hover:bg-blue-500/25"
                            onClick={(e) => { e.stopPropagation(); initiateCall(user, 'video'); }}
                          >
                            <Video className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Dialpad 3x4 Grid */}
              <div className="my-2 sm:my-3">
                <div className="grid grid-cols-3 gap-y-1.5 sm:gap-y-2 gap-x-3 sm:gap-x-5 max-w-[240px] sm:max-w-[250px] mx-auto">
                  {keypadDigits.map(({ digit, letters, icon }) => (
                    <motion.button
                      key={digit}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => handleDigitPress(digit)}
                      onMouseDown={() => handleDigitDown(digit)}
                      onMouseUp={handleDigitUp}
                      onMouseLeave={handleDigitUp}
                      onTouchStart={() => handleDigitDown(digit)}
                      onTouchEnd={handleDigitUp}
                      className={cn(
                        "w-[48px] h-[48px] sm:w-[54px] sm:h-[54px] rounded-full mx-auto",
                        "bg-[#0e1d40]/85 hover:bg-[#162d62] active:bg-[#1f3d82]",
                        "border border-blue-400/20 hover:border-cyan-400/50",
                        "text-white shadow-md shadow-black/40",
                        "flex flex-col items-center justify-center cursor-pointer select-none",
                        "transition-all duration-150 relative",
                        speedDials[digit] && "ring-1 ring-cyan-400/60"
                      )}
                    >
                      <span className="text-lg sm:text-xl font-light text-white leading-none">
                        {digit}
                      </span>
                      {icon ? (
                        <span className="text-blue-300/60 mt-0.5">{icon}</span>
                      ) : letters && (
                        <span className="text-[7.5px] sm:text-[8.5px] text-blue-300/70 tracking-[0.15em] font-semibold mt-0.5">
                          {letters}
                        </span>
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Call Action Buttons */}
              <div className="flex items-center justify-center gap-6 sm:gap-8 pt-1 relative">
                {/* Audio Call Button */}
                <div className="flex flex-col items-center gap-1">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handleCall('voice')}
                    className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#10b981] hover:bg-[#059669] text-white flex items-center justify-center shadow-lg shadow-emerald-500/40 active:scale-95 transition-all p-3"
                  >
                    <Phone className="w-5 h-5 text-white fill-white" />
                  </motion.button>
                  <span className="text-[10px] sm:text-[11px] text-slate-300 font-medium">Audio Call</span>
                </div>

                {/* Video Call Button */}
                <div className="flex flex-col items-center gap-1">
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => handleCall('video')}
                    className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center justify-center shadow-lg shadow-blue-600/40 active:scale-95 transition-all p-3"
                  >
                    <Video className="w-5 h-5 text-white" />
                  </motion.button>
                  <span className="text-[10px] sm:text-[11px] text-slate-300 font-medium">Video Call</span>
                </div>

                {/* Backspace Delete Button if number is typed */}
                {dialedNumber && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileTap={{ scale: 0.85 }}
                    onClick={handleDelete}
                    onDoubleClick={handleClear}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 text-slate-300 flex items-center justify-center transition-all absolute right-4 bottom-2"
                    title="Delete digit (Double click to clear)"
                  >
                    <Delete className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            </div>

            {/* RIGHT CARD: CHATR Shield Card */}
            <div className="lg:col-span-5 flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-[#071129]/80 backdrop-blur-2xl border border-cyan-500/30 shadow-2xl relative">
              
              {/* Shield Header (TM removed) */}
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-1.5">
                  <ShieldCheck className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
                  <span className="absolute -inset-1 rounded-full bg-cyan-400/20 blur-md -z-10 animate-pulse" />
                </div>
                <h3 className="text-base sm:text-lg font-black tracking-wide text-white flex items-center gap-1.5">
                  CHATR <span className="text-cyan-400">Shield</span>
                </h3>
                <p className="text-xs font-semibold text-blue-200 mt-0.5">
                  AI Spam & Fraud Protection
                </p>
                <p className="text-[10px] sm:text-[11px] text-blue-300/60">
                  Real-time Caller ID & Scam Defense
                </p>
              </div>

              {/* QR Code Container - Cross-Device Mobile Shield Sync */}
              <div className="my-2 sm:my-2.5 p-3 sm:p-3.5 rounded-xl bg-black/60 border-2 border-cyan-400/60 shadow-[0_0_20px_rgba(6,182,212,0.25)] flex flex-col items-center text-center">
                
                {/* QR Scheme Switcher for direct app launch vs universal web redirect */}
                <div className="flex items-center gap-1 mb-2 bg-[#050d20] p-0.5 rounded-lg border border-blue-500/30">
                  <button
                    type="button"
                    onClick={() => setQrMode('app')}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[9.5px] font-bold transition-all",
                      qrMode === 'app'
                        ? "bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                        : "text-blue-300/70 hover:text-white"
                    )}
                    title="Directly triggers the mobile app protocol (chatr://)"
                  >
                    Direct App (chatr://)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrMode('universal')}
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[9.5px] font-bold transition-all",
                      qrMode === 'universal'
                        ? "bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                        : "text-blue-300/70 hover:text-white"
                    )}
                    title="Universal HTTPS link with auto-launch intent"
                  >
                    Universal (https://)
                  </button>
                </div>

                <div className="p-1.5 sm:p-2 bg-white rounded-lg shadow-inner mb-1.5 relative group">
                  <QRCodeSVG 
                    value={qrMode === 'app' 
                      ? `chatr://shield-sync?token=${syncToken}` 
                      : `https://chatr.chat/shield-sync?token=${syncToken}&source=keypad`
                    } 
                    size={88}
                    fgColor="#030818"
                    bgColor="#ffffff"
                    level="H"
                  />
                  {mobileSynced && (
                    <div className="absolute inset-0 bg-emerald-950/90 rounded-lg flex flex-col items-center justify-center p-1 backdrop-blur-sm border border-emerald-400">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-bounce" />
                      <span className="text-[9px] font-black text-white mt-1">SYNCED</span>
                    </div>
                  )}
                </div>

                <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide mt-1">
                  Cross-Device Mobile Shield Sync
                </h4>
                <p className="text-[10px] sm:text-[11px] text-blue-200/80 mt-1 max-w-[280px] leading-relaxed">
                  Scan with the Chatr Mobile app (Android / iOS) to synchronize real-time spam intelligence across all devices.
                </p>

                <div className="flex items-center justify-center gap-2 mt-2">
                  <Badge variant="outline" className="text-[9px] sm:text-[10px] border-cyan-400/40 text-cyan-300 bg-cyan-950/40 px-2 py-0.5 font-semibold">
                    Auto-Sync On
                  </Badge>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-[10px] sm:text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {mobileSynced ? 'Device Linked' : 'Active Mesh'}
                  </div>
                </div>

              </div>

              {/* Shield CTA Action Button */}
              <div className="w-full space-y-2">
                <Button 
                  onClick={() => setShowShieldDialog(true)}
                  className="w-full h-9 sm:h-10 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 bg-[length:200%_auto] hover:bg-right text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-950 fill-slate-950" />
                  Open Shield Dashboard
                </Button>

                <div className="flex items-center justify-center gap-2 px-3 py-1 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[10px] sm:text-[11px] font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>
                    {shieldMetrics.threatsBlocked > 0 
                      ? `Real-time Protection Active • ${shieldMetrics.threatsBlocked} threats blocked` 
                      : 'Real-time Protection Active • 0 threats'}
                  </span>
                </div>
              </div>

            </div>

          </div>
        </TabsContent>

        {/* TAB 2: Recents Tab */}
        <TabsContent value="recents" className="flex-1 mt-0 p-4 sm:p-6 overflow-y-auto min-h-0">
          <div className="max-w-4xl mx-auto rounded-2xl bg-[#071129]/80 backdrop-blur-2xl border border-blue-500/25 p-5 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Recent Call Activity & Threat Screening
            </h2>

            {loading ? (
              <div className="py-10 text-center text-blue-300/60 text-xs">Loading call activity...</div>
            ) : recentCalls.length === 0 ? (
              <div className="py-12 text-center">
                <Clock className="w-10 h-10 mx-auto text-blue-400/40 mb-2" />
                <p className="text-white font-semibold text-sm">No recent calls</p>
                <p className="text-xs text-blue-200/50 mt-0.5">Your call history will appear here</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {recentCalls.map((call) => {
                  const isOutgoing = call.caller_id === currentUserId;
                  const contactName = isOutgoing ? call.receiver_name : call.caller_name;
                  const contactAvatar = isOutgoing ? call.receiver_avatar : call.caller_avatar;
                  const contactId = isOutgoing ? call.receiver_id : call.caller_id;

                  return (
                    <div 
                      key={call.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#0b1736]/70 border border-blue-500/15 hover:border-cyan-400/40 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-9 w-9 ring-1 ring-cyan-400/30">
                          <AvatarImage src={contactAvatar || undefined} />
                          <AvatarFallback className="bg-blue-900 text-xs font-bold text-cyan-300">
                            {contactName?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-semibold text-white">{contactName || 'Unknown Contact'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <CallOutcomeBadge
                              status={call.missed ? 'missed' : call.status}
                              callType={call.call_type}
                              duration={call.duration}
                              isOutgoing={isOutgoing}
                              connectionQuality={call.connection_quality}
                            />
                            <span className="text-[9px] text-blue-300/50">
                              {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                          onClick={() => onCall(contactId, contactName, 'voice')}
                          title="Call back"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 rounded-full bg-blue-500/15 text-blue-400 hover:bg-blue-500/25"
                          onClick={() => onCall(contactId, contactName, 'video')}
                          title="Video call"
                        >
                          <Video className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* TAB 3: Contacts Tab */}
        <TabsContent value="contacts" className="flex-1 mt-0 p-4 sm:p-6 overflow-y-auto min-h-0">
          <div className="max-w-4xl mx-auto rounded-2xl bg-[#071129]/80 backdrop-blur-2xl border border-blue-500/25 p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                Verified Chatr Contacts
              </h2>
              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter contacts..."
                  className="pl-8 h-8 w-full bg-[#0b1736] border border-blue-500/30 text-white rounded-full text-xs px-3 outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              {filteredContacts.map(contact => (
                <div 
                  key={contact.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[#0b1736]/60 border border-blue-500/15 hover:border-cyan-400/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-9 w-9 ring-1 ring-cyan-400/30">
                      <AvatarImage src={contact.avatar_url} />
                      <AvatarFallback className="bg-blue-900 text-xs font-bold text-cyan-300">
                        {(contact.full_name || contact.username)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs font-semibold text-white">{contact.full_name || contact.username}</p>
                      {contact.phone && <p className="text-[10px] text-blue-300/60">{contact.phone}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleFavorite(contact)}
                      className="h-7 w-7 rounded-full text-slate-400 hover:text-amber-400"
                    >
                      <Star className={cn(
                        "h-3.5 w-3.5",
                        favorites.some(f => f.id === contact.id) && "fill-amber-400 text-amber-400"
                      )} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 rounded-full bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                      onClick={() => onCall(contact.id, contact.full_name || contact.username, 'voice')}
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 rounded-full bg-blue-500/15 text-blue-400 hover:bg-blue-500/25"
                      onClick={() => onCall(contact.id, contact.full_name || contact.username, 'video')}
                    >
                      <Video className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: Favorites Tab */}
        <TabsContent value="favorites" className="flex-1 mt-0 p-4 sm:p-6 overflow-y-auto min-h-0">
          <div className="max-w-4xl mx-auto rounded-2xl bg-[#071129]/80 backdrop-blur-2xl border border-blue-500/25 p-5 shadow-2xl">
            <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              Favorite Speed Contacts
            </h2>

            {favorites.length === 0 ? (
              <div className="py-12 text-center">
                <Star className="w-10 h-10 mx-auto text-amber-400/40 mb-2" />
                <p className="text-white font-semibold text-sm">No favorite contacts yet</p>
                <p className="text-xs text-blue-200/50 mt-0.5">Star frequently called contacts in the Contacts tab</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {favorites.map(contact => (
                  <div 
                    key={contact.id}
                    className="p-3.5 rounded-xl bg-[#0b1736]/70 border border-blue-500/20 hover:border-amber-400/40 flex flex-col items-center text-center transition-all group"
                  >
                    <Avatar className="h-12 w-12 ring-2 ring-amber-400/40 mb-1.5">
                      <AvatarImage src={contact.avatar_url} />
                      <AvatarFallback className="bg-blue-950 text-amber-300 font-bold text-xs">
                        {(contact.full_name || contact.username)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <p className="text-xs font-bold text-white truncate max-w-full">{contact.full_name || contact.username}</p>
                    <p className="text-[9px] text-blue-300/60 truncate mt-0.5">{contact.phone || 'Chatr Member'}</p>

                    <div className="flex items-center gap-1.5 mt-2.5">
                      <Button
                        size="icon"
                        className="h-7 w-7 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white"
                        onClick={() => onCall(contact.id, contact.full_name || contact.username, 'voice')}
                      >
                        <Phone className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        className="h-7 w-7 rounded-full bg-blue-600 hover:bg-blue-500 text-white"
                        onClick={() => onCall(contact.id, contact.full_name || contact.username, 'video')}
                      >
                        <Video className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

      </Tabs>

      {/* CHATR Shield Dashboard Modal */}
      <ShieldDashboardDialog 
        open={showShieldDialog}
        onOpenChange={setShowShieldDialog}
        onCallNumber={(num) => {
          setDialedNumber(num);
          setShowShieldDialog(false);
          handleCall('voice');
        }}
      />

      {/* Speed Dial Settings Dialog */}
      <Dialog open={showSpeedDial} onOpenChange={setShowSpeedDial}>
        <DialogContent className="max-w-md bg-[#070e24] border border-blue-500/30 text-white shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white text-sm font-bold">
              <Zap className="h-4 w-4 text-amber-400" />
              Speed Dial Keypad Shortcuts
            </DialogTitle>
            <DialogDescription className="text-xs text-blue-200/60">
              Long-press numbers 2–9 on the keypad to speed-dial assigned contacts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2 max-h-72 overflow-y-auto">
            {['2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
              <div key={digit} className="flex items-center justify-between p-2 rounded-xl bg-[#0c183a] border border-blue-500/20">
                <div className="w-7 h-7 rounded-full bg-blue-600/30 border border-blue-400/40 flex items-center justify-center font-bold text-white text-xs">
                  {digit}
                </div>
                <div className="flex-1 mx-2.5 min-w-0">
                  {speedDials[digit] ? (
                    <p className="text-xs font-semibold text-white truncate">{speedDials[digit].full_name || speedDials[digit].username}</p>
                  ) : (
                    <p className="text-[11px] text-slate-400">Unassigned</p>
                  )}
                </div>
                {speedDials[digit] ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      const updated = { ...speedDials };
                      delete updated[digit];
                      setSpeedDials(updated);
                      localStorage.setItem('chatr_speed_dials', JSON.stringify(updated));
                    }}
                    className="h-6 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    Remove
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] border-blue-500/30 text-cyan-300 hover:bg-blue-500/10">
                        Assign
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-h-52 overflow-y-auto bg-[#0a142c] border border-blue-500/30 text-white">
                      {contacts.map(c => (
                        <DropdownMenuItem 
                          key={c.id}
                          onClick={() => {
                            const updated = { ...speedDials, [digit]: c };
                            setSpeedDials(updated);
                            localStorage.setItem('chatr_speed_dials', JSON.stringify(updated));
                            toast.success(`Key ${digit} assigned to ${c.full_name || c.username}`);
                          }}
                          className="hover:bg-blue-600/20 cursor-pointer text-xs"
                        >
                          {c.full_name || c.username}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Non-Chatr Call Dialog */}
      <Dialog open={showNonChatrDialog} onOpenChange={setShowNonChatrDialog}>
        <DialogContent className="max-w-sm bg-[#070e24] border border-cyan-500/30 text-white shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2 text-sm font-bold">
              <Phone className="w-4 h-4 text-cyan-400" />
              External Carrier Call
            </DialogTitle>
            <DialogDescription className="text-xs text-blue-200/60">
              {nonChatrTarget?.phone} is not yet on Chatr P2P encrypted mesh
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2.5 bg-emerald-950/30 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40 text-xs h-9"
              onClick={() => nonChatrTarget && openWhatsApp(nonChatrTarget.phone)}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              WhatsApp Call / Chat
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2.5 bg-blue-950/30 border-blue-500/40 text-blue-400 hover:bg-blue-900/40 text-xs h-9"
              onClick={() => nonChatrTarget && callCellular(nonChatrTarget.phone)}
            >
              <Phone className="h-3.5 w-3.5" />
              Cellular GSM Phone Call
            </Button>
            <Button
              variant="default"
              className="w-full justify-start gap-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs h-9"
              onClick={() => nonChatrTarget && inviteToChatr(nonChatrTarget.phone)}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Invite to Chatr (SMS)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
