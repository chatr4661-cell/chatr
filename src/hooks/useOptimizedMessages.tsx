import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useOfflineQueue } from './useOfflineQueue';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  created_at: string;
  message_type?: string;
  media_url?: string;
  read_at?: string;
  status?: 'sending' | 'sent' | 'failed';
  tempId?: string;
}

export const useOptimizedMessages = (conversationId: string | null, userId: string) => {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);
  const [typingUsers, setTypingUsers] = React.useState<string[]>([]);
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const updateQueueRef = React.useRef<Message[]>([]);
  const updateTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const { queueMessage, isOnline } = useOfflineQueue();

  // Batch real-time updates to reduce re-renders
  const batchUpdate = React.useCallback((newMessage: Message) => {
    updateQueueRef.current.push(newMessage);
    
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      if (updateQueueRef.current.length > 0) {
        setMessages(prev => {
          const newMessages = [...prev];
          updateQueueRef.current.forEach(msg => {
            const existingIndex = newMessages.findIndex(m => m.id === msg.id);
            if (existingIndex >= 0) {
              newMessages[existingIndex] = msg;
            } else {
              newMessages.push(msg);
            }
          });
          updateQueueRef.current = [];
          return newMessages.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        });
      }
    }, 100); // Batch updates within 100ms
  }, []);

  // Load messages with pagination - optimized with range queries
  const loadMessages = React.useCallback(async (limit = 50, offset = 0) => {
    if (!conversationId || limit <= 0) return;

    setIsLoading(true);
    try {
      // Use range for better performance with indexes
      const { data, error, count } = await supabase
        .from('messages')
        .select('id, content, sender_id, conversation_id, created_at, message_type, media_url, read_at', { count: 'exact' })
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      if (data) {
        const formattedMessages = data.reverse().map(msg => ({
          ...msg,
          status: 'sent' as const
        }));
        
        if (offset === 0) {
          setMessages(formattedMessages);
        } else {
          setMessages(prev => [...formattedMessages, ...prev]);
        }
        
        setHasMore((count || 0) > offset + limit);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // Optimistic message send
  const sendMessage = React.useCallback(async (content: string, type?: string, mediaUrl?: string) => {
    if (!conversationId || !userId) return;

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage: Message = {
      id: tempId,
      tempId,
      content,
      sender_id: userId,
      conversation_id: conversationId,
      created_at: new Date().toISOString(),
      message_type: type || 'text',
      media_url: mediaUrl,
      status: 'sending'
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content,
          message_type: type || 'text',
          media_url: mediaUrl
        })
        .select()
        .single();

      if (error) throw error;

      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId ? { ...data, status: 'sent' } : msg
      ));
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.map(msg =>
        msg.tempId === tempId ? { ...msg, status: 'failed' } : msg
      ));
      throw error;
    }
  }, [conversationId, userId]);

  // Subscribe to real-time updates
  React.useEffect(() => {
    if (!conversationId) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // Only add if from another user (our own are optimistically added)
          if (newMessage.sender_id !== userId) {
            batchUpdate({ ...newMessage, status: 'sent' });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          batchUpdate(payload.new as Message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${conversationId}`
        },
        async () => {
          // Load typing users
          const { data } = await supabase
            .from('typing_indicators')
            .select('user_id, profiles!inner(username)')
            .eq('conversation_id', conversationId)
            .neq('user_id', userId)
            .gte('updated_at', new Date(Date.now() - 3000).toISOString());

          setTypingUsers(data?.map((d: any) => d.profiles.username) || []);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [conversationId, userId, batchUpdate]);

  // Set typing status
  const setTyping = React.useCallback(async (isTyping: boolean) => {
    if (!conversationId || !userId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      await supabase
        .from('typing_indicators')
        .upsert({
          conversation_id: conversationId,
          user_id: userId,
          updated_at: new Date().toISOString()
        });

      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 3000);
    } else {
      await supabase
        .from('typing_indicators')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);
    }
  }, [conversationId, userId]);

  // Edit message
  const editMessage = React.useCallback(async (messageId: string, newContent: string) => {
    if (!conversationId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({
          content: newContent,
          is_edited: true,
          edited_at: new Date().toISOString()
        })
        .eq('id', messageId)
        .eq('sender_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Edit message error:', error);
      throw error;
    }
  }, [conversationId, userId]);

  // Delete message
  const deleteMessage = React.useCallback(async (messageId: string, deleteForEveryone: boolean = false) => {
    if (!conversationId) return;

    try {
      if (deleteForEveryone) {
        const { error } = await supabase
          .from('messages')
          .update({
            is_deleted: true,
            deleted_at: new Date().toISOString(),
            content: 'This message was deleted'
          })
          .eq('id', messageId)
          .eq('sender_id', userId);

        if (error) throw error;
      } else {
        // Just remove from local state (delete for me)
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch (error) {
      console.error('Delete message error:', error);
      throw error;
    }
  }, [conversationId, userId]);

  // React to message
  const reactToMessage = React.useCallback(async (messageId: string, emoji: string) => {
    if (!conversationId || !userId) return;

    try {
      const message = messages.find(m => m.id === messageId);
      if (!message) return;

      const reactions = (message as any).reactions || {};
      const userReactions = reactions[emoji] || [];
      
      let newReactions;
      if (userReactions.includes(userId)) {
        // Remove reaction
        newReactions = {
          ...reactions,
          [emoji]: userReactions.filter((id: string) => id !== userId)
        };
        if (newReactions[emoji].length === 0) {
          delete newReactions[emoji];
        }
      } else {
        // Add reaction
        newReactions = {
          ...reactions,
          [emoji]: [...userReactions, userId]
        };
      }

      const { error } = await supabase
        .from('messages')
        .update({ reactions: newReactions })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('React to message error:', error);
      throw error;
    }
  }, [conversationId, userId, messages]);

  // Star/unstar message
  const toggleStar = React.useCallback(async (messageId: string, isStarred: boolean) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_starred: !isStarred })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Toggle star error:', error);
      throw error;
    }
  }, []);

  return { 
    messages, 
    sendMessage, 
    loadMessages, 
    isLoading, 
    hasMore,
    typingUsers,
    setTyping,
    editMessage,
    deleteMessage,
    reactToMessage,
    toggleStar
  };
};
