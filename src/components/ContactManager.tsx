import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Users, Search, RefreshCw, MessageCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Contacts } from '@capacitor-community/contacts';
import { Browser } from '@capacitor/browser';

// Hash phone number for privacy (SHA-256)
const hashPhoneNumber = async (phone: string): Promise<string> => {
  const normalized = phone.replace(/\D/g, ''); // Remove non-digits
  const msgBuffer = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Normalize phone to E.164 format (+countrycode + number)
const normalizePhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  // If it doesn't start with +, assume India (+91)
  if (!phone.startsWith('+')) {
    if (cleaned.length === 10) {
      return `+91${cleaned}`;
    } else if (cleaned.length > 10) {
      return `+${cleaned}`;
    }
  }
  
  return phone.startsWith('+') ? phone : `+${cleaned}`;
};

interface Contact {
  id: string;
  contact_name: string;
  contact_phone: string;
  contact_user_id: string | null;
  is_registered: boolean;
  profile?: {
    id: string;
    username: string;
    avatar_url: string | null;
    email: string | null;
    phone_number: string | null;
    is_online: boolean;
  };
}

interface ContactManagerProps {
  userId: string;
  onContactSelect: (contact: any) => void;
}

export const ContactManager = ({ userId, onContactSelect }: ContactManagerProps) => {
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactIdentifier, setContactIdentifier] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { toast } = useToast();

  // Auto-sync on mount (like WhatsApp) - ALWAYS run on login
  useEffect(() => {
    if (!userId) return;
    
    const autoSync = async () => {
      console.log('🔄 Auto-syncing contacts on login...');
      await autoSyncContacts();
    };
    
    autoSync();
  }, [userId]);

  // Background periodic sync every 24 hours
  useEffect(() => {
    if (!userId) return;
    
    const syncInterval = setInterval(async () => {
      console.log('🔄 Background sync triggered...');
      await autoSyncContacts();
    }, 24 * 60 * 60 * 1000); // 24 hours
    
    return () => clearInterval(syncInterval);
  }, [userId]);

  const loadContacts = async () => {
    setIsLoading(true);
    
    // Get contacts
    const { data: contactsData, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', userId)
      .order('contact_name');

    if (contactsError) {
      console.error('Error loading contacts:', contactsError);
      toast({
        title: 'Error',
        description: 'Failed to load contacts',
        variant: 'destructive'
      });
      setIsLoading(false);
      return;
    }

    // Get profile data for registered contacts
    const registeredContactIds = contactsData
      ?.filter(c => c.contact_user_id)
      .map(c => c.contact_user_id) || [];

    let profilesData = [];
    if (registeredContactIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, email, phone_number, is_online')
        .in('id', registeredContactIds);
      
      profilesData = profiles || [];
    }

    // Merge contacts with profiles
    const mergedContacts = contactsData?.map(contact => ({
      ...contact,
      profile: contact.contact_user_id 
        ? profilesData.find(p => p.id === contact.contact_user_id) || null
        : null
    })) || [];

    setContacts(mergedContacts as any);
    setIsLoading(false);
  };

  const addContact = async () => {
    if (!contactIdentifier.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an email or phone number',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    // Check if it's an email or phone
    const isEmail = contactIdentifier.includes('@');
    
    // First, try to find a registered user
    let query = supabase.from('profiles').select('*');
    
    if (isEmail) {
      query = query.eq('email', contactIdentifier);
    } else {
      query = query.eq('phone_number', contactIdentifier);
    }

    const { data: matchedUser } = await query.maybeSingle();

    // Insert or update contact
    const { error } = await supabase
      .from('contacts')
      .upsert({
        user_id: userId,
        contact_name: contactName || contactIdentifier,
        contact_phone: contactIdentifier,
        contact_user_id: matchedUser?.id || null,
        is_registered: !!matchedUser
      }, {
        onConflict: 'user_id,contact_phone'
      });

    setIsLoading(false);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to add contact: ' + error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: matchedUser 
          ? `Added ${matchedUser.username} to your contacts` 
          : 'Contact added. They will appear when they join Chatr.',
      });
      setContactName('');
      setContactIdentifier('');
      setShowAddContact(false);
      loadContacts();
    }
  };

  const inviteViaWhatsApp = async (name: string, phone: string) => {
    const inviteMessage = `Hey ${name} 👋 I'm on Chatr — the next-gen all-in-one app for chat, healthcare, and more! Join me here 👉 https://chatr.chat/download`;
    const encodedMessage = encodeURIComponent(inviteMessage);
    const whatsappUrl = `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodedMessage}`;
    
    try {
      await Browser.open({ url: whatsappUrl });
    } catch (error) {
      // Fallback to web version
      window.open(whatsappUrl, '_blank');
    }
  };

  const inviteAllViaWhatsApp = () => {
    const inviteMessage = `Hey 👋 I'm on Chatr — the next-gen all-in-one app for chat, healthcare, jobs, payments, and more! Join me here 👉 https://chatr.chat/download`;
    const encodedMessage = encodeURIComponent(inviteMessage);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    try {
      Browser.open({ url: whatsappUrl });
    } catch (error) {
      window.open(whatsappUrl, '_blank');
    }
  };

  // Auto-sync function (silent, no toast on success)
  const autoSyncContacts = async () => {
    try {
      setIsSyncing(true);
      
      // Check if we're on mobile (Capacitor)
      const { Capacitor } = await import('@capacitor/core');
      const isNativePlatform = Capacitor.isNativePlatform();
      
      if (!isNativePlatform) {
        console.log('ℹ️ Contact sync only available on mobile devices');
        await loadContacts();
        setIsSyncing(false);
        return;
      }
      
      const { Contacts } = await import('@capacitor-community/contacts');
      
      // Try to get permission (if already granted, it won't prompt)
      const permission = await Contacts.requestPermissions();
      
      if (permission.contacts === 'denied') {
        console.log('ℹ️ Contacts permission denied, loading from database only');
        await loadContacts();
        setIsSyncing(false);
        return;
      }

      // Get all contacts from device
      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
          emails: true
        }
      });

      if (!result.contacts || result.contacts.length === 0) {
        await loadContacts();
        setIsSyncing(false);
        return;
      }

      let importedCount = 0;
      let registeredCount = 0;

      // Batch processing for efficiency
      const batchSize = 50;
      for (let i = 0; i < result.contacts.length; i += batchSize) {
        const batch = result.contacts.slice(i, i + batchSize);
        
        // Collect all phone numbers from this batch and hash them
        const phoneHashMap: Map<string, { name: string, phone: string, email?: string }> = new Map();
        
        for (const contact of batch) {
          const name = contact.name?.display || 'Unknown';
          const phone = contact.phones?.[0]?.number;
          const email = contact.emails?.[0]?.address;

          if (phone) {
            const normalized = normalizePhoneNumber(phone);
            const hash = await hashPhoneNumber(normalized);
            phoneHashMap.set(hash, { name, phone: normalized, email });
          }
        }

        // Query profiles using phone_hash for privacy
        const hashes = Array.from(phoneHashMap.keys());
        const { data: matchedProfiles } = await supabase
          .from('profiles')
          .select('id, username, phone_hash')
          .in('phone_hash', hashes);

        // Create a map of hash to user
        const hashToUser = new Map(
          (matchedProfiles || []).map(p => [p.phone_hash, p])
        );

        // Insert or update contacts
        for (const [hash, contactInfo] of phoneHashMap.entries()) {
          const matchedUser = hashToUser.get(hash);

          await supabase
            .from('contacts')
            .upsert({
              user_id: userId,
              contact_name: contactInfo.name,
              contact_phone: contactInfo.phone,
              contact_phone_hash: hash,
              contact_user_id: matchedUser?.id || null,
              is_registered: !!matchedUser
            }, {
              onConflict: 'user_id,contact_phone'
            });

          importedCount++;
          if (matchedUser) registeredCount++;
        }
      }

      // Update last sync time
      const now = new Date().getTime();
      localStorage.setItem(`last_sync_${userId}`, now.toString());
      setLastSyncTime(new Date(now));
      
      console.log(`✅ Auto-sync complete: ${importedCount} contacts, ${registeredCount} on Chatr`);
      
      // Reload contacts to show updated data
      await loadContacts();
    } catch (error: any) {
      console.log('ℹ️ Auto-sync not available:', error.message);
      // Silently fall back to loading from database
      await loadContacts();
    } finally {
      setIsSyncing(false);
    }
  };

  // Manual sync function (with user feedback and platform detection)
  const syncContacts = async () => {
    try {
      // Check if we're on a native platform
      const { Capacitor } = await import('@capacitor/core');
      const isNativePlatform = Capacitor.isNativePlatform();
      
      if (!isNativePlatform) {
        toast({
          title: 'Mobile App Required',
          description: 'Contact syncing only works on the mobile app. Download it to sync your contacts automatically.',
          variant: 'default',
        });
        return;
      }

      setIsLoading(true);
      
      // Request permission and get device contacts
      const permission = await Contacts.requestPermissions();
      
      if (permission.contacts === 'denied') {
        toast({
          title: 'Permission Denied',
          description: 'Please enable contacts permission in your device settings',
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      // Get all contacts from device
      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
          emails: true
        }
      });

      if (!result.contacts || result.contacts.length === 0) {
        toast({
          title: 'No Contacts Found',
          description: 'No contacts found on your device',
        });
        setIsLoading(false);
        return;
      }

      let importedCount = 0;
      let registeredCount = 0;

      // Process each device contact
      for (const contact of result.contacts) {
        const name = contact.name?.display || 'Unknown';
        const phone = contact.phones?.[0]?.number;
        const email = contact.emails?.[0]?.address;

        if (!phone && !email) continue;

        const identifier = email || phone || '';
        
        // Check if user is registered
        let matchedUser = null;
        
        if (email) {
          const { data } = await supabase
            .from('profiles')
            .select('id, username')
            .eq('email', email)
            .maybeSingle();
          matchedUser = data;
        }
        
        if (!matchedUser && phone) {
          const normalized = normalizePhoneNumber(phone);
          const hash = await hashPhoneNumber(normalized);
          
          const { data } = await supabase
            .from('profiles')
            .select('id, username, phone_hash')
            .or(`phone_number.eq.${normalized},phone_hash.eq.${hash}`)
            .maybeSingle();
          matchedUser = data;
        }

        // Hash the phone number for storage
        let phoneHash = null;
        if (phone) {
          const normalized = normalizePhoneNumber(phone);
          phoneHash = await hashPhoneNumber(normalized);
        }

        // Insert or update contact
        await supabase
          .from('contacts')
          .upsert({
            user_id: userId,
            contact_name: name,
            contact_phone: identifier,
            contact_phone_hash: phoneHash,
            contact_user_id: matchedUser?.id || null,
            is_registered: !!matchedUser
          }, {
            onConflict: 'user_id,contact_phone'
          });

        importedCount++;
        if (matchedUser) registeredCount++;
      }

      // Update last sync time
      const now = new Date().getTime();
      localStorage.setItem(`last_sync_${userId}`, now.toString());
      setLastSyncTime(new Date(now));

      toast({
        title: 'Contacts Synced!',
        description: `Imported ${importedCount} contacts. ${registeredCount} are on Chatr!`,
      });
      
      // Reload contacts to show updated data
      await loadContacts();
    } catch (error: any) {
      console.error('Sync error:', error);
      
      // Check if it's a web environment
      if (error.message?.includes('not implemented')) {
        toast({
          title: 'Feature Not Available',
          description: 'Contact syncing is only available on mobile devices. Please use "Add Contact" to add contacts manually.',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Sync Failed',
          description: error.message || 'Failed to sync contacts',
          variant: 'destructive'
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact => 
    contact.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.contact_phone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const registeredContacts = filteredContacts.filter(c => c.is_registered);
  const unregisteredContacts = filteredContacts.filter(c => !c.is_registered);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        {/* Sync Status */}
        {isSyncing && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-accent/50 p-2 rounded-lg">
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>Syncing contacts in background...</span>
          </div>
        )}
        
        {lastSyncTime && !isSyncing && (
          <div className="text-xs text-muted-foreground text-center">
            Last synced: {lastSyncTime.toLocaleDateString()} {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={() => setShowAddContact(true)}
            variant="outline"
            className="flex-1"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
          <Button 
            onClick={syncContacts}
            disabled={isLoading || isSyncing}
            className="flex-1"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${(isLoading || isSyncing) ? 'animate-spin' : ''}`} />
            Sync Now
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Contacts List */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="p-2">
            {/* Registered Contacts */}
            {registeredContacts.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground px-3 py-2">
                  On Chatr
                </h3>
                {registeredContacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => {
                      if (contact.profile) {
                        onContactSelect(contact.profile);
                      }
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-accent rounded-lg transition-colors"
                  >
                    <Avatar>
                      <AvatarFallback>
                        {contact.profile?.username?.[0]?.toUpperCase() || contact.contact_name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <div className="font-medium">
                        {contact.profile?.username || contact.contact_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {contact.profile?.is_online ? (
                          <span className="text-green-500">Online</span>
                        ) : (
                          contact.contact_phone
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Unregistered Contacts */}
            {unregisteredContacts.length > 0 && (
              <div>
                <div className="flex items-center justify-between px-3 py-2">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    Invite to Chatr
                  </h3>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={inviteAllViaWhatsApp}
                    className="text-xs"
                  >
                    📤 Invite All
                  </Button>
                </div>
                {unregisteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 p-3 opacity-60"
                  >
                    <Avatar>
                      <AvatarFallback>
                        {contact.contact_name[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{contact.contact_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {contact.contact_phone}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="default"
                      className="bg-green-500 hover:bg-green-600 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        inviteViaWhatsApp(contact.contact_name, contact.contact_phone);
                      }}
                    >
                      <MessageCircle className="w-3 h-3 mr-1" />
                      Invite
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {filteredContacts.length === 0 && !isLoading && (
              <div className="text-center py-12 text-muted-foreground space-y-4">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No contacts yet</p>
                <p className="text-sm">Add contacts to start chatting</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open('/download', '_blank')}
                  className="mt-2"
                >
                  Invite Friends to Chatr
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Add Contact Dialog */}
      <Dialog open={showAddContact} onOpenChange={setShowAddContact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Contact Name (Optional)
              </label>
              <Input
                placeholder="John Doe"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Email or Phone Number
              </label>
              <Input
                placeholder="arshid.wani@icloud.com or +1234567890"
                value={contactIdentifier}
                onChange={(e) => setContactIdentifier(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={addContact}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Adding...' : 'Add Contact'}
              </Button>
              <Button
                onClick={() => setShowAddContact(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};