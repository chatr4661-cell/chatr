import React, { useEffect, useState } from 'react';
import { Search, Mic, ChevronRight, MessageCircle, Phone } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface ContactsListProps {
  userId: string;
}

interface Contact {
  id: string;
  contact_user_id: string;
  username: string;
  avatar_url: string | null;
  is_online: boolean;
  last_seen: string;
}

export function ContactsList({ userId }: ContactsListProps) {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadContacts();
  }, [userId]);

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

  const handleStartChat = async (contactUserId: string) => {
    // Find or create conversation
    const { data: existingConv } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (existingConv) {
      for (const conv of existingConv) {
        const { data: otherParticipant } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conv.conversation_id)
          .eq('user_id', contactUserId)
          .single();

        if (otherParticipant) {
          navigate(`/chat/${conv.conversation_id}`);
          return;
        }
      }
    }

    // Create new conversation
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({ created_by: userId })
      .select()
      .single();

    if (newConv) {
      await supabase.from('conversation_participants').insert([
        { conversation_id: newConv.id, user_id: userId },
        { conversation_id: newConv.id, user_id: contactUserId }
      ]);
      navigate(`/chat/${newConv.id}`);
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

  const handleInvite = (method: 'whatsapp' | 'sms') => {
    const message = encodeURIComponent('Join me on CHATR! Download: https://chatr.chat');
    if (method === 'whatsapp') {
      window.open(`https://wa.me/?text=${message}`, '_blank');
    } else {
      window.open(`sms:?body=${message}`, '_blank');
    }
  };

  return (
    <div className="h-full bg-white">
      {/* Header */}
      <div className="px-4 py-4" style={{ background: 'linear-gradient(135deg, hsl(263, 70%, 50%), hsl(263, 70%, 60%))' }}>
        <h1 className="text-2xl font-bold text-white mb-4">Contacts</h1>
        
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
          <Input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-xl"
          />
          <Mic className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
        </div>
      </div>

      <div className="p-4">
        {/* On CHATR Section */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">On CHATR</h2>
          <button className="text-sm font-medium text-[hsl(263,70%,50%)]">invite</button>
        </div>

        <div className="space-y-2 mb-6">
          {filteredContacts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchQuery ? 'No contacts found' : 'No contacts yet'}
            </div>
          ) : (
            filteredContacts.map((contact) => (
              <div key={contact.id} className="flex items-center gap-3 p-2">
                <div className="relative">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={contact.avatar_url || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                      {contact.username[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {contact.is_online && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full ring-2 ring-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{contact.username}</h3>
                  <p className="text-sm text-gray-600">{getStatusText(contact)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleStartChat(contact.contact_user_id)}
                    className="px-4 py-1.5 bg-[hsl(263,70%,50%)] text-white rounded-full text-sm font-medium hover:bg-[hsl(263,70%,45%)] transition-colors"
                  >
                    Chat
                  </button>
                  <button className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <Phone className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Invite Actions */}
        <div className="space-y-3 pt-4 border-t border-gray-100">
          <button
            onClick={() => handleInvite('whatsapp')}
            className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white">
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="font-medium text-gray-900">Invite on WhatsApp</span>
          </button>

          <button
            onClick={() => handleInvite('sms')}
            className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-gray-500 flex items-center justify-center text-white">
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="font-medium text-gray-900">Invite by SMS</span>
          </button>

          <button className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
            <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white text-lg">
              ⭐
            </div>
            <span className="font-medium text-gray-900">Share link</span>
          </button>
        </div>

        {/* Voice and Video Call Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <button className="py-3 bg-[hsl(263,70%,50%)] text-white rounded-full font-semibold">
            Voice Call
          </button>
          <button className="py-3 bg-[hsl(220,70%,50%)] text-white rounded-full font-semibold">
            Video Call
          </button>
        </div>
      </div>
    </div>
  );
}
