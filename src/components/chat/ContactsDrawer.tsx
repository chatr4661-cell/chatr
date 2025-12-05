import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MessageCircle, UserPlus, Loader2, RefreshCw, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';
import contactsIcon from '@/assets/contacts-icon.png';

interface Contact {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  avatar_url?: string;
  is_on_chatr: boolean;
  chatr_user_id?: string;
}

interface ContactsDrawerProps {
  userId: string;
  onStartChat: (contactUserId: string, contactName: string, avatarUrl?: string) => void;
  children: React.ReactNode;
}

export const ContactsDrawer = ({ userId, onStartChat, children }: ContactsDrawerProps) => {
  const [open, setOpen] = React.useState(false);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [startingChat, setStartingChat] = React.useState<string | null>(null);
  const isNative = Capacitor.isNativePlatform();

  // Load ALL contacts when drawer opens
  const loadContacts = React.useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    
    try {
      // Load from contacts table (device synced)
      const { data: phoneContacts } = await supabase
        .from('contacts')
        .select('id, contact_name, contact_phone, contact_user_id, is_registered')
        .eq('user_id', userId);

      const allContacts: Contact[] = [];
      const seen = new Set<string>();

      // Add phone contacts
      phoneContacts?.forEach(c => {
        const key = c.contact_user_id || c.contact_phone || c.id;
        if (!seen.has(key)) {
          seen.add(key);
          allContacts.push({
            id: c.id,
            name: c.contact_name || 'Unknown',
            phone: c.contact_phone,
            is_on_chatr: c.is_registered,
            chatr_user_id: c.contact_user_id
          });
        }
      });

      // Sort: On Chatr first, then alphabetically
      allContacts.sort((a, b) => {
        if (a.is_on_chatr && !b.is_on_chatr) return -1;
        if (!a.is_on_chatr && b.is_on_chatr) return 1;
        return a.name.localeCompare(b.name);
      });

      setContacts(allContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Sync device contacts (Telegram-style - native only)
  const syncDeviceContacts = async () => {
    if (!isNative) {
      toast.info('Contact sync is only available on mobile devices');
      return;
    }

    setSyncing(true);
    try {
      const { Contacts } = await import('@capacitor-community/contacts');
      
      // Request permission (READ_CONTACTS on Android, CNContactStore on iOS)
      const permission = await Contacts.requestPermissions();
      
      if (permission.contacts !== 'granted') {
        toast.error('Please allow contacts access in your device settings');
        return;
      }

      toast.info('Reading contacts from your device...');

      // Get all device contacts
      const result = await Contacts.getContacts({
        projection: { name: true, phones: true }
      });

      if (!result?.contacts?.length) {
        toast.info('No contacts found on device');
        return;
      }

      // Hash phone numbers and check registered users
      const phoneHashes = new Set<string>();
      const contactsMap = new Map();

      for (const contact of result.contacts) {
        const phone = contact.phones?.[0]?.number;
        if (phone) {
          const normalized = phone.replace(/\D/g, '');
          const fullPhone = normalized.length === 10 ? `+91${normalized}` : `+${normalized}`;
          
          // Create hash for matching
          const msgBuffer = new TextEncoder().encode(normalized);
          const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          
          phoneHashes.add(hash);
          contactsMap.set(hash, {
            name: contact.name?.display || contact.name?.given || 'Unknown',
            phone: fullPhone,
            hash
          });
        }
      }

      // Find registered users by phone hash
      const { data: registeredProfiles } = await supabase
        .from('profiles')
        .select('id, username, phone_number, phone_hash, avatar_url')
        .in('phone_hash', Array.from(phoneHashes))
        .not('phone_hash', 'is', null);

      // Upsert contacts to database
      const contactsToUpsert = Array.from(contactsMap.values()).map(contact => {
        const registered = registeredProfiles?.find(p => p.phone_hash === contact.hash);
        return {
          user_id: userId,
          contact_name: contact.name,
          contact_phone: contact.phone,
          contact_phone_hash: contact.hash,
          is_registered: !!registered,
          contact_user_id: registered?.id || null
        };
      });

      if (contactsToUpsert.length > 0) {
        const { error } = await supabase.from('contacts').upsert(contactsToUpsert, {
          onConflict: 'user_id,contact_phone',
          ignoreDuplicates: false
        });

        if (error) throw error;
      }

      // Update profile sync status
      await supabase.from('profiles').update({ 
        contacts_synced: true,
        last_contact_sync: new Date().toISOString()
      }).eq('id', userId);

      const onChatrCount = registeredProfiles?.length || 0;
      toast.success(`Synced ${contactsToUpsert.length} contacts! (${onChatrCount} on Chatr)`);
      
      loadContacts();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(error.message || 'Could not sync contacts');
    } finally {
      setSyncing(false);
    }
  };

  // Start chat with a contact
  const handleStartChat = async (contact: Contact) => {
    if (!contact.is_on_chatr || !contact.chatr_user_id) {
      // Invite contact via WhatsApp
      const inviteText = `Hey! Join me on Chatr - India's super app for messaging, jobs, healthcare & more. Download now: https://chatr.chat/join`;
      if (contact.phone) {
        window.open(`https://wa.me/${contact.phone.replace(/\D/g, '')}?text=${encodeURIComponent(inviteText)}`, '_blank');
      }
      return;
    }

    setStartingChat(contact.id);
    try {
      const { data, error } = await supabase.rpc('create_direct_conversation', {
        other_user_id: contact.chatr_user_id
      });

      if (error) throw error;

      onStartChat(data, contact.name, contact.avatar_url);
      setOpen(false);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start conversation');
    } finally {
      setStartingChat(null);
    }
  };

  React.useEffect(() => {
    if (open) {
      loadContacts();
    }
  }, [open, loadContacts]);

  const filteredContacts = React.useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(c =>
      c.name?.toLowerCase().includes(query) ||
      c.phone?.includes(query)
    );
  }, [contacts, searchQuery]);

  const onChatrContacts = filteredContacts.filter(c => c.is_on_chatr);
  const inviteContacts = filteredContacts.filter(c => !c.is_on_chatr);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <img src={contactsIcon} alt="Contacts" className="w-6 h-6 rounded-full" />
              Contacts
            </SheetTitle>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={syncDeviceContacts}
              disabled={syncing || !isNative}
              className="gap-1.5"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync
            </Button>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)]">
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Smartphone className="w-16 h-16 mb-4 text-muted-foreground/50" />
              <p className="font-semibold">No contacts synced</p>
              <p className="text-sm text-muted-foreground mb-4">
                {isNative 
                  ? 'Sync your phone contacts to find friends on Chatr'
                  : 'Open in mobile app to sync device contacts'
                }
              </p>
              {isNative && (
                <Button onClick={syncDeviceContacts} disabled={syncing} className="bg-primary">
                  {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Sync Phone Contacts
                </Button>
              )}
            </div>
          ) : (
            <div>
              {/* Stats */}
              <div className="px-4 py-2 bg-muted/20 text-xs text-muted-foreground">
                {contacts.length} contacts • {onChatrContacts.length} on Chatr
              </div>

              {/* On Chatr Section */}
              {onChatrContacts.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-primary/10 border-b sticky top-0 z-10">
                    <span className="text-xs font-semibold text-primary uppercase">
                      On Chatr ({onChatrContacts.length})
                    </span>
                  </div>
                  {onChatrContacts.map(contact => (
                    <div
                      key={contact.id}
                      onClick={() => handleStartChat(contact)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 cursor-pointer transition-colors border-b"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={contact.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {contact.name?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{contact.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.phone}
                        </p>
                      </div>
                      {startingChat === contact.id ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <MessageCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Invite Section */}
              {inviteContacts.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-muted/30 border-b sticky top-0 z-10">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">
                      Invite to Chatr ({inviteContacts.length})
                    </span>
                  </div>
                  {inviteContacts.map(contact => (
                    <div
                      key={contact.id}
                      onClick={() => handleStartChat(contact)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 cursor-pointer transition-colors border-b"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={contact.avatar_url} />
                        <AvatarFallback className="bg-muted text-muted-foreground">
                          {contact.name?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{contact.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.phone || 'Not on Chatr'}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="h-8">
                        <UserPlus className="h-4 w-4 mr-1" />
                        Invite
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
