import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface PresenceState {
  [key: string]: {
    user_id: string;
    online_at: string;
  }[];
}

export const usePresenceTracking = (userId: string | undefined) => {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userId) return;

    const presenceChannel = supabase.channel('online-users', {
      config: {
        presence: { key: userId }
      }
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state: PresenceState = presenceChannel.presenceState();
        const users = new Set<string>();
        
        Object.values(state).forEach(presences => {
          presences.forEach(presence => {
            if (presence.user_id) {
              users.add(presence.user_id);
            }
          });
        });
        
        setOnlineUsers(users);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('[Presence] User joined:', key);
        newPresences.forEach((presence: any) => {
          if (presence.user_id) {
            setOnlineUsers(prev => new Set(prev).add(presence.user_id));
          }
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[Presence] User left:', key);
        leftPresences.forEach((presence: any) => {
          if (presence.user_id) {
            setOnlineUsers(prev => {
              const updated = new Set(prev);
              updated.delete(presence.user_id);
              return updated;
            });
          }
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            user_id: userId,
            online_at: new Date().toISOString()
          });
        }
      });

    setChannel(presenceChannel);

    const heartbeat = setInterval(async () => {
      if (presenceChannel) {
        await presenceChannel.track({
          user_id: userId,
          online_at: new Date().toISOString()
        });
      }
    }, 10000);

    const updateStatus = async (isOnline: boolean) => {
      await supabase
        .from('profiles')
        .update({ is_online: isOnline, last_seen: new Date().toISOString() })
        .eq('id', userId);
    };

    updateStatus(true);

    const handleVisibilityChange = () => {
      updateStatus(!document.hidden);
    };

    const handleBeforeUnload = () => {
      updateStatus(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(heartbeat);
      updateStatus(false);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (presenceChannel) {
        supabase.removeChannel(presenceChannel);
      }
    };
  }, [userId]);

  return { onlineUsers, isUserOnline: (id: string) => onlineUsers.has(id) };
};
