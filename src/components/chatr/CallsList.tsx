import React from 'react';
import { Phone, Video, PhoneMissed } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CallsListProps {
  userId: string;
}

export function CallsList({ userId }: CallsListProps) {
  const calls = [
    {
      id: '1',
      name: 'Ammar',
      type: 'video',
      missed: false,
      timestamp: new Date(Date.now() - 7200000),
      duration: '12:34',
    },
    {
      id: '2',
      name: 'Sanobar',
      type: 'voice',
      missed: true,
      timestamp: new Date(Date.now() - 14400000),
    },
    {
      id: '3',
      name: 'Gaurav',
      type: 'voice',
      missed: false,
      timestamp: new Date(Date.now() - 86400000),
      duration: '05:23',
    },
  ];

  return (
    <div className="p-4 space-y-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Calls</h2>
        <div className="flex gap-2">
          <button className="p-2 rounded-full bg-primary/10 text-primary">
            <Phone className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-full bg-primary/10 text-primary">
            <Video className="w-5 h-5" />
          </button>
        </div>
      </div>

      {calls.map((call) => (
        <div
          key={call.id}
          className="flex items-center gap-3 p-3 rounded-2xl hover:bg-accent/50 transition-colors cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary-glow/20 flex items-center justify-center text-2xl">
            👤
          </div>
          <div className="flex-1">
            <div className={`font-semibold ${call.missed ? 'text-destructive' : ''}`}>
              {call.name}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {call.missed ? (
                <PhoneMissed className="w-4 h-4 text-destructive" />
              ) : call.type === 'video' ? (
                <Video className="w-4 h-4" />
              ) : (
                <Phone className="w-4 h-4" />
              )}
              <span>{formatDistanceToNow(call.timestamp, { addSuffix: true })}</span>
              {call.duration && <span>• {call.duration}</span>}
            </div>
          </div>
          {call.type === 'video' ? (
            <Video className="w-5 h-5 text-primary" />
          ) : (
            <Phone className="w-5 h-5 text-primary" />
          )}
        </div>
      ))}
    </div>
  );
}
