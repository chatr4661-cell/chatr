import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Phone, Video, Delete, Search, Star, Clock, Users, 
  Voicemail, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  MoreVertical, Hash, Plus, X, Shield, Wifi, WifiOff, 
  Zap, Signal, Lock, UserPlus, MessageCircle, Settings2,
  CheckCircle2, Send, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
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
import { NetworkConfidencePill, useNetworkQuality, getCallHint, type NetworkQuality } from './NetworkConfidencePill';
import { CallOutcomeBadge, getPreferredCallMode, getReliabilityLabel } from './CallOutcomeBadge';

interface Contact {
  id: string;
  username: string;
  avatar_url?: string;
  phone?: string;
  is_favorite?: boolean;
  is_online?: boolean;
  last_seen?: string;
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

// DTMF frequencies (Hz)
const DTMF_FREQUENCIES: Record<string, [number, number]> = {
  '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
  '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
  '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
  '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
};

export function AdvancedPhoneDialer({ onCall }: AdvancedPhoneDialerProps) {
  const navigate = useNavigate();
  const [dialedNumber, setDialedNumber] = useState('');
  const [allUsers, setAllUsers] = useState<Contact[]>([]);
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
  const [showNonChatrDialog, setShowNonChatrDialog] = useState(false);
  const [nonChatrTarget, setNonChatrTarget] = useState<NonChatrContact | null>(null);
  const [speedDials, setSpeedDials] = useState<Record<string, Contact>>({});
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>('excellent');
  const [inputHint, setInputHint] = useState('Dial a number or search someone on Chatr');
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize
  useEffect(() => {
    loadData();
  }, []);

  // Search for CHATR users when typing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const query = activeTab === 'keypad' ? dialedNumber : searchQuery;
    if (!query || query.length < 2) {
      setMatchingUsers([]);
      return;
    }

    // Check if query looks like a phone number (digits, +, spaces, dashes)
    const isPhoneQuery = /^[\d\s+\-()]+$/.test(query.replace(/\s/g, ''));
    const cleanedPhone = query.replace(/[\s\-()]/g, '');

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        let profiles: any[] = [];
        
        if (isPhoneQuery && cleanedPhone.length >= 3) {
          // Search by phone number (normalized column)
          const { data } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, phone_number, phone_search')
            .or(`phone_search.ilike.%${cleanedPhone}%,phone_number.ilike.%${cleanedPhone}%`)
            .neq('id', currentUserId || '')
            .limit(10);
          profiles = data || [];
        } else {
          // Search by username/name
          const { data } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, phone_number, phone_search')
            .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
            .neq('id', currentUserId || '')
            .limit(10);
          profiles = data || [];
        }

        if (profiles.length > 0) {
          const users = profiles.map(p => ({
            id: p.id,
            username: p.username || 'Unknown',
            avatar_url: p.avatar_url || undefined,
            phone: p.phone_search || p.phone_number || undefined,
          }));
          setMatchingUsers(users);
        } else {
          setMatchingUsers([]);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [dialedNumber, searchQuery, activeTab, currentUserId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Load contacts from multiple sources
      let loadedContacts: Contact[] = [];
      const addedIds = new Set<string>();

      // 1. Load from user_contacts table
      const { data: userContactsData } = await supabase
        .from('user_contacts')
        .select('contact_user_id, display_name')
        .eq('user_id', user.id);

      if (userContactsData && userContactsData.length > 0) {
        const contactIds = userContactsData.map(c => c.contact_user_id).filter(Boolean);
        if (contactIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, phone_number')
            .in('id', contactIds);
          
          (profiles || []).forEach(p => {
            if (!addedIds.has(p.id)) {
              const contact = userContactsData.find(c => c.contact_user_id === p.id);
              loadedContacts.push({
                id: p.id,
                username: contact?.display_name || p.username || 'Unknown',
                avatar_url: p.avatar_url || undefined,
                phone: p.phone_number || undefined,
              });
              addedIds.add(p.id);
            }
          });
        }
      }

      // 2. Load synced device contacts that are registered users
      const { data: deviceContacts } = await supabase
        .from('contacts')
        .select('contact_user_id, contact_name, contact_phone')
        .eq('user_id', user.id)
        .eq('is_registered', true)
        .not('contact_user_id', 'is', null);

      if (deviceContacts && deviceContacts.length > 0) {
        const contactUserIds = deviceContacts.map(c => c.contact_user_id).filter(Boolean) as string[];
        if (contactUserIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, phone_number')
            .in('id', contactUserIds);
          
          (profiles || []).forEach(p => {
            if (!addedIds.has(p.id)) {
              const dc = deviceContacts.find(c => c.contact_user_id === p.id);
              loadedContacts.push({
                id: p.id,
                username: dc?.contact_name || p.username || 'Unknown',
                avatar_url: p.avatar_url || undefined,
                phone: dc?.contact_phone || p.phone_number || undefined,
              });
              addedIds.add(p.id);
            }
          });
        }
      }

      // 3. Load from existing conversations (people you've chatted with)
      const { data: convParticipants } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (convParticipants && convParticipants.length > 0) {
        const convIds = convParticipants.map(p => p.conversation_id);
        const { data: otherParticipants } = await supabase
          .from('conversation_participants')
          .select('user_id, profiles!inner(id, username, avatar_url, phone_number)')
          .in('conversation_id', convIds)
          .neq('user_id', user.id);

        if (otherParticipants) {
          otherParticipants.forEach((p: any) => {
            const profile = p.profiles;
            if (profile && !addedIds.has(profile.id)) {
              loadedContacts.push({
                id: profile.id,
                username: profile.username || 'Unknown',
                avatar_url: profile.avatar_url || undefined,
                phone: profile.phone_number || undefined,
              });
              addedIds.add(profile.id);
            }
          });
        }
      }

      // Sort alphabetically
      loadedContacts.sort((a, b) => a.username.localeCompare(b.username));
      setContacts(loadedContacts);
      setAllUsers(loadedContacts);

      // Load favorites from localStorage with loaded contacts
      const savedFavorites = JSON.parse(localStorage.getItem('chatr_favorites') || '[]');
      if (savedFavorites.length > 0 && loadedContacts.length > 0) {
        setFavorites(loadedContacts.filter(c => savedFavorites.includes(c.id)));
      }

      // Load recent calls with profile data
      const { data: callsData } = await supabase
        .from('calls')
        .select('*')
        .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (callsData) {
        setRecentCalls(callsData as CallLog[]);
      }

      // Load speed dials from local storage
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
      gain1.gain.value = 0.12;
      gain2.gain.value = 0.12;
      
      osc1.connect(gain1);
      osc2.connect(gain2);
      gain1.connect(context.destination);
      gain2.connect(context.destination);
      
      osc1.start();
      osc2.start();
      
      setTimeout(() => {
        osc1.stop();
        osc2.stop();
      }, 80);
    } catch (e) {
      // Audio context not available
    }
  }, []);

  const handleDigitPress = (digit: string) => {
    setDialedNumber(prev => prev + digit);
    playDTMFTone(digit);
  };

  const handleLongPress = (digit: string) => {
    if (digit === '0') {
      setDialedNumber(prev => prev.slice(0, -1) + '+');
      playDTMFTone(digit);
    } else if (digit === '1') {
      toast.info('Calling voicemail...');
    } else if (speedDials[digit]) {
      const contact = speedDials[digit];
      onCall(contact.id, contact.username, 'voice');
    }
  };

  const handleDigitDown = (digit: string) => {
    longPressTimerRef.current = setTimeout(() => handleLongPress(digit), 500);
  };

  const handleDigitUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleDelete = () => {
    setDialedNumber(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setDialedNumber('');
    setMatchingUsers([]);
  };

  const initiateCall = (contact: Contact, type: 'voice' | 'video') => {
    onCall(contact.id, contact.username, type);
  };

  const handleCall = (type: 'voice' | 'video') => {
    if (matchingUsers.length > 0) {
      initiateCall(matchingUsers[0], type);
    } else if (dialedNumber.length === 0) {
      toast.error('Enter a number or username to call');
    } else {
      // Check if it's a valid phone number for PSTN call
      const cleanedNumber = dialedNumber.replace(/[\s\-()]/g, '');
      if (/^\+?\d{10,15}$/.test(cleanedNumber)) {
        toast.info('PSTN calling coming soon - try a CHATR username');
      } else {
        toast.error('No CHATR user found with this number');
      }
    }
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

  const setSpeedDial = (digit: string, contact: Contact) => {
    const newSpeedDials = { ...speedDials, [digit]: contact };
    setSpeedDials(newSpeedDials);
    localStorage.setItem('chatr_speed_dials', JSON.stringify(newSpeedDials));
    toast.success(`Speed dial ${digit} set for ${contact.username}`);
    setShowSpeedDial(false);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallIcon = (call: CallLog) => {
    if (call.status === 'missed' || call.status === 'rejected') {
      return <PhoneMissed className="h-4 w-4 text-destructive" />;
    }
    if (call.caller_id === currentUserId) {
      return <PhoneOutgoing className="h-4 w-4 text-green-500" />;
    }
    return <PhoneIncoming className="h-4 w-4 text-blue-500" />;
  };

  const formatPhoneNumber = (number: string) => {
    if (number.length <= 3) return number;
    if (number.length <= 6) return `${number.slice(0, 3)} ${number.slice(3)}`;
    if (number.length <= 10) return `${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
    return `${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6, 10)} ${number.slice(10)}`;
  };

  // Update input hint based on context
  useEffect(() => {
    if (!dialedNumber) {
      setInputHint('Dial a number or search someone on Chatr');
    } else if (searching) {
      setInputHint('Checking availability...');
    } else if (matchingUsers.length > 0) {
      setInputHint('Available on Chatr · Free internet call');
    } else if (/^[\d\s+\-()]+$/.test(dialedNumber.replace(/\s/g, ''))) {
      setInputHint('Not on Chatr · Call via SMS or WhatsApp');
    } else {
      setInputHint('Search by username or phone number');
    }
  }, [dialedNumber, searching, matchingUsers]);

  // Handle video call with network-aware downgrade
  const handleSmartVideoCall = (contact: Contact) => {
    if (networkQuality === 'poor' || networkQuality === 'offline') {
      toast.info('Starting audio first for reliability', {
        description: 'Video will upgrade when network improves',
        duration: 3000
      });
      onCall(contact.id, contact.username, 'voice');
    } else if (networkQuality === 'good') {
      toast.info('Starting audio first for reliability', { duration: 2000 });
      onCall(contact.id, contact.username, 'voice');
    } else {
      onCall(contact.id, contact.username, 'video');
    }
  };

  // Handle non-Chatr number
  const handleNonChatrCall = (phone: string, name?: string) => {
    setNonChatrTarget({ phone, name });
    setShowNonChatrDialog(true);
  };

  const sendSMS = (phone: string) => {
    window.open(`sms:${phone}`, '_blank');
    setShowNonChatrDialog(false);
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/[\s\-()]/g, '').replace(/^\+/, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
    setShowNonChatrDialog(false);
  };

  const inviteToChatr = (phone: string) => {
    const message = encodeURIComponent("I'm calling you on Chatr — works even on weak networks. Download: https://chatr.chat");
    window.open(`sms:${phone}?body=${message}`, '_blank');
    setShowNonChatrDialog(false);
    toast.success('Invite sent!');
  };

  const openChat = (contactId: string) => {
    navigate(`/chat?userId=${contactId}`);
  };

  const filteredContacts = searchQuery 
    ? contacts.filter(c => c.username.toLowerCase().includes(searchQuery.toLowerCase()))
    : contacts;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/30 overflow-hidden">
      {/* Header with CHATR branding */}
      <div className="flex items-center justify-between p-4 border-b bg-background/80 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Phone className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              CHATR
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Network Confidence Pill - World-class indicator */}
          <NetworkConfidencePill 
            onQualityChange={setNetworkQuality}
            showLabel={true}
          />
          
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
            <Lock className="h-3 w-3 text-green-500" />
            <span className="text-xs text-green-600 hidden sm:inline">Secure</span>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setShowSpeedDial(true)}>
                <Zap className="h-4 w-4 mr-2" />
                Speed dial
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/call-history')}>
                <Clock className="h-4 w-4 mr-2" />
                Full call history
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Settings2 className="h-4 w-4 mr-2" />
                Call settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <TabsList className="mx-4 mt-3 mb-2 grid grid-cols-4 bg-muted/50 p-1 rounded-xl shrink-0">
          <TabsTrigger value="keypad" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Hash className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Keypad</span>
          </TabsTrigger>
          <TabsTrigger value="recents" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Recents</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Contacts</span>
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-1.5 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">Favorites</span>
          </TabsTrigger>
        </TabsList>

        {/* Keypad Tab */}
        <TabsContent value="keypad" className="flex-1 flex flex-col mt-0 min-h-0">
          {/* Dialed input & matching */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-[140px]">
            <AnimatePresence mode="wait">
              <motion.div 
                key={dialedNumber || 'empty'}
                initial={{ opacity: 0.8, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <p 
                  className="text-3xl md:text-4xl font-light tracking-wider text-foreground min-h-[48px] select-all cursor-pointer"
                  onClick={() => {
                    if (dialedNumber) {
                      navigator.clipboard.writeText(dialedNumber);
                      toast.success('Copied!');
                    }
                  }}
                >
                  {formatPhoneNumber(dialedNumber) || (
                    <span className="text-muted-foreground/50 text-lg">Enter number, username, or search contacts</span>
                  )}
                </p>
                {/* Dynamic hint text */}
                <motion.p 
                  key={inputHint}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    "text-xs mt-1.5",
                    matchingUsers.length > 0 ? "text-green-500" : "text-muted-foreground"
                  )}
                >
                  {matchingUsers.length > 0 && <CheckCircle2 className="h-3 w-3 inline mr-1" />}
                  {inputHint}
                </motion.p>
              </motion.div>
            </AnimatePresence>
            
            {/* Matching CHATR users */}
            {dialedNumber.length >= 2 && (
              <div className="mt-3 w-full max-w-sm">
                {searching ? (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-muted-foreground">Checking availability...</span>
                  </div>
                ) : matchingUsers.length > 0 ? (
                  <ScrollArea className="max-h-32">
                    {matchingUsers.slice(0, 4).map(user => (
                      <motion.button
                        key={user.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => initiateCall(user, 'voice')}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-primary/10 transition-all group"
                      >
                        <Avatar className="h-9 w-9 ring-2 ring-green-500/30">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {user.username[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium">{user.username}</p>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-600 border-0">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                            On Chatr
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-8 w-8 rounded-full bg-green-500/10 hover:bg-green-500/20"
                            onClick={(e) => { e.stopPropagation(); initiateCall(user, 'voice'); }}
                          >
                            <Phone className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className={cn(
                              "h-8 w-8 rounded-full bg-blue-500/10 hover:bg-blue-500/20",
                              networkQuality === 'poor' && "opacity-50"
                            )}
                            onClick={(e) => { e.stopPropagation(); handleSmartVideoCall(user); }}
                          >
                            <Video className="h-4 w-4 text-blue-500" />
                          </Button>
                        </div>
                      </motion.button>
                    ))}
                  </ScrollArea>
                ) : dialedNumber.length >= 3 && /^[\d\s+\-()]+$/.test(dialedNumber.replace(/\s/g, '')) ? (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => handleNonChatrCall(dialedNumber)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-all"
                  >
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{formatPhoneNumber(dialedNumber)}</p>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
                        Not on Chatr
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1">
                        <Send className="h-3 w-3" />
                        Invite
                      </Button>
                    </div>
                  </motion.button>
                ) : dialedNumber.length >= 2 ? (
                  <p className="text-center text-sm text-muted-foreground py-2">
                    No Chatr users found
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {/* Keypad */}
          <div className="px-4 md:px-8 pb-2">
            <div className="grid grid-cols-3 gap-3 md:gap-4 max-w-xs mx-auto">
              {keypadDigits.map(({ digit, letters, icon }) => (
                <motion.button
                  key={digit}
                  whileTap={{ scale: 0.92, backgroundColor: 'hsl(var(--primary) / 0.15)' }}
                  onClick={() => handleDigitPress(digit)}
                  onMouseDown={() => handleDigitDown(digit)}
                  onMouseUp={handleDigitUp}
                  onMouseLeave={handleDigitUp}
                  onTouchStart={() => handleDigitDown(digit)}
                  onTouchEnd={handleDigitUp}
                  className={cn(
                    "flex flex-col items-center justify-center w-16 h-16 md:w-[72px] md:h-[72px] rounded-full mx-auto",
                    "bg-muted/60 hover:bg-muted active:bg-primary/10 transition-all duration-150",
                    "shadow-sm hover:shadow-md",
                    speedDials[digit] && "ring-2 ring-primary/40"
                  )}
                >
                  <span className="text-2xl md:text-3xl font-medium">{digit}</span>
                  {icon ? icon : letters && (
                    <span className="text-[9px] md:text-[10px] text-muted-foreground tracking-[0.2em]">{letters}</span>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Call buttons with network-aware hints */}
          <div className="flex flex-col items-center gap-2 pb-6 pt-3">
            <div className="flex items-center justify-center gap-6">
              {/* Delete */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleDelete}
                onDoubleClick={handleClear}
                disabled={!dialedNumber}
                className="w-12 h-12 rounded-full bg-muted/60 disabled:opacity-30 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Delete className="h-5 w-5" />
              </motion.button>

              {/* Voice call */}
              <div className="flex flex-col items-center gap-1">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => handleCall('voice')}
                  className={cn(
                    "w-[68px] h-[68px] rounded-full flex items-center justify-center shadow-lg",
                    "bg-gradient-to-br from-green-500 to-green-600 hover:from-green-400 hover:to-green-500",
                    "transition-all duration-200"
                  )}
                >
                  <Phone className="h-7 w-7 text-white" />
                </motion.button>
                {(networkQuality === 'good' || networkQuality === 'poor') && (
                  <span className="text-[10px] text-green-600 font-medium">Best for weak networks</span>
                )}
              </div>

              {/* Video call */}
              <div className="flex flex-col items-center gap-1">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => {
                    if (matchingUsers.length > 0) {
                      handleSmartVideoCall(matchingUsers[0]);
                    } else {
                      handleCall('video');
                    }
                  }}
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shadow-md transition-all duration-200",
                    networkQuality === 'poor' || networkQuality === 'offline'
                      ? "bg-gradient-to-br from-gray-400 to-gray-500"
                      : "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500"
                  )}
                >
                  <Video className="h-5 w-5 text-white" />
                </motion.button>
                {networkQuality === 'good' && (
                  <span className="text-[10px] text-yellow-600 font-medium">May start as audio</span>
                )}
                {networkQuality === 'poor' && (
                  <span className="text-[10px] text-muted-foreground font-medium">Audio only</span>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Recents Tab */}
        <TabsContent value="recents" className="flex-1 mt-0 data-[state=active]:flex data-[state=active]:flex-col min-h-0">
          <div className="flex-1 overflow-auto px-4 py-2 space-y-1">
            {loading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : recentCalls.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Clock className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">No recent calls</p>
                  <p className="text-xs text-muted-foreground mt-1">Your call history will appear here</p>
                </div>
              ) : (
                recentCalls.map((call) => {
                  const isOutgoing = call.caller_id === currentUserId;
                  const contactName = isOutgoing ? call.receiver_name : call.caller_name;
                  const contactAvatar = isOutgoing ? call.receiver_avatar : call.caller_avatar;
                  const contactId = isOutgoing ? call.receiver_id : call.caller_id;

                  return (
                    <motion.div
                      key={call.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                    >
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={contactAvatar || undefined} />
                        <AvatarFallback className="bg-primary/10">{contactName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium truncate",
                          (call.status === 'missed' || call.status === 'rejected' || call.missed) && "text-destructive"
                        )}>
                          {contactName || 'Unknown'}
                        </p>
                        {/* Enhanced outcome badge with explanation */}
                        <CallOutcomeBadge
                          status={call.missed ? 'missed' : call.status}
                          callType={call.call_type}
                          duration={call.duration}
                          isOutgoing={isOutgoing}
                          connectionQuality={call.connection_quality}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-green-500/10"
                            onClick={() => onCall(contactId, contactName, 'voice')}
                          >
                            <Phone className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-blue-500/10"
                            onClick={() => openChat(contactId)}
                          >
                            <MessageCircle className="h-4 w-4 text-primary" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="flex-1 mt-0 data-[state=active]:flex data-[state=active]:flex-col min-h-0">
          <div className="px-4 py-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="pl-9 rounded-xl bg-muted/50 border-0 focus-visible:ring-1"
              />
            </div>
          </div>
          <div className="flex-1 overflow-auto px-4 pb-4">
            <div className="space-y-1">
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : filteredContacts.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">
                    {searchQuery ? 'No contacts found' : 'No contacts yet'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sync your device contacts to see them here
                  </p>
                  <Button 
                    variant="default" 
                    className="mt-4 rounded-full gap-2"
                    onClick={() => navigate('/chat')}
                  >
                    <UserPlus className="h-4 w-4" />
                    Add Contacts
                  </Button>
                </div>
              ) : (
                filteredContacts.map(contact => (
                  <motion.div
                    key={contact.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-11 w-11">
                        <AvatarImage src={contact.avatar_url} />
                        <AvatarFallback className="bg-primary/10">{contact.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{contact.username}</p>
                        {contact.phone ? (
                          <p className="text-xs text-muted-foreground">{contact.phone}</p>
                        ) : (
                          <p className="text-xs text-green-500 flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            CHATR User
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFavorite(contact)}
                        className="h-8 w-8 rounded-full"
                      >
                        <Star className={cn(
                          "h-4 w-4 transition-colors",
                          favorites.some(f => f.id === contact.id) && "fill-yellow-400 text-yellow-400"
                        )} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-primary/10"
                        onClick={() => openChat(contact.id)}
                      >
                        <MessageCircle className="h-4 w-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-green-500/10"
                        onClick={() => onCall(contact.id, contact.username, 'voice')}
                      >
                        <Phone className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-blue-500/10"
                        onClick={() => onCall(contact.id, contact.username, 'video')}
                      >
                        <Video className="h-4 w-4 text-blue-500" />
                      </Button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </TabsContent>

        {/* Favorites Tab */}
        <TabsContent value="favorites" className="flex-1 mt-0 data-[state=active]:flex data-[state=active]:flex-col min-h-0">
          <div className="flex-1 overflow-auto px-4 py-2 pb-4">
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : favorites.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Star className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">No favorites yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Star contacts to add them here</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {favorites.map(contact => (
                    <motion.div
                      key={contact.id}
                      whileTap={{ scale: 0.95 }}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors relative group"
                    >
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => toggleFavorite(contact)}
                      >
                        <X className="h-3 w-3 text-destructive" />
                      </Button>
                      <Avatar 
                        className="h-14 w-14 ring-2 ring-yellow-400/30 cursor-pointer"
                        onClick={() => onCall(contact.id, contact.username, 'voice')}
                      >
                        <AvatarImage src={contact.avatar_url} />
                        <AvatarFallback className="text-lg bg-primary/10">{contact.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium truncate max-w-full">{contact.username}</p>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full hover:bg-green-500/10"
                          onClick={() => onCall(contact.id, contact.username, 'voice')}
                        >
                          <Phone className="h-4 w-4 text-green-500" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-full hover:bg-primary/10"
                          onClick={() => openChat(contact.id)}
                        >
                          <MessageCircle className="h-4 w-4 text-primary" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
        </TabsContent>
      </Tabs>

      {/* Speed Dial Dialog */}
      <Dialog open={showSpeedDial} onOpenChange={setShowSpeedDial}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Speed Dial
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-4 max-h-80 overflow-auto">
            {['2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
              <div key={digit} className="flex items-center gap-3 p-2 rounded-xl bg-muted/30">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {digit}
                </div>
                {speedDials[digit] ? (
                  <>
                    <div className="flex-1 flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={speedDials[digit].avatar_url} />
                        <AvatarFallback className="text-xs">{speedDials[digit].username[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{speedDials[digit].username}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={() => {
                        const { [digit]: _, ...rest } = speedDials;
                        setSpeedDials(rest);
                        localStorage.setItem('chatr_speed_dials', JSON.stringify(rest));
                        toast.success('Speed dial removed');
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex-1 justify-start text-muted-foreground gap-2">
                        <Plus className="h-4 w-4" />
                        Assign contact
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-h-60 overflow-auto">
                      {contacts.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-2">No contacts</p>
                      ) : (
                        contacts.map(contact => (
                          <DropdownMenuItem key={contact.id} onClick={() => setSpeedDial(digit, contact)}>
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarImage src={contact.avatar_url} />
                              <AvatarFallback className="text-xs">{contact.username[0]}</AvatarFallback>
                            </Avatar>
                            {contact.username}
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Non-Chatr Contact Dialog */}
      <Dialog open={showNonChatrDialog} onOpenChange={setShowNonChatrDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Call options</DialogTitle>
            <DialogDescription>
              {nonChatrTarget?.name || nonChatrTarget?.phone} is not on Chatr yet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => nonChatrTarget && sendSMS(nonChatrTarget.phone)}
            >
              <Send className="h-4 w-4" />
              Send SMS
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 text-green-600 border-green-200 hover:bg-green-50"
              onClick={() => nonChatrTarget && openWhatsApp(nonChatrTarget.phone)}
            >
              <ExternalLink className="h-4 w-4" />
              Open WhatsApp
            </Button>
            <Button
              variant="default"
              className="w-full justify-start gap-3"
              onClick={() => nonChatrTarget && inviteToChatr(nonChatrTarget.phone)}
            >
              <UserPlus className="h-4 w-4" />
              Invite to Chatr (recommended)
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
