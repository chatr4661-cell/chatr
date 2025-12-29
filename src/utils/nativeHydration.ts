/**
 * CRITICAL: Native-level hydration system for instant app launch
 * Implements offline-first, cache-first strategy for <300ms perceived load
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// ============================================
// DATABASE SCHEMA
// ============================================

interface HydrationDB extends DBSchema {
  profile: {
    key: string;
    value: {
      id: string;
      user_id: string;
      display_name: string;
      phone_number: string;
      avatar_url: string | null;
      updated_at: number;
    };
  };
  conversations: {
    key: string;
    value: {
      id: string;
      data: ConversationData[];
      updated_at: number;
    };
  };
  messages: {
    key: string;
    value: {
      conversation_id: string;
      messages: MessageData[];
      updated_at: number;
    };
    indexes: { 'by-conversation': string };
  };
  callHistory: {
    key: string;
    value: {
      id: string;
      calls: CallData[];
      updated_at: number;
    };
  };
  hydrationMeta: {
    key: string;
    value: {
      key: string;
      last_sync: number;
      version: number;
    };
  };
}

interface ConversationData {
  id: string;
  other_user_phone: string;
  other_user_name: string;
  other_user_avatar: string | null;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  is_muted: boolean;
  is_group: boolean;
  group_name?: string;
}

interface MessageData {
  id: string;
  sender_phone: string;
  sender_name: string;
  content: string;
  created_at: string;
  status: string;
  message_type: string;
}

interface CallData {
  id: string;
  caller_phone: string;
  caller_name: string;
  receiver_phone: string;
  receiver_name: string;
  call_type: 'audio' | 'video';
  status: string;
  duration: number;
  created_at: string;
}

// ============================================
// HYDRATION PAYLOAD (single API response)
// ============================================

export interface HydrationPayload {
  profile: {
    user_id: string;
    display_name: string;
    phone_number: string;
    avatar_url: string | null;
  };
  conversations: ConversationData[];
  recentCalls: CallData[];
  lastSync: number;
  version: number;
}

// ============================================
// DATABASE MANAGER
// ============================================

const DB_NAME = 'chatr-hydration';
const DB_VERSION = 2;

let dbInstance: IDBPDatabase<HydrationDB> | null = null;

async function getDB(): Promise<IDBPDatabase<HydrationDB>> {
  if (dbInstance) return dbInstance;
  
  dbInstance = await openDB<HydrationDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // Profile store
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: 'id' });
      }
      
      // Conversations store
      if (!db.objectStoreNames.contains('conversations')) {
        db.createObjectStore('conversations', { keyPath: 'id' });
      }
      
      // Messages store with index
      if (!db.objectStoreNames.contains('messages')) {
        const messageStore = db.createObjectStore('messages', { keyPath: 'conversation_id' });
        messageStore.createIndex('by-conversation', 'conversation_id');
      }
      
      // Call history store
      if (!db.objectStoreNames.contains('callHistory')) {
        db.createObjectStore('callHistory', { keyPath: 'id' });
      }
      
      // Hydration metadata
      if (!db.objectStoreNames.contains('hydrationMeta')) {
        db.createObjectStore('hydrationMeta', { keyPath: 'key' });
      }
    },
  });
  
  return dbInstance;
}

// ============================================
// CORE HYDRATION FUNCTIONS
// ============================================

/**
 * Get cached hydration data instantly (no network)
 * Returns null if no cache exists
 */
export async function getCachedHydration(): Promise<HydrationPayload | null> {
  try {
    const db = await getDB();
    
    // Parallel reads for speed
    const [profile, conversations, calls, meta] = await Promise.all([
      db.get('profile', 'current'),
      db.get('conversations', 'list'),
      db.get('callHistory', 'recent'),
      db.get('hydrationMeta', 'lastSync'),
    ]);
    
    if (!profile || !conversations) {
      return null;
    }
    
    return {
      profile: {
        user_id: profile.user_id,
        display_name: profile.display_name,
        phone_number: profile.phone_number,
        avatar_url: profile.avatar_url,
      },
      conversations: conversations.data || [],
      recentCalls: calls?.calls || [],
      lastSync: meta?.last_sync || 0,
      version: meta?.version || 1,
    };
  } catch (error) {
    console.warn('[Hydration] Cache read failed:', error);
    return null;
  }
}

/**
 * Save hydration data to cache
 */
export async function saveHydration(payload: HydrationPayload): Promise<void> {
  try {
    const db = await getDB();
    const now = Date.now();
    
    await Promise.all([
      // Save profile
      db.put('profile', {
        id: 'current',
        user_id: payload.profile.user_id,
        display_name: payload.profile.display_name,
        phone_number: payload.profile.phone_number,
        avatar_url: payload.profile.avatar_url,
        updated_at: now,
      }),
      
      // Save conversations
      db.put('conversations', {
        id: 'list',
        data: payload.conversations,
        updated_at: now,
      }),
      
      // Save call history
      db.put('callHistory', {
        id: 'recent',
        calls: payload.recentCalls,
        updated_at: now,
      }),
      
      // Update sync metadata
      db.put('hydrationMeta', {
        key: 'lastSync',
        last_sync: now,
        version: payload.version,
      }),
    ]);
    
    console.log('[Hydration] Cache saved successfully');
  } catch (error) {
    console.error('[Hydration] Cache save failed:', error);
  }
}

/**
 * Save messages for a specific conversation
 */
export async function saveConversationMessages(
  conversationId: string, 
  messages: MessageData[]
): Promise<void> {
  try {
    const db = await getDB();
    await db.put('messages', {
      conversation_id: conversationId,
      messages,
      updated_at: Date.now(),
    });
  } catch (error) {
    console.error('[Hydration] Message cache save failed:', error);
  }
}

/**
 * Get cached messages for a conversation
 */
export async function getCachedMessages(conversationId: string): Promise<MessageData[] | null> {
  try {
    const db = await getDB();
    const cached = await db.get('messages', conversationId);
    return cached?.messages || null;
  } catch (error) {
    console.warn('[Hydration] Message cache read failed:', error);
    return null;
  }
}

/**
 * Update a single conversation in cache (for realtime updates)
 */
export async function updateConversationInCache(
  conversationId: string,
  updates: Partial<ConversationData>
): Promise<void> {
  try {
    const db = await getDB();
    const cached = await db.get('conversations', 'list');
    
    if (!cached) return;
    
    const updatedData = cached.data.map((conv) =>
      conv.id === conversationId ? { ...conv, ...updates } : conv
    );
    
    await db.put('conversations', {
      id: 'list',
      data: updatedData,
      updated_at: Date.now(),
    });
  } catch (error) {
    console.error('[Hydration] Conversation update failed:', error);
  }
}

/**
 * Clear all cached data (on logout)
 */
export async function clearHydrationCache(): Promise<void> {
  try {
    const db = await getDB();
    await Promise.all([
      db.clear('profile'),
      db.clear('conversations'),
      db.clear('messages'),
      db.clear('callHistory'),
      db.clear('hydrationMeta'),
    ]);
    console.log('[Hydration] Cache cleared');
  } catch (error) {
    console.error('[Hydration] Cache clear failed:', error);
  }
}

/**
 * Check if cache is stale (older than 30 minutes)
 */
export async function isCacheStale(): Promise<boolean> {
  try {
    const db = await getDB();
    const meta = await db.get('hydrationMeta', 'lastSync');
    
    if (!meta) return true;
    
    const age = Date.now() - meta.last_sync;
    const STALE_THRESHOLD = 30 * 60 * 1000; // 30 minutes
    
    return age > STALE_THRESHOLD;
  } catch {
    return true;
  }
}

// ============================================
// DELTA SYNC (background refresh)
// ============================================

export interface DeltaPayload {
  newConversations: ConversationData[];
  updatedConversations: Array<{ id: string } & Partial<ConversationData>>;
  newMessages: Array<{ conversation_id: string; messages: MessageData[] }>;
  newCalls: CallData[];
  deletedConversationIds: string[];
}

/**
 * Apply delta updates to cache (background sync)
 */
export async function applyDeltaSync(delta: DeltaPayload): Promise<void> {
  try {
    const db = await getDB();
    const cached = await db.get('conversations', 'list');
    
    if (!cached) return;
    
    let updatedConversations = [...cached.data];
    
    // Remove deleted conversations
    if (delta.deletedConversationIds.length > 0) {
      updatedConversations = updatedConversations.filter(
        (c) => !delta.deletedConversationIds.includes(c.id)
      );
    }
    
    // Update existing conversations
    for (const update of delta.updatedConversations) {
      const index = updatedConversations.findIndex((c) => c.id === update.id);
      if (index >= 0) {
        updatedConversations[index] = { ...updatedConversations[index], ...update };
      }
    }
    
    // Add new conversations
    updatedConversations = [...delta.newConversations, ...updatedConversations];
    
    // Sort by last message time
    updatedConversations.sort((a, b) => 
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
    );
    
    await db.put('conversations', {
      id: 'list',
      data: updatedConversations,
      updated_at: Date.now(),
    });
    
    // Update messages per conversation
    for (const msgUpdate of delta.newMessages) {
      const existing = await db.get('messages', msgUpdate.conversation_id);
      const existingMessages = existing?.messages || [];
      
      // Merge and dedupe by ID
      const messageMap = new Map(existingMessages.map((m) => [m.id, m]));
      for (const msg of msgUpdate.messages) {
        messageMap.set(msg.id, msg);
      }
      
      const mergedMessages = Array.from(messageMap.values()).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      await db.put('messages', {
        conversation_id: msgUpdate.conversation_id,
        messages: mergedMessages.slice(-100), // Keep last 100 messages
        updated_at: Date.now(),
      });
    }
    
    // Update calls
    if (delta.newCalls.length > 0) {
      const existingCalls = await db.get('callHistory', 'recent');
      const allCalls = [...delta.newCalls, ...(existingCalls?.calls || [])];
      
      await db.put('callHistory', {
        id: 'recent',
        calls: allCalls.slice(0, 50), // Keep last 50 calls
        updated_at: Date.now(),
      });
    }
    
    console.log('[Hydration] Delta sync applied');
  } catch (error) {
    console.error('[Hydration] Delta sync failed:', error);
  }
}
