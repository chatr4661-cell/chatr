import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Message {
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
}

export const useReliableMessages = (conversationId: string | null, userId: string) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Load messages from database
  const loadMessages = async () => {
    if (!conversationId) return;
    
    setIsLoading(true);
    console.log('[useReliableMessages] Loading messages for conversation:', conversationId);
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      console.log('[useReliableMessages] Loaded messages:', data?.length || 0);
      setMessages(data as Message[] || []);
    } catch (error) {
      console.error('[useReliableMessages] Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Send message - waits for DB confirmation
  const sendMessage = async (
    content: string, 
    type: string = 'text',
    mediaAttachments?: any[]
  ) => {
    if (!conversationId || !userId || !content.trim()) return;
    
    setSending(true);
    console.log('[useReliableMessages] Sending message:', { content, type, mediaAttachments });
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: content.trim(),
          message_type: type,
          media_attachments: mediaAttachments || []
        });

      if (error) throw error;
      console.log('[useReliableMessages] Message sent successfully');
    } catch (error) {
      console.error('[useReliableMessages] Error sending message:', error);
      throw error;
    } finally {
      setSending(false);
    }
  };

  // Set typing indicator
  const setTyping = async (isTyping: boolean) => {
    if (!conversationId || !userId) return;

    try {
      if (isTyping) {
        await supabase
          .from('typing_indicators')
          .upsert({
            conversation_id: conversationId,
            user_id: userId,
            is_typing: true
          });
      } else {
        await supabase
          .from('typing_indicators')
          .delete()
          .eq('conversation_id', conversationId)
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('[useReliableMessages] Error setting typing indicator:', error);
    }
  };

  // Edit message
  const editMessage = async (messageId: string, newContent: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ content: newContent })
        .eq('id', messageId)
        .eq('sender_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('[useReliableMessages] Error editing message:', error);
    }
  };

  // Delete message
  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('[useReliableMessages] Error deleting message:', error);
    }
  };

  // React to message
  const reactToMessage = async (messageId: string, emoji: string) => {
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
      console.error('[useReliableMessages] Error reacting to message:', error);
    }
  };

  // Load messages on conversation change
  useEffect(() => {
    loadMessages();
  }, [conversationId]);

  // Realtime subscriptions
  useEffect(() => {
    if (!conversationId) return;

    console.log('[useReliableMessages] Setting up realtime for conversation:', conversationId);

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        console.log('[useReliableMessages] New message received:', payload.new);
        setMessages(prev => {
          if (prev.some(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new as Message];
        });
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        console.log('[useReliableMessages] Message updated:', payload.new);
        setMessages(prev => prev.map(m => 
          m.id === payload.new.id ? payload.new as Message : m
        ));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        console.log('[useReliableMessages] Message deleted:', payload.old);
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      console.log('[useReliableMessages] Cleaning up realtime subscriptions');
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  return {
    messages,
    isLoading,
    sending,
    typingUsers,
    sendMessage,
    loadMessages,
    setTyping,
    editMessage,
    deleteMessage,
    reactToMessage
  };
};
