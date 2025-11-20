import React, { useEffect, useState } from 'react';
import { Phone, Video, PhoneMissed } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface CallsListProps {
  userId: string;
}

interface Call {
  id: string;
  caller_id: string;
  receiver_id: string | null;
  call_type: string;
  status: string;
  missed: boolean;
  created_at: string;
  caller_name: string | null;
  caller_avatar: string | null;
  receiver_name: string | null;
  receiver_avatar: string | null;
}

export function CallsList({ userId }: CallsListProps) {
  const [calls, setCalls] = useState<Call[]>([]);

  useEffect(() => {
    loadCalls();
  }, [userId]);

  const loadCalls = async () => {
    const { data } = await supabase
      .from('calls')
      .select('*')
      .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setCalls(data);
    }
  };
  return (
    <div className="h-full bg-white">
      {/* Header */}
      <div className="px-4 py-6" style={{ background: 'linear-gradient(135deg, hsl(263, 70%, 50%), hsl(263, 70%, 60%))' }}>
        <h1 className="text-2xl font-bold text-white">Calls</h1>
      </div>

      <div className="p-4 space-y-3">
        {calls.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No call history
          </div>
        ) : (
          calls.map((call) => {
            const isOutgoing = call.caller_id === userId;
            const otherName = isOutgoing ? call.receiver_name : call.caller_name;
            const otherAvatar = isOutgoing ? call.receiver_avatar : call.caller_avatar;
            
            return (
              <div key={call.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={otherAvatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                    {otherName?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900">{otherName || 'Unknown'}</h3>
                  <div className="flex items-center gap-2 text-sm">
                    {call.missed && (
                      <PhoneMissed className="w-4 h-4 text-red-500" />
                    )}
                    {call.call_type === 'video' ? (
                      <Video className="w-4 h-4 text-gray-500" />
                    ) : (
                      <Phone className="w-4 h-4 text-gray-500" />
                    )}
                    <span className="text-gray-600 capitalize">
                      {call.missed ? 'Missed' : isOutgoing ? 'Outgoing' : 'Incoming'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                  </p>
                  <button className="mt-1">
                    {call.call_type === 'video' ? (
                      <Video className="w-5 h-5 text-[hsl(263,70%,50%)]" />
                    ) : (
                      <Phone className="w-5 h-5 text-[hsl(263,70%,50%)]" />
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
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
