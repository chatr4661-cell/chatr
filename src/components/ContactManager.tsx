import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Users, Search, RefreshCw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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
  const { toast } = useToast();

  // Auto-load contacts on mount
  useEffect(() => {
    loadContacts();
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

  const syncContacts = async () => {
    setIsLoading(true);
    
    try {
      // Get all contacts for this user
      const { data: existingContacts } = await supabase
        .from('contacts')
        .select('contact_phone, contact_user_id')
        .eq('user_id', userId);

      let syncedCount = 0;

      // For each contact, check if they're now registered
      for (const contact of existingContacts || []) {
        if (!contact.contact_user_id) {
          // Check if user exists with this phone/email
          const { data: matchedUser } = await supabase
            .from('profiles')
            .select('id')
            .or(`email.eq.${contact.contact_phone},phone_number.eq.${contact.contact_phone}`)
            .maybeSingle();

          if (matchedUser) {
            // Update contact to mark as registered
            await supabase
              .from('contacts')
              .update({
                contact_user_id: matchedUser.id,
                is_registered: true
              })
              .eq('user_id', userId)
              .eq('contact_phone', contact.contact_phone);
            
            syncedCount++;
          }
        }
      }

      toast({
        title: 'Contacts Synced',
        description: syncedCount > 0 
          ? `${syncedCount} contacts joined Chatr!` 
          : 'All contacts are up to date',
      });
      
      // Reload contacts to show updated data
      await loadContacts();
    } catch (error: any) {
      console.error('Sync error:', error);
      toast({
        title: 'Sync Failed',
        description: error.message || 'Failed to sync contacts',
        variant: 'destructive'
      });
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
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowAddContact(true)}
            className="flex-1"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Contact
          </Button>
          <Button 
            onClick={syncContacts}
            variant="outline"
          >
            <RefreshCw className="w-4 h-4" />
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
                <h3 className="text-sm font-semibold text-muted-foreground px-3 py-2">
                  Invite to Chatr
                </h3>
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
                    <Button size="sm" variant="ghost">
                      Invite
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {filteredContacts.length === 0 && !isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No contacts yet</p>
                <p className="text-sm">Add contacts to start chatting</p>
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