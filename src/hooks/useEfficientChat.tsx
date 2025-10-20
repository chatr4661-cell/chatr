/**
 * Efficient Chat Hook
 * Optimized message handling with batching, caching, and forwarding support
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cacheMessages, getCachedMessages, cacheConversation, getCachedConversation } from '@/services/cacheService';
import { uploadMedia } from '@/services/storageService';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  created_at: string;
  media_url?: string;
  media_thumbnail_url?: string;
  forwarded_from?: string;
  original_message_id?: string;
}

interface UseEfficientChatOptions {
  conversationId: string;
  userId: string;
  messagesPerPage?: number;
  enableCache?: boolean;
}

export const useEfficientChat = ({
  conversationId,
  userId,
  messagesPerPage = 30,
  enableCache = true,
}: UseEfficientChatOptions) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [sending, setSending] = useState(false);
  
  const batchQueueRef = useRef<Message[]>([]);
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load messages with caching
   */
  const loadMessages = useCallback(async (fromCache = true) => {
    try {
      // Try cache first
      if (fromCache && enableCache) {
        const cached = await getCachedMessages(conversationId);
        if (cached.length > 0) {
          setMessages(cached);
          setLoading(false);
          // Continue loading fresh data in background
        }
      }

      // Load from database
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(messagesPerPage);

      if (error) throw error;

      const sortedData = (data || []).reverse();
      setMessages(sortedData);
      setHasMore(data?.length === messagesPerPage);

      // Cache the messages
      if (enableCache && data) {
        await cacheMessages(conversationId, data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId, messagesPerPage, enableCache]);

  /**
   * Load older messages (pagination)
   */
  const loadOlder = useCallback(async () => {
    if (!hasMore || messages.length === 0) return;

    const oldestMessage = messages[0];
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .lt('created_at', oldestMessage.created_at)
      .order('created_at', { ascending: false })
      .limit(messagesPerPage);

    if (error) {
      console.error('Error loading older messages:', error);
      return;
    }

    if (data && data.length > 0) {
      setMessages(prev => [...data.reverse(), ...prev]);
      setHasMore(data.length === messagesPerPage);
    } else {
      setHasMore(false);
    }
  }, [conversationId, messages, messagesPerPage, hasMore]);

  /**
   * Batch message updates (100ms window)
   */
  const processBatch = useCallback(() => {
    if (batchQueueRef.current.length === 0) return;

    setMessages(prev => {
      const newMessages = [...prev];
      batchQueueRef.current.forEach(msg => {
        const existingIndex = newMessages.findIndex(m => m.id === msg.id);
        if (existingIndex >= 0) {
          newMessages[existingIndex] = msg;
        } else {
          newMessages.push(msg);
        }
      });
      return newMessages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    batchQueueRef.current = [];
  }, []);

  /**
   * Add message to batch queue
   */
  const queueMessageUpdate = useCallback((message: Message) => {
    batchQueueRef.current.push(message);

    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
    }

    batchTimerRef.current = setTimeout(processBatch, 100);
  }, [processBatch]);

  /**
   * Send text message
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    setSending(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: content.trim(),
          message_type: 'text',
        })
        .select()
        .single();

      if (error) throw error;
      
      // Optimistic update
      if (data) {
        queueMessageUpdate(data);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    } finally {
      setSending(false);
    }
  }, [conversationId, userId, queueMessageUpdate]);

  /**
   * Send media message with compression and deduplication
   */
  const sendMediaMessage = useCallback(async (file: File, caption?: string) => {
    setSending(true);
    try {
      // Upload with deduplication
      const { url, thumbnailUrl, isDuplicate } = await uploadMedia(
        file,
        userId,
        conversationId,
        true // Enable compression
      );

      console.log(isDuplicate ? 'Reusing existing file' : 'Uploaded new file');

      // Create message
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userId,
          content: caption || '',
          message_type: file.type.startsWith('image/') ? 'image' : 'file',
          media_url: url,
          media_thumbnail_url: thumbnailUrl,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        queueMessageUpdate(data);
      }
    } catch (error) {
      console.error('Error sending media:', error);
      throw error;
    } finally {
      setSending(false);
    }
  }, [conversationId, userId, queueMessageUpdate]);

  /**
   * Forward message (zero re-upload)
   */
  const forwardMessage = useCallback(async (
    originalMessageId: string,
    targetConversationId: string
  ) => {
    try {
      // Get original message
      const { data: original, error: fetchError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', originalMessageId)
        .single();

      if (fetchError) throw fetchError;

      // Create forwarded message (reuse media URL)
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: targetConversationId,
          sender_id: userId,
          content: original.content,
          message_type: original.message_type,
          media_url: original.media_url, // Reuse URL
          media_thumbnail_url: original.media_thumbnail_url,
          forwarded_from: original.sender_id,
          original_message_id: originalMessageId,
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error forwarding message:', error);
      throw error;
    }
  }, [userId]);

  /**
   * Delete message
   */
  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', userId);

      if (error) throw error;

      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }, [userId]);

  /**
   * Subscribe to realtime updates
   */
  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          queueMessageUpdate(payload.new as Message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          queueMessageUpdate(payload.new as Message);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages(prev => prev.filter(m => m.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [conversationId, loadMessages, queueMessageUpdate]);

  return {
    messages,
    loading,
    hasMore,
    sending,
    sendMessage,
    sendMediaMessage,
    forwardMessage,
    deleteMessage,
    loadOlder,
    refresh: () => loadMessages(false),
  };
};
