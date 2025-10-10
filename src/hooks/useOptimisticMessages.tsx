import React, { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface OptimisticMessage {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  created_at: string;
  status: 'sending' | 'sent' | 'failed';
  tempId?: string;
}

export const useOptimisticMessages = (conversationId: string | null, userId: string) => {
  const [messages, setMessages] = useState<OptimisticMessage[]>([]);
  const messageQueue = useRef<Map<string, OptimisticMessage>>(new Map());

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || !userId) return;

    // Generate temp ID for optimistic update
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMessage: OptimisticMessage = {
      id: tempId,
      tempId,
      content,
      sender_id: userId,
      conversation_id: conversationId,
      created_at: new Date().toISOString(),
      status: 'sending'
    };

    // Instantly show message
    setMessages(prev => [...prev, optimisticMessage]);
    messageQueue.current.set(tempId, optimisticMessage);

    try {
      // Send to server in background
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content,
          message_type: 'text'
        })
        .select()
        .single();

      if (error) throw error;

      // Replace temp message with real one
      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId ? { ...data, status: 'sent' } : msg
      ));
      messageQueue.current.delete(tempId);
    } catch (error) {
      console.error('Failed to send message:', error);
      // Mark as failed
      setMessages(prev => prev.map(msg =>
        msg.tempId === tempId ? { ...msg, status: 'failed' } : msg
      ));
    }
  }, [conversationId, userId]);

  const loadMessages = useCallback(async (limit = 50, offset = 0) => {
    if (!conversationId) return;

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (!error && data) {
      const formattedMessages = data.reverse().map(msg => ({
        ...msg,
        status: 'sent' as const
      }));
      
      if (offset === 0) {
        setMessages(formattedMessages);
      } else {
        setMessages(prev => [...formattedMessages, ...prev]);
      }
    }
  }, [conversationId]);

  return { messages, sendMessage, loadMessages, setMessages };
};
