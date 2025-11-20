import React from 'react';
import { Phone, Video, PhoneMissed } from 'lucide-react';

interface CallsListProps {
  userId: string;
}

const calls = [
  { id: 1, name: 'Ammar', type: 'voice', status: 'missed', time: '10:30 AM', avatar: '👤', color: 'bg-blue-500' },
  { id: 2, name: 'Sanobar', type: 'video', status: 'outgoing', time: 'Yesterday', avatar: '👤', color: 'bg-purple-500' },
  { id: 3, name: 'Gauray', type: 'voice', status: 'incoming', time: '2 days ago', avatar: '👤', color: 'bg-teal-400' },
];

export function CallsList({ userId }: CallsListProps) {
  return (
    <div className="h-full bg-white">
      {/* Header */}
      <div className="px-4 py-6" style={{ background: 'linear-gradient(135deg, hsl(263, 70%, 50%), hsl(263, 70%, 60%))' }}>
        <h1 className="text-2xl font-bold text-white">Calls</h1>
      </div>

      <div className="p-4 space-y-3">
        {calls.map((call) => (
          <div key={call.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className={`w-12 h-12 rounded-full ${call.color} flex items-center justify-center text-xl`}>
              {call.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900">{call.name}</h3>
              <div className="flex items-center gap-2 text-sm">
                {call.status === 'missed' && (
                  <PhoneMissed className="w-4 h-4 text-red-500" />
                )}
                {call.type === 'video' ? (
                  <Video className="w-4 h-4 text-gray-500" />
                ) : (
                  <Phone className="w-4 h-4 text-gray-500" />
                )}
                <span className="text-gray-600 capitalize">{call.status}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">{call.time}</p>
              <button className="mt-1">
                {call.type === 'video' ? (
                  <Video className="w-5 h-5 text-[hsl(263,70%,50%)]" />
                ) : (
                  <Phone className="w-5 h-5 text-[hsl(263,70%,50%)]" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="fixed bottom-20 right-4">
        <button className="w-14 h-14 rounded-full bg-[hsl(263,70%,50%)] text-white shadow-lg flex items-center justify-center">
          <Phone className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
