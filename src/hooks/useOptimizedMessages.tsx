import React, { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const updateQueueRef = useRef<Message[]>([]);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Batch real-time updates to reduce re-renders
  const batchUpdate = useCallback((newMessage: Message) => {
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

  // Load messages with pagination
  const loadMessages = useCallback(async (offset = 0, limit = 50) => {
    if (!conversationId || limit <= 0) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, sender_id, conversation_id, created_at, message_type, media_url, read_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;

      if (data) {
        const formattedMessages = data.map(msg => ({
          ...msg,
          status: 'sent' as const
        }));
        
        setMessages(formattedMessages);
        setHasMore(data.length === limit);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setIsLoading(false);
    }
  }, [conversationId]);

  // Optimistic message send
  const sendMessage = useCallback(async (content: string, type?: string, mediaUrl?: string) => {
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
  useEffect(() => {
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
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [conversationId, userId, batchUpdate]);

  return { messages, sendMessage, loadMessages, isLoading, hasMore };
};
