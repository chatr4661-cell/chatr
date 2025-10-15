import { useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OptimisticMessage {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  created_at: string;
  status?: 'sending' | 'sent' | 'failed';
  is_optimistic?: boolean;
  [key: string]: any; // Allow additional properties from real messages
}

export const useOptimisticChat = (conversationId: string | null, userId: string) => {
  const [messages, setMessages] = useState<OptimisticMessage[]>([]);
  const sendQueueRef = useRef<Map<string, OptimisticMessage>>(new Map());

  // Instantly add message to UI, then send to backend
  const sendMessageOptimistic = useCallback(async (content: string, replyToId?: string) => {
    if (!conversationId) return;

    const tempId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMsg: OptimisticMessage = {
      id: tempId,
      content,
      sender_id: userId,
      conversation_id: conversationId,
      created_at: new Date().toISOString(),
      status: 'sending',
      is_optimistic: true,
    };

    // Instantly add to UI
    setMessages(prev => [...prev, optimisticMsg]);
    sendQueueRef.current.set(tempId, optimisticMsg);

    try {
      // Send to backend
      const { data, error } = await supabase
        .from('messages')
        .insert({
          content,
          sender_id: userId,
          conversation_id: conversationId,
          reply_to_id: replyToId,
        })
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic message with real one
      setMessages(prev => 
        prev.map(msg => msg.id === tempId ? { ...data, status: 'sent' } : msg)
      );
      sendQueueRef.current.delete(tempId);
    } catch (error) {
      console.error('Failed to send message:', error);
      
      // Mark as failed
      setMessages(prev =>
        prev.map(msg => msg.id === tempId ? { ...msg, status: 'failed' } : msg)
      );
      
      toast.error('Failed to send message', {
        action: {
          label: 'Retry',
          onClick: () => retryMessage(tempId, content, replyToId),
        },
      });
    }
  }, [conversationId, userId]);

  const retryMessage = useCallback(async (tempId: string, content: string, replyToId?: string) => {
    // Remove failed message
    setMessages(prev => prev.filter(msg => msg.id !== tempId));
    sendQueueRef.current.delete(tempId);
    
    // Resend
    await sendMessageOptimistic(content, replyToId);
  }, [sendMessageOptimistic]);

  // Optimistic delete
  const deleteMessageOptimistic = useCallback(async (messageId: string) => {
    // Instantly remove from UI
    const originalMessages = [...messages];
    setMessages(prev => prev.filter(msg => msg.id !== messageId));

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to delete message:', error);
      // Restore on error
      setMessages(originalMessages);
      toast.error('Failed to delete message');
    }
  }, [messages]);

  // Optimistic edit
  const editMessageOptimistic = useCallback(async (messageId: string, newContent: string) => {
    const originalMessages = [...messages];
    
    // Instantly update UI
    setMessages(prev =>
      prev.map(msg => msg.id === messageId ? { ...msg, content: newContent } : msg)
    );

    try {
      const { error } = await supabase
        .from('messages')
        .update({ content: newContent, edited_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to edit message:', error);
      // Restore on error
      setMessages(originalMessages);
      toast.error('Failed to edit message');
    }
  }, [messages]);

  return {
    messages,
    setMessages,
    sendMessageOptimistic,
    deleteMessageOptimistic,
    editMessageOptimistic,
  };
};
