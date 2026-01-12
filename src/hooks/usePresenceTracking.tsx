import { useEffect, useState, useCallback, useRef } from 'react';
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
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Stable callback for checking online status
  const isUserOnline = useCallback((id: string) => {
    return onlineUsers.has(id);
  }, [onlineUsers]);

  useEffect(() => {
    if (!userId) return;

    // Prevent duplicate subscriptions
    if (isSubscribedRef.current) return;

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
        setOnlineUsers(prev => {
          const updated = new Set(prev);
          newPresences.forEach((presence: any) => {
            if (presence.user_id) {
              updated.add(presence.user_id);
            }
          });
          return updated;
        });
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('[Presence] User left:', key);
        // Add debounce for leave events to prevent flicker
        setTimeout(() => {
          setOnlineUsers(prev => {
            const updated = new Set(prev);
            leftPresences.forEach((presence: any) => {
              if (presence.user_id) {
                updated.delete(presence.user_id);
              }
            });
            return updated;
          });
        }, 2000); // 2 second grace period before marking offline
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
          await presenceChannel.track({
            user_id: userId,
            online_at: new Date().toISOString()
          });
        }
      });

    channelRef.current = presenceChannel;

    // Heartbeat to maintain presence - less aggressive
    heartbeatRef.current = setInterval(async () => {
      if (channelRef.current && isSubscribedRef.current) {
        try {
          await channelRef.current.track({
            user_id: userId,
            online_at: new Date().toISOString()
          });
        } catch (e) {
          // Ignore heartbeat errors
        }
      }
    }, 30000); // Every 30 seconds instead of 10

    // Update database status
    const updateStatus = async (isOnline: boolean) => {
      try {
        await supabase
          .from('profiles')
          .update({ is_online: isOnline, last_seen: new Date().toISOString() })
          .eq('id', userId);
      } catch (e) {
        // Ignore status update errors
      }
    };

    updateStatus(true);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Don't immediately mark offline on tab switch
        // The heartbeat will stop naturally if tab is closed
      } else {
        updateStatus(true);
        // Re-track presence when tab becomes visible
        if (channelRef.current && isSubscribedRef.current) {
          channelRef.current.track({
            user_id: userId,
            online_at: new Date().toISOString()
          });
        }
      }
    };

    const handleBeforeUnload = () => {
      updateStatus(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      updateStatus(false);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (channelRef.current) {
        isSubscribedRef.current = false;
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [userId]);

  return { onlineUsers, isUserOnline };
};
