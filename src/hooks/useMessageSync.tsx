import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  created_at: string;
  read_at: string | null;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  message_type?: string;
  media_url?: string;
  reply_to_id?: string;
}

interface PendingMessage {
  tempId: string;
  message: Partial<Message>;
  retryCount: number;
}

// UUID validation helper
const isValidUUID = (uuid: string | null | undefined): boolean => {
  if (!uuid) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

export const useMessageSync = (conversationId: string | null, userId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const { toast } = useToast();
  const channelRef = useRef<any>(null);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!conversationId || !userId) {
      console.log('⏸️ Skipping loadMessages - missing IDs:', { conversationId, userId });
      return;
    }

    if (!isValidUUID(conversationId) || !isValidUUID(userId)) {
      console.error('❌ Invalid UUID format:', { conversationId, userId });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          sender_id,
          conversation_id,
          created_at,
          read_at,
          message_type,
          media_url,
          status,
          reactions,
          is_edited,
          edited_at,
          is_deleted,
          deleted_at,
          is_starred,
          duration,
          file_name,
          file_size,
          location_name,
          location_latitude,
          location_longitude,
          poll_question,
          poll_options,
          scheduled_for
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data.map(msg => ({
        ...msg,
        status: msg.read_at ? 'read' : (msg.sender_id === userId ? 'sent' : 'delivered')
      })));
    } catch (error: any) {
      console.error('Error loading messages:', error);
      toast({
        title: 'Error loading messages',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, userId, toast]);

  // Send message with retry logic
  const sendMessage = useCallback(async (messageData: Partial<Message>) => {
    if (!conversationId || !userId) {
      console.error('❌ Cannot send message - missing IDs');
      return null;
    }

    if (!isValidUUID(conversationId) || !isValidUUID(userId)) {
      console.error('❌ Invalid UUID format - cannot send message');
      toast({
        title: 'Error',
        description: 'Invalid conversation or user ID',
        variant: 'destructive',
      });
      return null;
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      content: messageData.content || '',
      sender_id: userId,
      conversation_id: conversationId,
      created_at: new Date().toISOString(),
      read_at: null,
      status: 'sending',
      ...messageData,
    };

    // Add optimistic message
    setMessages(prev => [...prev, optimisticMessage]);

    const pending: PendingMessage = {
      tempId,
      message: messageData,
      retryCount: 0,
    };

    setPendingMessages(prev => [...prev, pending]);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([{
          conversation_id: conversationId,
          sender_id: userId,
          content: messageData.content,
          message_type: messageData.message_type || 'text',
          media_url: messageData.media_url,
          reply_to_id: messageData.reply_to_id,
        }])
        .select()
        .single();

      if (error) throw error;

      // Replace optimistic message with real one
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...data, status: 'sent' } : msg
      ));

      setPendingMessages(prev => prev.filter(p => p.tempId !== tempId));

      return data;
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Mark as failed
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...msg, status: 'failed' } : msg
      ));

      toast({
        title: 'Message failed to send',
        description: 'Click retry button above to resend',
        variant: 'destructive',
      });

      return null;
    }
  }, [conversationId, userId, toast]);

  // Retry failed message
  const retryMessage = useCallback(async (tempId: string) => {
    const pending = pendingMessages.find(p => p.tempId === tempId);
    if (!pending || pending.retryCount >= 3) {
      toast({
        title: 'Message failed',
        description: 'Maximum retry attempts reached',
        variant: 'destructive',
      });
      return;
    }

    setPendingMessages(prev => prev.map(p =>
      p.tempId === tempId ? { ...p, retryCount: p.retryCount + 1 } : p
    ));

    // Update status to sending
    setMessages(prev => prev.map(msg =>
      msg.id === tempId ? { ...msg, status: 'sending' } : msg
    ));

    await sendMessage(pending.message);
  }, [pendingMessages, sendMessage, toast]);

  // Mark message as read
  const markAsRead = useCallback(async (messageId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId)
        .neq('sender_id', userId);

      if (error) throw error;

      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, read_at: new Date().toISOString(), status: 'read' } : msg
      ));
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, [userId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!conversationId || !userId) {
      console.log('⏸️ Skipping realtime subscription - missing IDs');
      return;
    }

    if (!isValidUUID(conversationId) || !isValidUUID(userId)) {
      console.error('❌ Invalid UUID format - cannot subscribe to realtime');
      return;
    }

    loadMessages();

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    // Create new channel for this conversation
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          console.log('📨 New message received:', payload.new);
          
          // Fetch full message with sender info
          const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages(prev => {
              // Avoid duplicates
              if (prev.some(msg => msg.id === data.id)) return prev;
              return [...prev, {
                ...data,
                status: data.sender_id === userId ? 'sent' : 'delivered'
              }];
            });

            // Mark as read if not from current user
            if (data.sender_id !== userId) {
              markAsRead(data.id);
            }
          }
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
          console.log('📝 Message updated:', payload.new);
          setMessages(prev => prev.map(msg =>
            msg.id === payload.new.id ? {
              ...msg,
              ...payload.new,
              status: payload.new.read_at ? 'read' : msg.status
            } : msg
          ));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [conversationId, userId, loadMessages, markAsRead]);

  return {
    messages,
    isLoading,
    sendMessage,
    retryMessage,
    markAsRead,
    loadMessages,
  };
};
