import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type?: string | null;
  media_url?: string | null;
  media_attachments?: any;
  created_at: string;
  read_at?: string | null;
  status?: string | null;
  reactions?: any;
  is_starred?: boolean;
}

const MESSAGES_PER_PAGE = 30;
const MAX_MESSAGES_IN_MEMORY = 100;

export const useVirtualizedMessages = (conversationId: string | null, userId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);
  const oldestMessageTimestamp = useRef<string | null>(null);

  // Load initial messages (most recent 30)
  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (error) throw error;
      
      const reversedMessages = (data || []).reverse();
      setMessages(reversedMessages);
      
      if (data && data.length > 0) {
        oldestMessageTimestamp.current = data[data.length - 1].created_at;
      }
      
      setHasMore(data && data.length === MESSAGES_PER_PAGE);
    } catch (error) {
      console.error('[useVirtualizedMessages] Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // Load older messages (pagination)
  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || !oldestMessageTimestamp.current || !hasMore || isLoading) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .lt('created_at', oldestMessageTimestamp.current)
        .order('created_at', { ascending: false })
        .limit(MESSAGES_PER_PAGE);

      if (error) throw error;
      
      if (data && data.length > 0) {
        const reversedMessages = data.reverse();
        setMessages(prev => {
          const combined = [...reversedMessages, ...prev];
          // Keep only last 100 messages in memory (like WhatsApp)
          return combined.slice(-MAX_MESSAGES_IN_MEMORY);
        });
        
        oldestMessageTimestamp.current = data[data.length - 1].created_at;
        setHasMore(data.length === MESSAGES_PER_PAGE);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('[useVirtualizedMessages] Error loading older messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, hasMore, isLoading]);

  // Send message with optimistic UI
  const sendMessage = useCallback(async (
    content: string, 
    type: string = 'text',
    mediaAttachments?: any[]
  ) => {
    if (!conversationId || !userId || !content.trim()) return;
    
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: userId,
      content: content.trim(),
      message_type: type,
      created_at: new Date().toISOString(),
      status: 'sending',
      media_attachments: mediaAttachments || []
    };
    
    // Add optimistically (instant UI update like WhatsApp)
    setMessages(prev => [...prev, optimisticMessage]);
    setSending(true);
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: content.trim(),
          message_type: type,
          media_attachments: mediaAttachments || []
        })
        .select()
        .single();

      if (error) throw error;
      
      // Replace temp message with real one
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? data : msg
      ));
    } catch (error) {
      console.error('[useVirtualizedMessages] Error sending message:', error);
      // Mark as failed
      setMessages(prev => prev.map(msg =>
        msg.id === tempId ? { ...msg, status: 'failed' } : msg
      ));
      throw error;
    } finally {
      setSending(false);
    }
  }, [conversationId, userId]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('[useVirtualizedMessages] Error deleting message:', error);
      throw error;
    }
  }, [userId]);

  // Edit message
  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ content: newContent, is_edited: true })
        .eq('id', messageId)
        .eq('sender_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('[useVirtualizedMessages] Error editing message:', error);
      throw error;
    }
  }, [userId]);

  // React to message
  const reactToMessage = useCallback(async (messageId: string, emoji: string) => {
    try {
      const { data: message } = await supabase
        .from('messages')
        .select('reactions')
        .eq('id', messageId)
        .single();
      
      if (!message) return;

      const reactions: Record<string, string[]> = (message.reactions as any) || {};
      const userReactions = reactions[userId] || [];
      
      const newReactions = userReactions.includes(emoji)
        ? userReactions.filter((e: string) => e !== emoji)
        : [...userReactions, emoji];

      const updatedReactions = { ...reactions, [userId]: newReactions };

      const { error } = await supabase
        .from('messages')
        .update({ reactions: updatedReactions as any })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('[useVirtualizedMessages] Error reacting to message:', error);
      throw error;
    }
  }, [userId]);

  // Mark messages as read when viewing conversation
  useEffect(() => {
    if (!conversationId || !userId) return;
    
    const markMessagesRead = async () => {
      try {
        // Mark all unread messages from other users as read
        const { error } = await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .neq('sender_id', userId)
          .is('read_at', null);
        
        if (error) {
          console.error('[Mark Read] Error:', error);
        }
      } catch (error) {
        console.error('[Mark Read] Failed:', error);
      }
    };
    
    // Mark as read after a short delay
    const timer = setTimeout(markMessagesRead, 500);
    return () => clearTimeout(timer);
  }, [conversationId, userId]);

  // Aggressive real-time subscriptions (instant like WhatsApp)
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: userId }
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        const newMessage = payload.new as Message;
        // Instant update - no batching
        setMessages(prev => {
          // Prevent duplicates
          if (prev.some(m => m.id === newMessage.id)) return prev;
          const updated = [...prev, newMessage];
          return updated.slice(-MAX_MESSAGES_IN_MEMORY);
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        // Instant update for read receipts and edits
        setMessages(prev => prev.map(m => 
          m.id === payload.new.id ? { ...m, ...(payload.new as Message) } : m
        ));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Real-time] ✅ Connected to message stream');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[Real-time] ❌ Channel error');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, userId]);

  // Load messages on conversation change
  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  return {
    messages,
    isLoading,
    hasMore,
    sending,
    sendMessage,
    loadMessages,
    loadOlderMessages,
    deleteMessage,
    editMessage,
    reactToMessage
  };
};

