import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Search, Phone, MessageCircle, UserPlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ContactsListProps {
  userId: string;
}

export function ContactsList({ userId }: ContactsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    // Mock contacts for demo
    const mockContacts = [
      {
        id: '1',
        name: 'Ammar',
        status: 'Online',
        phoneNumber: '+91 9774535200',
        onChatr: true,
        isOnline: true,
      },
      {
        id: '2',
        name: 'Sanobar',
        status: 'Last seen 5 m ago',
        phoneNumber: '+91 9876543210',
        onChatr: true,
        isOnline: false,
      },
      {
        id: '3',
        name: 'Gaurav',
        status: 'Last seen 1h ago',
        phoneNumber: '+91 1234567890',
        onChatr: true,
        isOnline: false,
      },
      {
        id: '4',
        name: 'John Doe',
        phoneNumber: '+91 2845 67890',
        onChatr: false,
      },
    ];

    setContacts(mockContacts);
  };

  const onChatrContacts = contacts.filter((c) => c.onChatr);
  const inviteContacts = contacts.filter((c) => !c.onChatr);

  const filteredOnChatr = onChatrContacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredInvite = inviteContacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const sendInvite = (contact: any, method: string) => {
    const message = encodeURIComponent('Hey! Join me on CHATR - https://chatr.chat');
    if (method === 'whatsapp') {
      window.open(`https://wa.me/${contact.phoneNumber.replace(/\D/g, '')}?text=${message}`, '_blank');
    } else if (method === 'sms') {
      window.location.href = `sms:${contact.phoneNumber}?body=${message}`;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted border-0"
          />
        </div>

        {/* On CHATR Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">On CHATR</h3>
            <Button variant="ghost" size="sm" className="text-primary">
              invite
            </Button>
          </div>

          <div className="space-y-2">
            {filteredOnChatr.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-accent/50 transition-colors"
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center text-2xl">
                    👤
                  </div>
                  {contact.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{contact.name}</div>
                  <div className="text-sm text-muted-foreground">{contact.status}</div>
                </div>
                <Button size="sm" variant="ghost" className="text-primary">
                  Chat
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* Invite Section */}
        {filteredInvite.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3">Invite to CHATR</h3>
            <div className="space-y-2">
              {filteredInvite.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-muted/50"
                >
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl">
                    👤
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{contact.name}</div>
                    <div className="text-sm text-muted-foreground">{contact.phoneNumber}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => sendInvite(contact, 'whatsapp')}
                      className="text-green-600"
                    >
                      WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => sendInvite(contact, 'sms')}
                    >
                      SMS
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2 pt-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
          >
            <Phone className="w-5 h-5 text-primary" />
            <span>Invite on WhatsApp</span>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
          >
            <UserPlus className="w-5 h-5 text-primary" />
            <span>Invite by SMS</span>
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-12"
          >
            <MessageCircle className="w-5 h-5 text-primary" />
            <span>Share link</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
