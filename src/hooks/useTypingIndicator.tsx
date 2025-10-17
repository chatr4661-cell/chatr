import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTypingIndicator = (conversationId: string | null, userId: string) => {
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase.channel(`typing:${conversationId}`, {
      config: { broadcast: { self: false } }
    });

    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId !== userId) {
          setTypingUsers(prev => {
            const updated = new Set(prev);
            updated.add(payload.userId);
            return updated;
          });

          setTimeout(() => {
            setTypingUsers(prev => {
              const updated = new Set(prev);
              updated.delete(payload.userId);
              return updated;
            });
          }, 3000);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  const setTyping = (isTyping: boolean) => {
    if (!conversationId) return;

    const channel = supabase.channel(`typing:${conversationId}`);
    
    if (isTyping) {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, timestamp: Date.now() }
      });
    }
  };

  return { typingUsers, setTyping };
};
