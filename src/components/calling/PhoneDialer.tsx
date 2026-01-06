import { useState, useRef, useEffect } from 'react';
import { Phone, X, Delete, UserPlus, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Contact {
  id: string;
  username: string;
  avatar_url?: string;
}

interface PhoneDialerProps {
  open: boolean;
  onClose: () => void;
  onCall: (contactId: string, contactName: string, callType: 'voice' | 'video') => void;
}

const keypadDigits = [
  { digit: '1', letters: '' },
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

export function PhoneDialer({ open, onClose, onCall }: PhoneDialerProps) {
  const [dialedNumber, setDialedNumber] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'keypad' | 'contacts'>('keypad');
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load contacts
  useEffect(() => {
    if (open) {
      loadContacts();
    }
  }, [open]);

  // Filter contacts based on search or dialed number
  useEffect(() => {
    const query = activeTab === 'keypad' ? dialedNumber : searchQuery;
    if (!query) {
      setFilteredContacts(contacts);
      return;
    }

    const filtered = contacts.filter(c => 
      c.username.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredContacts(filtered);
  }, [dialedNumber, searchQuery, contacts, activeTab]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get contacts from user_contacts table
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
        
        // Merge display names with profiles
        const merged = (profiles || []).map(p => {
          const contact = contactsData.find(c => c.contact_user_id === p.id);
          return {
            id: p.id,
            username: contact?.display_name || p.username,
            avatar_url: p.avatar_url
          };
        });
        
        setContacts(merged);
        setFilteredContacts(merged);
      }
    } catch (error) {
      console.error('Failed to load contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDigitPress = (digit: string) => {
    setDialedNumber(prev => prev + digit);
    
    // Play DTMF tone
    playDTMFTone(digit);
  };

  const handleLongPress = (digit: string) => {
    if (digit === '0') {
      setDialedNumber(prev => prev + '+');
    }
  };

  const handleDigitDown = (digit: string) => {
    if (digit === '0') {
      longPressTimerRef.current = setTimeout(() => handleLongPress(digit), 500);
    }
  };

  const handleDigitUp = (digit: string) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const playDTMFTone = (digit: string) => {
    try {
      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      // DTMF frequencies
      const frequencies: Record<string, [number, number]> = {
        '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
        '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
        '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
        '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
      };
      
      const [low, high] = frequencies[digit] || [440, 880];
      oscillator.frequency.value = (low + high) / 2;
      gainNode.gain.value = 0.1;
      oscillator.start();
      setTimeout(() => oscillator.stop(), 100);
    } catch (e) {
      // Audio context not available
    }
  };

  const handleDelete = () => {
    setDialedNumber(prev => prev.slice(0, -1));
  };

  const handleVoiceCall = () => {
    if (filteredContacts.length > 0) {
      const contact = filteredContacts[0];
      onCall(contact.id, contact.username, 'voice');
    } else if (dialedNumber.length >= 3) {
      toast.error('No matching contact found');
    } else {
      toast.error('Enter a name or select a contact');
    }
  };

  const handleVideoCall = () => {
    if (filteredContacts.length > 0) {
      const contact = filteredContacts[0];
      onCall(contact.id, contact.username, 'video');
    } else if (dialedNumber.length >= 3) {
      toast.error('No matching contact found');
    } else {
      toast.error('Enter a name or select a contact');
    }
  };

  const formatPhoneNumber = (number: string) => {
    // Basic formatting for display
    if (number.length <= 3) return number;
    if (number.length <= 6) return `${number.slice(0, 3)} ${number.slice(3)}`;
    if (number.length <= 10) return `${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
    return `${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6, 10)} ${number.slice(10)}`;
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: '100%' }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-50 bg-background"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">Phone</h1>
        <Button variant="ghost" size="icon">
          <UserPlus className="h-5 w-5" />
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'keypad' | 'contacts')} className="flex flex-col h-[calc(100%-60px)]">
        <TabsList className="mx-4 mt-2 grid grid-cols-2">
          <TabsTrigger value="keypad">Keypad</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
        </TabsList>

        <TabsContent value="keypad" className="flex-1 flex flex-col mt-0">
          {/* Dialed number display */}
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <motion.p 
              key={dialedNumber}
              initial={{ scale: 1.05 }}
              animate={{ scale: 1 }}
              className="text-3xl font-light tracking-widest text-foreground min-h-[48px]"
            >
              {formatPhoneNumber(dialedNumber) || '—'}
            </motion.p>
            
            {/* Matching contacts */}
            {dialedNumber.length >= 3 && filteredContacts.length > 0 && (
              <div className="mt-4 max-h-32 overflow-y-auto w-full max-w-xs">
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
                    <span className="text-sm">{contact.username}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Keypad */}
          <div className="px-8 pb-4">
            <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
              {keypadDigits.map(({ digit, letters }) => (
                <motion.button
                  key={digit}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleDigitPress(digit)}
                  onMouseDown={() => handleDigitDown(digit)}
                  onMouseUp={() => handleDigitUp(digit)}
                  onTouchStart={() => handleDigitDown(digit)}
                  onTouchEnd={() => handleDigitUp(digit)}
                  className="flex flex-col items-center justify-center w-20 h-20 rounded-full 
                           bg-muted hover:bg-muted/80 active:bg-muted/60 transition-all mx-auto"
                >
                  <span className="text-2xl font-medium">{digit}</span>
                  {letters && <span className="text-[10px] text-muted-foreground tracking-widest">{letters}</span>}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Call button - single phone icon with menu for call type */}
          <div className="flex items-center justify-center gap-8 pb-8">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleDelete}
              disabled={!dialedNumber}
              className="w-14 h-14 rounded-full bg-muted disabled:opacity-30 flex items-center justify-center"
            >
              <Delete className="h-5 w-5" />
            </motion.button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  disabled={filteredContacts.length === 0 && dialedNumber.length < 3}
                  className="w-18 h-18 rounded-full bg-green-500 disabled:opacity-50 flex items-center justify-center shadow-xl p-5"
                >
                  <Phone className="h-7 w-7 text-white" />
                </motion.button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-40">
                <DropdownMenuItem onClick={handleVoiceCall} className="gap-2">
                  <Phone className="h-4 w-4" />
                  Voice Call
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleVideoCall} className="gap-2">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="5" width="14" height="14" rx="2" />
                    <path d="m22 7-4 3 4 3V7Z" />
                  </svg>
                  Video Call
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-14 h-14" /> {/* Spacer for balance */}
          </div>
        </TabsContent>

        <TabsContent value="contacts" className="flex-1 flex flex-col mt-0 px-4">
          {/* Search */}
          <div className="relative my-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="pl-9"
            />
          </div>

          {/* Contacts list */}
          <ScrollArea className="flex-1">
            <div className="space-y-1">
              {loading ? (
                <p className="text-center text-muted-foreground py-8">Loading contacts...</p>
              ) : filteredContacts.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No contacts found</p>
              ) : (
                filteredContacts.map(contact => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={contact.avatar_url} />
                        <AvatarFallback>{contact.username[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <p className="font-medium">{contact.username}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full h-10 w-10 hover:bg-green-500/10 hover:text-green-500"
                        >
                          <Phone className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onCall(contact.id, contact.username, 'voice')} className="gap-2">
                          <Phone className="h-4 w-4" />
                          Voice
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCall(contact.id, contact.username, 'video')} className="gap-2">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="2" y="5" width="14" height="14" rx="2" />
                            <path d="m22 7-4 3 4 3V7Z" />
                          </svg>
                          Video
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
