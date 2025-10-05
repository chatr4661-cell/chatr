import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TypingIndicatorProps {
  conversationId: string | null;
  currentUserId: string;
}

export const TypingIndicator = ({ conversationId, currentUserId }: TypingIndicatorProps) => {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    // Don't set up subscription if conversationId is null or empty
    if (!conversationId || conversationId.trim() === '') return;
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          // Fetch current typing users
          const { data } = await supabase
            .from('typing_indicators')
            .select('user_id')
            .eq('conversation_id', conversationId)
            .neq('user_id', currentUserId)
            .gte('updated_at', new Date(Date.now() - 3000).toISOString()); // Last 3 seconds

          if (data && data.length > 0) {
            // Fetch usernames separately
            const userIds = data.map(d => d.user_id);
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, username')
              .in('id', userIds);
            
            const usernameMap = new Map(profiles?.map(p => [p.id, p.username]) || []);
            setTypingUsers(data.map(d => usernameMap.get(d.user_id) || 'Someone'));
          } else {
            setTypingUsers([]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId]);

  if (typingUsers.length === 0) return null;

  return (
    <div className="px-4 py-2 text-sm text-muted-foreground italic">
      {typingUsers.length === 1 && `${typingUsers[0]} is typing...`}
      {typingUsers.length === 2 && `${typingUsers[0]} and ${typingUsers[1]} are typing...`}
      {typingUsers.length > 2 && `${typingUsers.length} people are typing...`}
    </div>
  );
};

export const setTypingStatus = async (conversationId: string, userId: string, isTyping: boolean) => {
  // Validate inputs to prevent UUID errors
  if (!conversationId || !userId || conversationId.trim() === '' || userId.trim() === '') {
    console.warn('Invalid conversationId or userId for typing status');
    return;
  }

  try {
    if (isTyping) {
      await supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: userId,
          updated_at: new Date().toISOString()
        });
    } else {
      await supabase
        .from('typing_indicators')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
    }
  } catch (error) {
    console.error('Error setting typing status:', error);
  }
};
