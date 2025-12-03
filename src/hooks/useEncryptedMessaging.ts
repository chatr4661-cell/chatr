import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { E2EEncryption } from '@/utils/encryption';

export const useEncryptedMessaging = (userId?: string) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);

  // Initialize encryption keys for the user
  useEffect(() => {
    if (!userId) return;

    const initializeEncryption = async () => {
      try {
        // Check if user already has keys stored locally
        const existingPrivateKey = await E2EEncryption.getPrivateKey(userId);
        
        if (existingPrivateKey) {
          console.log('✅ E2E encryption keys found locally');
          setIsInitialized(true);
          setEncryptionEnabled(true);
          return;
        }

        // Check if public key exists in database (use raw query to avoid type issues)
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        const existingPublicKey = (profile as any)?.public_key;
        
        if (existingPublicKey) {
          // User has public key but no private key locally - need to regenerate
          console.log('⚠️ Public key exists but no local private key - regenerating');
        }

        // Generate new key pair
        console.log('🔐 Generating new E2E encryption keys...');
        const { publicKey, privateKey } = await E2EEncryption.generateKeyPair();

        // Store private key locally
        await E2EEncryption.storePrivateKey(userId, privateKey);

        // Store public key in database (use any to bypass type check for new column)
        await supabase
          .from('profiles')
          .update({ public_key: publicKey } as any)
          .eq('id', userId);

        console.log('✅ E2E encryption keys generated and stored');
        setIsInitialized(true);
        setEncryptionEnabled(true);
      } catch (error) {
        console.error('❌ Failed to initialize encryption:', error);
        // Encryption is optional - don't block messaging
        setIsInitialized(true);
        setEncryptionEnabled(false);
      }
    };

    initializeEncryption();
  }, [userId]);

  // Encrypt a message for a recipient
  const encryptMessage = useCallback(async (
    message: string,
    recipientId: string
  ): Promise<{ encrypted: string; iv: string; key: string } | null> => {
    if (!encryptionEnabled) return null;

    try {
      // Get recipient's public key
      const { data: recipient } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', recipientId)
        .single();

      const recipientPublicKey = (recipient as any)?.public_key;
      
      if (!recipientPublicKey) {
        console.log('Recipient has no public key - sending unencrypted');
        return null;
      }

      const { encryptedMessage, iv, symmetricKey } = await E2EEncryption.encryptMessage(
        message,
        recipientPublicKey
      );

      return {
        encrypted: encryptedMessage,
        iv,
        key: symmetricKey
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      return null;
    }
  }, [encryptionEnabled]);

  // Decrypt a message
  const decryptMessage = useCallback(async (
    encryptedMessage: string,
    encryptedKey: string,
    iv: string
  ): Promise<string | null> => {
    if (!userId || !encryptionEnabled) return null;

    try {
      const privateKey = await E2EEncryption.getPrivateKey(userId);
      if (!privateKey) {
        console.error('No private key found');
        return null;
      }

      const decrypted = await E2EEncryption.decryptMessage(
        encryptedMessage,
        encryptedKey,
        iv,
        privateKey
      );

      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      return null;
    }
  }, [userId, encryptionEnabled]);

  return {
    isInitialized,
    encryptionEnabled,
    encryptMessage,
    decryptMessage
  };
};
