import React, { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface NewChatSheetProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectContact: (contactUserId: string) => void;
}

interface Contact {
  id: string;
  contact_user_id: string;
  username: string;
  avatar_url: string | null;
  is_online: boolean;
  last_seen: string;
}

export function NewChatSheet({ userId, open, onOpenChange, onSelectContact }: NewChatSheetProps) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open) {
      loadContacts();
    }
  }, [userId, open]);

  const loadContacts = async () => {
    const { data } = await supabase
      .from('contacts')
      .select(`
        id,
        contact_user_id,
        profiles!contacts_contact_user_id_fkey(
          username,
          avatar_url,
          is_online,
          last_seen
        )
      `)
      .eq('user_id', userId)
      .eq('is_registered', true);

    if (data) {
      setContacts(data.map((c: any) => ({
        id: c.id,
        contact_user_id: c.contact_user_id,
        username: c.profiles.username,
        avatar_url: c.profiles.avatar_url,
        is_online: c.profiles.is_online,
        last_seen: c.profiles.last_seen
      })));
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusText = (contact: Contact) => {
    if (contact.is_online) return 'Online';
    if (contact.last_seen) {
      return `Last seen ${formatDistanceToNow(new Date(contact.last_seen), { addSuffix: true })}`;
    }
    return 'Offline';
  };

  const handleContactClick = (contactUserId: string) => {
    onSelectContact(contactUserId);
    onOpenChange(false);
    setSearchQuery('');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
        <SheetHeader className="px-4 pt-6 pb-4 bg-gradient-to-br from-primary to-primary/80">
          <SheetTitle className="text-white text-xl">New Message</SheetTitle>
        </SheetHeader>

        {/* Search Bar */}
        <div className="px-4 py-3 bg-muted/30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-10 h-11 rounded-full bg-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Contacts List */}
        <div className="overflow-y-auto" style={{ height: 'calc(85vh - 140px)' }}>
          {filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p>No contacts found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredContacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleContactClick(contact.contact_user_id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors"
                >
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={contact.avatar_url || ''} />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {contact.username[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {contact.is_online && (
                      <div className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-foreground">{contact.username}</p>
                    <p className="text-sm text-muted-foreground">{getStatusText(contact)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
