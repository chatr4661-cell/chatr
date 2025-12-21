import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

export interface ChatConversation {
  id: string;
  name: string;
  avatar_url: string | null;
  lastMessage: string;
  lastMessageTime: string;
  is_online: boolean;
  unread_count: number;
  is_group: boolean;
}

export const useChatConversations = (userId: string) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    if (!userId) return;
    
    try {
      // Single optimized query to get all conversation data
      const { data: participantData, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner(
            id,
            is_group,
            group_name,
            group_icon_url,
            updated_at
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      if (!participantData?.length) {
        setConversations([]);
        setIsLoading(false);
        return;
      }

      const conversationIds = participantData.map(p => p.conversation_id);

      // Batch fetch all other participants
      const { data: allParticipants } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          user_id,
          profiles!inner(username, avatar_url, is_online)
        `)
        .in('conversation_id', conversationIds)
        .neq('user_id', userId);

      // Batch fetch all last messages
      const { data: allMessages } = await supabase
        .from('messages')
        .select('conversation_id, content, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false });

      // Group messages by conversation (first message is latest)
      const lastMessageMap = new Map<string, { content: string; created_at: string }>();
      allMessages?.forEach(msg => {
        if (!lastMessageMap.has(msg.conversation_id)) {
          lastMessageMap.set(msg.conversation_id, msg);
        }
      });

      // Group participants by conversation
      const participantMap = new Map<string, any>();
      allParticipants?.forEach(p => {
        if (!participantMap.has(p.conversation_id)) {
          participantMap.set(p.conversation_id, p.profiles);
        }
      });

      const conversationsData: ChatConversation[] = participantData.map((cp: any) => {
        const conv = cp.conversations;
        const otherUser = participantMap.get(conv.id);
        const lastMsg = lastMessageMap.get(conv.id);

        return {
          id: conv.id,
          name: conv.is_group ? conv.group_name : otherUser?.username || 'Unknown',
          avatar_url: conv.is_group ? conv.group_icon_url : otherUser?.avatar_url,
          lastMessage: lastMsg?.content || 'No messages yet',
          lastMessageTime: lastMsg?.created_at 
            ? formatDistanceToNow(new Date(lastMsg.created_at), { addSuffix: false }) 
            : '',
          is_online: otherUser?.is_online || false,
          unread_count: 0, // TODO: Implement proper unread count
          is_group: conv.is_group || false,
        };
      });

      // Sort by most recent message
      conversationsData.sort((a, b) => {
        const aTime = lastMessageMap.get(a.id)?.created_at || '';
        const bTime = lastMessageMap.get(b.id)?.created_at || '';
        return bTime.localeCompare(aTime);
      });

      setConversations(conversationsData);
    } catch (error) {
      console.error('[useChatConversations] Error loading:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('conversations-updates')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, () => {
        // Reload conversations when new message arrives
        loadConversations();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations',
      }, () => {
        loadConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadConversations]);

  return {
    conversations,
    isLoading,
    refresh: loadConversations,
  };
};
