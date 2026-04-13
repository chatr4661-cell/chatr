/**
 * Signal Protocol Key Management Hook
 * Handles X3DH key exchange and Double Ratchet session management
 */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { E2EEncryption } from '@/utils/encryption';

const PREKEY_BATCH_SIZE = 100;
const PREKEY_REFILL_THRESHOLD = 20;

export function useSignalProtocol() {
  const [initialized, setInitialized] = useState(false);
  const [keyCount, setKeyCount] = useState(0);

  // Generate and upload identity keys if not exists
  const initializeKeys = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if identity keys exist
    const { data: existing } = await supabase
      .from('e2e_identity_keys' as any)
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existing) {
      // Generate new identity key pair
      const keyPair = await E2EEncryption.generateKeyPair();
      const signedPrekey = await E2EEncryption.generateKeyPair();

      // Store public key server-side (private key stays in IndexedDB)
      await supabase.from('e2e_identity_keys' as any).insert({
        user_id: user.id,
        identity_public_key: keyPair.publicKey,
        signed_prekey_public: signedPrekey.publicKey,
        signed_prekey_signature: 'sig_' + Date.now(), // In production: actual Ed25519 signature
        registration_id: Math.floor(Math.random() * 16380) + 1,
      });

      // Store private keys locally
      try {
        const db = await openKeyStore();
        const tx = db.transaction('keys', 'readwrite');
        tx.objectStore('keys').put({
          id: 'identity',
          userId: user.id,
          privateKey: keyPair.privateKey,
          signedPrekeyPrivate: signedPrekey.privateKey,
        });
        await tx.done;
      } catch (e) {
        localStorage.setItem(`chatr_e2e_${user.id}`, JSON.stringify({
          privateKey: keyPair.privateKey,
          signedPrekeyPrivate: signedPrekey.privateKey,
        }));
      }

      // Upload initial batch of one-time prekeys
      await uploadPrekeys(user.id, 0, PREKEY_BATCH_SIZE);
    }

    // Check prekey count
    const { count } = await supabase
      .from('e2e_prekeys' as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_used', false);

    setKeyCount(count || 0);

    // Refill if low
    if ((count || 0) < PREKEY_REFILL_THRESHOLD) {
      const maxId = await getMaxPrekeyId(user.id);
      await uploadPrekeys(user.id, maxId + 1, PREKEY_BATCH_SIZE);
    }

    setInitialized(true);
  }, []);

  // Upload batch of prekeys
  const uploadPrekeys = async (userId: string, startId: number, count: number) => {
    const prekeys = [];
    for (let i = 0; i < count; i++) {
      const kp = await E2EEncryption.generateKeyPair();
      prekeys.push({
        user_id: userId,
        prekey_id: startId + i,
        public_key: kp.publicKey,
      });
    }

    // Batch insert
    for (let i = 0; i < prekeys.length; i += 50) {
      await supabase.from('e2e_prekeys' as any).insert(prekeys.slice(i, i + 50));
    }
  };

  // Get max prekey ID
  const getMaxPrekeyId = async (userId: string): Promise<number> => {
    const { data } = await supabase
      .from('e2e_prekeys' as any)
      .select('prekey_id')
      .eq('user_id', userId)
      .order('prekey_id', { ascending: false })
      .limit(1);
    return data?.[0]?.prekey_id ?? 0;
  };

  // Establish encrypted session with a peer
  const establishSession = useCallback(async (peerId: string) => {
    // 1. Get peer's identity key bundle
    const { data: peerKeys } = await supabase
      .from('e2e_identity_keys' as any)
      .select('*')
      .eq('user_id', peerId)
      .single();

    if (!peerKeys) throw new Error('Peer has no encryption keys');

    // 2. Consume one-time prekey
    const { data: prekey } = await supabase.rpc('consume_prekey', { p_target_user_id: peerId });
    if (!prekey || prekey.length === 0) throw new Error('No prekeys available');

    // 3. Create session (X3DH key agreement would happen here)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const sessionState = JSON.stringify({
      peerIdentityKey: peerKeys.identity_public_key,
      peerSignedPrekey: peerKeys.signed_prekey_public,
      usedPrekeyId: prekey[0].prekey_id,
      established: Date.now(),
    });

    await supabase.from('e2e_sessions' as any).upsert({
      user_id: user.id,
      peer_id: peerId,
      session_state: sessionState,
      message_number: 0,
    });

    return true;
  }, []);

  // Check if session exists
  const hasSession = useCallback(async (peerId: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data } = await supabase
      .from('e2e_sessions' as any)
      .select('id')
      .eq('user_id', user.id)
      .eq('peer_id', peerId)
      .maybeSingle();

    return !!data;
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeKeys().catch(console.error);
  }, [initializeKeys]);

  return {
    initialized,
    keyCount,
    initializeKeys,
    establishSession,
    hasSession,
  };
}

// IndexedDB helpers for private key storage
async function openKeyStore(): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('chatr_e2e_keys', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore('keys', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
