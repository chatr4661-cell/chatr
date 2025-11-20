import React from 'react';
import { Search, Mic, ChevronRight, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ContactsListProps {
  userId: string;
}

const onChatrContacts = [
  { id: 1, name: 'Ammar', status: 'Online', avatar: '👤', color: 'bg-blue-500', online: true },
  { id: 2, name: 'Sanobar', status: 'Last seen 5 m ago', avatar: '👤', color: 'bg-purple-500', online: false },
  { id: 3, name: 'Gauray', status: 'Last seen 1h ago', avatar: '👤', color: 'bg-teal-400', online: false },
];

export function ContactsList({ userId }: ContactsListProps) {
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
          {onChatrContacts.map((contact) => (
            <div key={contact.id} className="flex items-center gap-3 p-2">
              <div className="relative">
                <div className={`w-12 h-12 rounded-full ${contact.color} flex items-center justify-center text-xl`}>
                  {contact.avatar}
                </div>
                {contact.online && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full ring-2 ring-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900">{contact.name}</h3>
                <p className="text-sm text-gray-600">{contact.status}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-4 py-1.5 bg-[hsl(263,70%,50%)] text-white rounded-full text-sm font-medium">
                  Chat
                </button>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          ))}
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
