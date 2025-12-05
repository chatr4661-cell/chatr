import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Users, Search, UserPlus, Mail, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Contact {
  id: string;
  display_name: string;
  avatar_url: string | null;
  phone_number: string | null;
  email: string | null;
  is_online: boolean;
}

const DesktopContacts: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const formattedContacts = (data || []).map((d: any) => ({
        id: d.id,
        display_name: d.name || d.contact_name || 'Unknown',
        avatar_url: null,
        phone_number: d.phone_number,
        email: d.email,
        is_online: false,
      }));

      setContacts(formattedContacts);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group contacts by first letter
  const groupedContacts = filteredContacts.reduce((acc, contact) => {
    const letter = contact.display_name[0]?.toUpperCase() || '#';
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(contact);
    return acc;
  }, {} as Record<string, Contact[]>);

  const sortedLetters = Object.keys(groupedContacts).sort();

  return (
    <div className="flex h-full">
      {/* Contacts List */}
      <div className="w-80 border-r border-border flex flex-col bg-card/50">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Contacts</h2>
            <Button variant="ghost" size="icon">
              <UserPlus className="h-5 w-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="h-4 w-24 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No contacts found' : 'No contacts yet'}
              </p>
            </div>
          ) : (
            <div className="py-2">
              {sortedLetters.map((letter) => (
                <div key={letter}>
                  <div className="px-4 py-2 bg-muted/30 text-xs font-semibold text-muted-foreground">
                    {letter}
                  </div>
                  {groupedContacts[letter].map((contact) => (
                    <button
                      key={contact.id}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={contact.avatar_url || undefined} />
                          <AvatarFallback>
                            {contact.display_name[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {contact.is_online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">{contact.display_name}</p>
                        {contact.phone_number && (
                          <p className="text-xs text-muted-foreground">
                            {contact.phone_number}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Contact Details Placeholder */}
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <Users className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">
            Select a contact
          </h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            View contact details and start a conversation
          </p>
        </div>
      </div>
    </div>
  );
};

export default DesktopContacts;
