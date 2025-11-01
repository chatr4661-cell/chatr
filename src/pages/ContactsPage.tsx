import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ContactsSync } from '@/components/ContactsSync';
import { Search, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all users except current user
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id);

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
      toast.error('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.includes(searchQuery)
  );

  const onChatrContacts = filteredContacts.filter(c => c.phone);
  const inviteContacts = filteredContacts.filter(c => !c.phone);

  const startChat = async (contactId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create or get existing conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .contains('participant_ids', [user.id, contactId])
        .single();

      if (existing) {
        navigate(`/chat?conversation=${existing.id}`);
        return;
      }

      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participant_ids: [user.id, contactId],
          is_group: false
        })
        .select()
        .single();

      if (error) throw error;
      navigate(`/chat?conversation=${data.id}`);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start chat');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="p-4">
          <h1 className="text-2xl font-bold mb-4">People</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Contact Sync */}
      <div className="p-4">
        <ContactsSync />
      </div>

      {/* On Chatr Section */}
      {onChatrContacts.length > 0 && (
        <div className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            ON CHATR ({onChatrContacts.length})
          </h2>
          <div className="space-y-2">
            {onChatrContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => startChat(contact.id)}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
              >
                <Avatar>
                  <AvatarImage src={contact.avatar_url} />
                  <AvatarFallback>
                    {contact.username?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{contact.username || 'Unknown'}</p>
                  <p className="text-sm text-muted-foreground">{contact.phone}</p>
                </div>
                {contact.is_online && (
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Invite Section */}
      {inviteContacts.length > 0 && (
        <div className="p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            INVITE TO CHATR ({inviteContacts.length})
          </h2>
          <div className="space-y-2">
            {inviteContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors"
              >
                <Avatar>
                  <AvatarFallback>
                    {contact.username?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold">{contact.username || 'Unknown'}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.info('Invite feature coming soon')}
                >
                  Invite
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="p-8 text-center text-muted-foreground">
          Loading contacts...
        </div>
      )}

      {!loading && contacts.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No contacts found. Sync your phone contacts to get started.
        </div>
      )}
    </div>
  );
}
