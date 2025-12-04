/**
 * E2E Encrypted Chat Hook
 * Wraps useEfficientChat with encryption/decryption
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useEncryptedMessaging } from './useEncryptedMessaging';
import { useEfficientChat } from './useEfficientChat';
import { E2EEncryption } from '@/utils/encryption';

interface DecryptedMessage {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  created_at: string;
  is_encrypted?: boolean;
  decrypted?: boolean;
  decryptionFailed?: boolean;
  media_url?: string;
  media_thumbnail_url?: string;
  [key: string]: any;
}

interface UseE2EChatOptions {
  conversationId: string;
  userId: string;
  recipientId?: string;
  messagesPerPage?: number;
}

export const useE2EChat = ({
  conversationId,
  userId,
  recipientId,
  messagesPerPage = 30,
}: UseE2EChatOptions) => {
  const [decryptedMessages, setDecryptedMessages] = useState<DecryptedMessage[]>([]);
  const [decrypting, setDecrypting] = useState(false);

  // Initialize encryption for this user
  const { isInitialized, encryptionEnabled, encryptMessage, decryptMessage } = 
    useEncryptedMessaging(userId);

  // Use efficient chat for base functionality
  const chat = useEfficientChat({
    conversationId,
    userId,
    messagesPerPage,
  });

  /**
   * Decrypt messages as they come in
   */
  const processMessages = useCallback(async (messages: any[]) => {
    if (!isInitialized) return messages;

    setDecrypting(true);
    try {
      const processed = await Promise.all(
        messages.map(async (msg) => {
          // If not encrypted, return as-is
          if (!msg.is_encrypted) {
            return { ...msg, decrypted: false };
          }

          // Skip if already decrypted in current batch
          const existing = decryptedMessages.find(m => m.id === msg.id && m.decrypted);
          if (existing) return existing;

          try {
            // Get encrypted data from message
            const encryptedContent = msg.content;
            const encryptedKey = msg.encrypted_key;
            const iv = msg.encrypted_iv;

            if (!encryptedKey || !iv) {
              console.warn('Missing encryption metadata for message:', msg.id);
              return { ...msg, decrypted: false, decryptionFailed: true };
            }

            // Decrypt the message
            const decrypted = await decryptMessage(encryptedContent, encryptedKey, iv);
            
            if (decrypted) {
              return {
                ...msg,
                content: decrypted,
                decrypted: true,
                is_encrypted: true,
              };
            } else {
              return { ...msg, decrypted: false, decryptionFailed: true };
            }
          } catch (error) {
            console.error('Decryption failed for message:', msg.id, error);
            return { ...msg, decrypted: false, decryptionFailed: true };
          }
        })
      );

      return processed;
    } finally {
      setDecrypting(false);
    }
  }, [isInitialized, decryptMessage, decryptedMessages]);

  // Process messages when they change
  useEffect(() => {
    if (chat.messages.length > 0 && isInitialized) {
      processMessages(chat.messages).then(setDecryptedMessages);
    } else {
      setDecryptedMessages(chat.messages);
    }
  }, [chat.messages, isInitialized, processMessages]);

  /**
   * Send encrypted message
   */
  const sendEncryptedMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // If encryption is not enabled or no recipient, send unencrypted
    if (!encryptionEnabled || !recipientId) {
      return chat.sendMessage(content);
    }

    try {
      // Encrypt the message
      const encrypted = await encryptMessage(content, recipientId);

      if (encrypted) {
        // Send encrypted message
        const { data, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: userId,
            content: encrypted.encrypted,
            message_type: 'text',
            is_encrypted: true,
            encrypted_key: encrypted.key,
            encrypted_iv: encrypted.iv,
          })
          .select()
          .single();

        if (error) throw error;
        console.log('🔐 Sent encrypted message');
      } else {
        // Fallback to unencrypted if recipient has no public key
        console.log('📝 Sending unencrypted (recipient has no public key)');
        return chat.sendMessage(content);
      }
    } catch (error) {
      console.error('Error sending encrypted message:', error);
      // Fallback to unencrypted
      return chat.sendMessage(content);
    }
  }, [encryptionEnabled, recipientId, encryptMessage, conversationId, userId, chat]);

  /**
   * Check if recipient supports encryption
   */
  const recipientSupportsEncryption = useCallback(async (): Promise<boolean> => {
    if (!recipientId) return false;

    try {
      const { data } = await supabase
        .from('profiles')
        .select('public_key')
        .eq('id', recipientId)
        .single();

      return !!data?.public_key;
    } catch {
      return false;
    }
  }, [recipientId]);

  return {
    messages: decryptedMessages,
    loading: chat.loading || decrypting,
    hasMore: chat.hasMore,
    sending: chat.sending,
    sendMessage: sendEncryptedMessage,
    sendMediaMessage: chat.sendMediaMessage,
    forwardMessage: chat.forwardMessage,
    deleteMessage: chat.deleteMessage,
    loadOlder: chat.loadOlder,
    refresh: chat.refresh,
    // Encryption status
    encryptionEnabled,
    encryptionInitialized: isInitialized,
    recipientSupportsEncryption,
  };
};
