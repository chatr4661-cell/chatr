import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Phone, Video, X, Delete, Search, Star, Clock, Users, 
  ChevronDown, Mic, MicOff, Volume2, VolumeX, Settings2,
  Voicemail, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  User, UserPlus, MoreVertical, Hash, Plus
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
import { format, formatDistanceToNow } from 'date-fns';
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
} from "@/components/ui/dialog";

interface Contact {
  id: string;
  username: string;
  avatar_url?: string;
  phone?: string;
  is_favorite?: boolean;
  last_called?: string;
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
  const [dialedNumber, setDialedNumber] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [favorites, setFavorites] = useState<Contact[]>([]);
  const [recentCalls, setRecentCalls] = useState<CallLog[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'keypad' | 'recents' | 'contacts' | 'favorites'>('keypad');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showSpeedDial, setShowSpeedDial] = useState(false);
  const [speedDials, setSpeedDials] = useState<Record<string, Contact>>({});
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize
  useEffect(() => {
    loadData();
  }, []);

  // Filter contacts
  useEffect(() => {
    const query = activeTab === 'keypad' ? dialedNumber : searchQuery;
    if (!query) {
      setFilteredContacts(contacts);
      return;
    }

    const filtered = contacts.filter(c => 
      c.username.toLowerCase().includes(query.toLowerCase()) ||
      c.phone?.includes(query)
    );
    setFilteredContacts(filtered);
  }, [dialedNumber, searchQuery, contacts, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      // Load contacts
      const { data: contactsData } = await supabase
        .from('user_contacts')
        .select('contact_user_id, display_name')
        .eq('user_id', user.id);

      if (contactsData && contactsData.length > 0) {
        const contactIds = contactsData.map(c => c.contact_user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', contactIds);
        
        const merged = (profiles || []).map(p => {
          const contact = contactsData.find(c => c.contact_user_id === p.id);
          return {
            id: p.id,
            username: contact?.display_name || p.username,
            avatar_url: p.avatar_url,
          };
        });
        
        setContacts(merged);
        setFilteredContacts(merged);
        setFavorites([]);
      }

      // Load recent calls
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
      
      // Create two oscillators for dual-tone
      const osc1 = context.createOscillator();
      const osc2 = context.createOscillator();
      const gain1 = context.createGain();
      const gain2 = context.createGain();
      
      osc1.frequency.value = low;
      osc2.frequency.value = high;
      gain1.gain.value = 0.15;
      gain2.gain.value = 0.15;
      
      osc1.connect(gain1);
      osc2.connect(gain2);
      gain1.connect(context.destination);
      gain2.connect(context.destination);
      
      osc1.start();
      osc2.start();
      
      setTimeout(() => {
        osc1.stop();
        osc2.stop();
      }, 100);
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
      // Voicemail
      toast.info('Calling voicemail...');
    } else if (speedDials[digit]) {
      // Speed dial
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
  };

  const handleCall = (type: 'voice' | 'video') => {
    if (filteredContacts.length > 0 && dialedNumber.length >= 2) {
      const contact = filteredContacts[0];
      onCall(contact.id, contact.username, type);
    } else if (dialedNumber.length === 0) {
      toast.error('Enter a number or search for a contact');
    } else {
      toast.error('No matching contact found');
    }
  };

  const toggleFavorite = async (contact: Contact) => {
    // Toggle local favorite state (stored in localStorage for now)
    const storedFavorites = JSON.parse(localStorage.getItem('chatr_favorites') || '[]');
    const isFav = storedFavorites.includes(contact.id);
    const newFavorites = isFav 
      ? storedFavorites.filter((id: string) => id !== contact.id)
      : [...storedFavorites, contact.id];
    localStorage.setItem('chatr_favorites', JSON.stringify(newFavorites));
    
    setFavorites(contacts.filter(c => newFavorites.includes(c.id)));
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

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-xl font-bold">Phone</h1>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowSpeedDial(true)}>
                <Hash className="h-4 w-4 mr-2" />
                Speed dial settings
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
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex flex-col flex-1">
        <TabsList className="mx-4 mt-2 grid grid-cols-4">
          <TabsTrigger value="keypad" className="gap-1">
            <Hash className="h-4 w-4" />
            <span className="hidden sm:inline">Keypad</span>
          </TabsTrigger>
          <TabsTrigger value="recents" className="gap-1">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Recents</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Contacts</span>
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-1">
            <Star className="h-4 w-4" />
            <span className="hidden sm:inline">Favorites</span>
          </TabsTrigger>
        </TabsList>

        {/* Keypad Tab */}
        <TabsContent value="keypad" className="flex-1 flex flex-col mt-0">
          {/* Dialed number display */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 min-h-[120px]">
            <AnimatePresence mode="wait">
              <motion.p 
                key={dialedNumber}
                initial={{ scale: 1.02 }}
                animate={{ scale: 1 }}
                className="text-3xl md:text-4xl font-light tracking-widest text-foreground min-h-[48px] select-all cursor-pointer"
                onClick={() => {
                  if (dialedNumber) {
                    navigator.clipboard.writeText(dialedNumber);
                    toast.success('Copied to clipboard');
                  }
                }}
              >
                {formatPhoneNumber(dialedNumber) || '—'}
              </motion.p>
            </AnimatePresence>
            
            {/* Matching contacts */}
            {dialedNumber.length >= 2 && filteredContacts.length > 0 && (
              <ScrollArea className="mt-3 max-h-28 w-full max-w-sm">
                {filteredContacts.slice(0, 3).map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => onCall(contact.id, contact.username, 'voice')}
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={contact.avatar_url} />
                      <AvatarFallback>{contact.username[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{contact.username}</p>
                      {contact.phone && <p className="text-xs text-muted-foreground">{contact.phone}</p>}
                    </div>
                  </button>
                ))}
              </ScrollArea>
            )}
          </div>

          {/* Keypad */}
          <div className="px-4 md:px-8 pb-2">
            <div className="grid grid-cols-3 gap-3 md:gap-4 max-w-xs mx-auto">
              {keypadDigits.map(({ digit, letters, icon }) => (
                <motion.button
                  key={digit}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDigitPress(digit)}
                  onMouseDown={() => handleDigitDown(digit)}
                  onMouseUp={handleDigitUp}
                  onMouseLeave={handleDigitUp}
                  onTouchStart={() => handleDigitDown(digit)}
                  onTouchEnd={handleDigitUp}
                  className={cn(
                    "flex flex-col items-center justify-center w-16 h-16 md:w-20 md:h-20 rounded-full mx-auto",
                    "bg-muted hover:bg-muted/80 active:bg-muted/60 transition-all",
                    speedDials[digit] && "ring-2 ring-primary/30"
                  )}
                >
                  <span className="text-2xl md:text-3xl font-medium">{digit}</span>
                  {icon ? icon : letters && (
                    <span className="text-[9px] md:text-[10px] text-muted-foreground tracking-widest">{letters}</span>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Call buttons */}
          <div className="flex items-center justify-center gap-6 pb-6 pt-2">
            {/* Delete */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleDelete}
              onDoubleClick={handleClear}
              disabled={!dialedNumber}
              className="w-12 h-12 rounded-full bg-muted disabled:opacity-30 flex items-center justify-center"
            >
              <Delete className="h-5 w-5" />
            </motion.button>

            {/* Voice call */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCall('voice')}
              className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg"
            >
              <Phone className="h-7 w-7 text-white" />
            </motion.button>

            {/* Video call */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => handleCall('video')}
              className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 flex items-center justify-center shadow-md"
            >
              <Video className="h-5 w-5 text-white" />
            </motion.button>
          </div>
        </TabsContent>

        {/* Recents Tab */}
        <TabsContent value="recents" className="flex-1 flex flex-col mt-0 overflow-hidden">
          <ScrollArea className="flex-1 px-4">
            <div className="py-2 space-y-1">
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : recentCalls.length === 0 ? (
                <div className="py-8 text-center">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No recent calls</p>
                </div>
              ) : (
                recentCalls.map((call) => {
                  const isOutgoing = call.caller_id === currentUserId;
                  const contactName = isOutgoing ? call.receiver_name : call.caller_name;
                  const contactAvatar = isOutgoing ? call.receiver_avatar : call.caller_avatar;
                  const contactId = isOutgoing ? call.receiver_id : call.caller_id;

                  return (
                    <div
                      key={call.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={contactAvatar || undefined} />
                        <AvatarFallback>{contactName?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-medium truncate",
                          (call.status === 'missed' || call.status === 'rejected') && "text-destructive"
                        )}>
                          {contactName || 'Unknown'}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {getCallIcon(call)}
                          <span>{call.call_type === 'video' ? 'Video' : 'Voice'}</span>
                          {call.duration > 0 && (
                            <>
                              <span>•</span>
                              <span>{formatDuration(call.duration)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                        </span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-green-500/10">
                              <Phone className="h-4 w-4 text-green-500" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onCall(contactId, contactName, 'voice')}>
                              <Phone className="h-4 w-4 mr-2" />
                              Voice call
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onCall(contactId, contactName, 'video')}>
                              <Video className="h-4 w-4 mr-2" />
                              Video call
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="flex-1 flex flex-col mt-0 overflow-hidden">
          <div className="px-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="pl-9"
              />
            </div>
          </div>
          <ScrollArea className="flex-1 px-4">
            <div className="py-2 space-y-1">
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : filteredContacts.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    {searchQuery ? 'No contacts found' : 'No contacts yet'}
                  </p>
                </div>
              ) : (
                filteredContacts.map(contact => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={contact.avatar_url} />
                        <AvatarFallback>{contact.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{contact.username}</p>
                        {contact.phone && (
                          <p className="text-xs text-muted-foreground">{contact.phone}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleFavorite(contact)}
                        className="h-8 w-8"
                      >
                        <Star className={cn("h-4 w-4", contact.is_favorite && "fill-yellow-400 text-yellow-400")} />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-green-500/10">
                            <Phone className="h-4 w-4 text-green-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onCall(contact.id, contact.username, 'voice')}>
                            <Phone className="h-4 w-4 mr-2" />
                            Voice call
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onCall(contact.id, contact.username, 'video')}>
                            <Video className="h-4 w-4 mr-2" />
                            Video call
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Favorites Tab */}
        <TabsContent value="favorites" className="flex-1 flex flex-col mt-0 overflow-hidden">
          <ScrollArea className="flex-1 px-4">
            <div className="py-4">
              {loading ? (
                <div className="py-8 text-center text-muted-foreground">Loading...</div>
              ) : favorites.length === 0 ? (
                <div className="py-8 text-center">
                  <Star className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No favorites yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Star contacts to add them here</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {favorites.map(contact => (
                    <motion.button
                      key={contact.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onCall(contact.id, contact.username, 'voice')}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-muted/50 transition-colors"
                    >
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={contact.avatar_url} />
                        <AvatarFallback className="text-xl">{contact.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium truncate max-w-full">{contact.username}</p>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Speed Dial Dialog */}
      <Dialog open={showSpeedDial} onOpenChange={setShowSpeedDial}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Speed Dial Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {['2', '3', '4', '5', '6', '7', '8', '9'].map(digit => (
              <div key={digit} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold">
                  {digit}
                </div>
                {speedDials[digit] ? (
                  <>
                    <div className="flex-1 flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={speedDials[digit].avatar_url} />
                        <AvatarFallback>{speedDials[digit].username[0]}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{speedDials[digit].username}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const { [digit]: _, ...rest } = speedDials;
                        setSpeedDials(rest);
                        localStorage.setItem('chatr_speed_dials', JSON.stringify(rest));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex-1 justify-start text-muted-foreground">
                        <Plus className="h-4 w-4 mr-2" />
                        Assign contact
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="max-h-60 overflow-auto">
                      {contacts.map(contact => (
                        <DropdownMenuItem key={contact.id} onClick={() => setSpeedDial(digit, contact)}>
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={contact.avatar_url} />
                            <AvatarFallback>{contact.username[0]}</AvatarFallback>
                          </Avatar>
                          {contact.username}
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
    </div>
  );
}
