import React from 'react';
import { ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChatsListProps {
  userId: string;
}

const stories = [
  { id: 1, name: 'Chats', avatar: '💬', color: 'bg-purple-500' },
  { id: 2, name: 'Arshel', avatar: '👤', color: 'bg-blue-500' },
  { id: 3, name: 'Ammar', avatar: '👤', color: 'bg-blue-400' },
  { id: 4, name: 'Sana', avatar: '👤', color: 'bg-teal-400' },
  { id: 5, name: 'Gatay', avatar: '👤', color: 'bg-cyan-400' },
];

const scortes = [
  { id: 1, name: 'Ammar', status: 'Online', avatar: '👤', color: 'bg-purple-500', online: true },
  { id: 2, name: 'Sanoaar', status: 'Online', time: '05:05', avatar: '👤', color: 'bg-purple-600', online: true },
  { id: 3, name: 'Ag go', status: 'Last seen 5 m ago', time: '20:02', avatar: '👤', color: 'bg-cyan-400', online: false },
];

export function ChatsList({ userId }: ChatsListProps) {
  const navigate = useNavigate();

  return (
    <div className="h-full" style={{ background: 'linear-gradient(180deg, hsl(263, 70%, 50%) 0%, hsl(263, 70%, 55%) 30%, hsl(0, 0%, 98%) 30%)' }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">CHATR</h1>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-xl">👤</span>
          </div>
        </div>

        {/* Stories Bar */}
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {stories.map((story) => (
            <div key={story.id} className="flex flex-col items-center min-w-[60px]">
              <div className={`w-14 h-14 rounded-full ${story.color} flex items-center justify-center text-2xl mb-1 ring-2 ring-white`}>
                {story.avatar}
              </div>
              <span className="text-white text-xs font-medium truncate w-full text-center">{story.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Scortes Section */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-lg">Scortes</h2>
          <div className="w-2 h-2 rounded-full bg-gray-400" />
        </div>
        
        <div className="bg-white/95 rounded-3xl shadow-lg">
          {scortes.map((chat, idx) => (
            <div
              key={chat.id}
              onClick={() => navigate(`/chat/${chat.id}`)}
              className={`flex items-center gap-3 p-3 ${idx !== scortes.length - 1 ? 'border-b border-gray-100' : ''} active:bg-gray-50 cursor-pointer`}
            >
              <div className="relative">
                <div className={`w-12 h-12 rounded-full ${chat.color} flex items-center justify-center text-xl`}>
                  {chat.avatar}
                </div>
                {chat.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full ring-2 ring-white" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-900">{chat.name}</span>
                  {chat.time && <span className="text-xs text-gray-500">{chat.time}</span>}
                </div>
                <p className="text-sm text-gray-600">{chat.status}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          ))}
        </div>
      </div>

      {/* CHATR Updates */}
      <div className="px-4 pb-20">
        <h2 className="font-semibold text-gray-700 mb-3">CHATR Updates</h2>
        <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-xl">
              C
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">CHATR Updates</h3>
              <p className="text-sm text-gray-600">New features and announcements</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
