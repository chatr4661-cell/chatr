import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Contact {
  id: string;
  username: string;
  avatar_url?: string;
  phone_number?: string;
}

interface AddParticipantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callId: string;
  onAdd: (participants: Contact[]) => void;
  currentParticipants: string[];
}

export const AddParticipantDialog = ({
  open,
  onOpenChange,
  callId,
  onAdd,
  currentParticipants,
}: AddParticipantDialogProps) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadContacts();
    }
  }, [open]);

  useEffect(() => {
    if (searchQuery) {
      setFilteredContacts(
        contacts.filter(c =>
          c.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.phone_number?.includes(searchQuery)
        )
      );
    } else {
      setFilteredContacts(contacts);
    }
  }, [searchQuery, contacts]);

  const loadContacts = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      const { data, error } = await supabase
        .from('contacts')
        .select('contact_user_id')
        .eq('user_id', user.user.id)
        .eq('is_registered', true);

      if (error) throw error;

      const userIds = data?.map(c => c.contact_user_id).filter(Boolean) || [];
      
      if (userIds.length === 0) {
        setContacts([]);
        setFilteredContacts([]);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, phone_number')
        .in('id', userIds);

      const contactsList = (profiles || [])
        .filter(p => !currentParticipants.includes(p.id))
        .map(p => ({
          id: p.id,
          username: p.username || p.phone_number || 'User',
          avatar_url: p.avatar_url,
          phone_number: p.phone_number,
        }));

      setContacts(contactsList);
      setFilteredContacts(contactsList);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast({
        title: "Error",
        description: "Failed to load contacts",
        variant: "destructive",
      });
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const updated = new Set(prev);
      if (updated.has(id)) {
        updated.delete(id);
      } else {
        updated.add(id);
      }
      return updated;
    });
  };

  const handleAdd = async () => {
    if (selectedIds.size === 0) return;

    setLoading(true);
    try {
      const selectedContacts = contacts.filter(c => selectedIds.has(c.id));
      
      // Update call to group if it isn't already
      await supabase
        .from('calls')
        .update({ is_group: true })
        .eq('id', callId);

      // Add participants to call_participants table
      const participantsData = Array.from(selectedIds).map(userId => ({
        call_id: callId,
        user_id: userId,
      }));

      await supabase.from('call_participants').insert(participantsData);

      onAdd(selectedContacts);
      onOpenChange(false);
      setSelectedIds(new Set());
      setSearchQuery('');
    } catch (error) {
      console.error('Error adding participants:', error);
      toast({
        title: "Error",
        description: "Failed to add participants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Participants</DialogTitle>
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

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {filteredContacts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No contacts found</p>
            ) : (
              filteredContacts.map(contact => (
                <label
                  key={contact.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedIds.has(contact.id)}
                    onCheckedChange={() => toggleSelection(contact.id)}
                  />
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={contact.avatar_url} />
                    <AvatarFallback>
                      {contact.username?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{contact.username}</p>
                    {contact.phone_number && (
                      <p className="text-sm text-muted-foreground truncate">
                        {contact.phone_number}
                      </p>
                    )}
                  </div>
                </label>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={selectedIds.size === 0 || loading}
              className="flex-1 gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add {selectedIds.size > 0 && `(${selectedIds.size})`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
