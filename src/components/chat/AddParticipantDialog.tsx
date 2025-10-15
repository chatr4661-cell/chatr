import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, UserPlus, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Contact {
  id: string;
  username: string;
  avatar_url?: string;
  phone_number?: string;
}

interface AddParticipantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  currentParticipants: string[];
  onParticipantAdded: () => void;
}

export const AddParticipantDialog = ({
  open,
  onOpenChange,
  conversationId,
  currentParticipants,
  onParticipantAdded
}: AddParticipantDialogProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const maxParticipants = 5;
  const spotsLeft = maxParticipants - currentParticipants.length;

  useEffect(() => {
    if (open) {
      loadContacts();
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredContacts(
        contacts.filter(contact =>
          contact.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          contact.phone_number?.includes(searchQuery)
        )
      );
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchQuery, contacts]);

  const loadContacts = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's contacts
      const { data: contactData } = await supabase
        .from('contacts')
        .select('contact_user_id')
        .eq('user_id', user.id)
        .eq('is_registered', true)
        .not('contact_user_id', 'is', null);

      if (!contactData) return;

      const contactIds = contactData.map(c => c.contact_user_id);

      // Get profiles, excluding current participants
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, phone_number')
        .in('id', contactIds)
        .not('id', 'in', `(${currentParticipants.join(',')})`);

      setContacts(profiles || []);
      setFilteredContacts(profiles || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const addParticipant = async (userId: string) => {
    if (currentParticipants.length >= maxParticipants) {
      toast.error(`Group chat cannot have more than ${maxParticipants} participants`);
      return;
    }

    setAdding(true);
    try {
      // Convert to group if not already
      const { data: conversation } = await supabase
        .from('conversations')
        .select('is_group')
        .eq('id', conversationId)
        .single();

      if (!conversation?.is_group) {
        await supabase
          .from('conversations')
          .update({ is_group: true })
          .eq('id', conversationId);
      }

      // Add participant
      const { error } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          role: 'member'
        });

      if (error) {
        if (error.message.includes('cannot have more than 5 participants')) {
          toast.error('Group chat is full (maximum 5 participants)');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Participant added to group');
      onParticipantAdded();
      onOpenChange(false);
    } catch (error) {
      console.error('Error adding participant:', error);
      toast.error('Failed to add participant');
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Add Participants
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {spotsLeft > 0 ? (
              `${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} available (${currentParticipants.length}/${maxParticipants})`
            ) : (
              'Group is full'
            )}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <ScrollArea className="h-[300px]">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No contacts found
              </div>
            ) : (
              <div className="space-y-2">
                {filteredContacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={contact.avatar_url} />
                        <AvatarFallback>
                          {contact.username.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{contact.username}</p>
                        {contact.phone_number && (
                          <p className="text-sm text-muted-foreground">
                            {contact.phone_number}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => addParticipant(contact.id)}
                      disabled={adding || spotsLeft === 0}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};
