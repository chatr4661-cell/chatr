import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TypingIndicatorProps {
  conversationId: string;
  currentUserId: string;
}

export const TypingIndicator = ({ conversationId, currentUserId }: TypingIndicatorProps) => {
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
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
            .select('user_id, profiles(username)')
            .eq('conversation_id', conversationId)
            .neq('user_id', currentUserId)
            .gte('updated_at', new Date(Date.now() - 3000).toISOString()); // Last 3 seconds

          if (data) {
            setTypingUsers(data.map((d: any) => d.profiles?.username || 'Someone'));
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
};
