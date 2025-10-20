/**
 * Cache Service
 * Smart local caching for messages and media
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface ChatDB extends DBSchema {
  messages: {
    key: string;
    value: {
      id: string;
      conversationId: string;
      content: any;
      createdAt: number;
      cachedAt: number;
    };
    indexes: { 'by-conversation': string; 'by-date': number };
  };
  media: {
    key: string;
    value: {
      url: string;
      blob: Blob;
      cachedAt: number;
      size: number;
    };
    indexes: { 'by-date': number };
  };
  conversations: {
    key: string;
    value: {
      id: string;
      data: any;
      cachedAt: number;
    };
  };
}

const DB_NAME = 'chatr-cache';
const DB_VERSION = 1;
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_MESSAGES_PER_CHAT = 100;
const MAX_MEDIA_SIZE = 50 * 1024 * 1024; // 50MB

let db: IDBPDatabase<ChatDB> | null = null;

/**
 * Initialize database
 */
const initDB = async (): Promise<IDBPDatabase<ChatDB>> => {
  if (db) return db;

  db = await openDB<ChatDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Messages store
      const messagesStore = db.createObjectStore('messages', { keyPath: 'id' });
      messagesStore.createIndex('by-conversation', 'conversationId');
      messagesStore.createIndex('by-date', 'createdAt');

      // Media store
      const mediaStore = db.createObjectStore('media', { keyPath: 'url' });
      mediaStore.createIndex('by-date', 'cachedAt');

      // Conversations store
      db.createObjectStore('conversations', { keyPath: 'id' });
    },
  });

  return db;
};

/**
 * Cache messages for a conversation
 */
export const cacheMessages = async (conversationId: string, messages: any[]) => {
  const database = await initDB();
  const tx = database.transaction('messages', 'readwrite');

  // Keep only latest MAX_MESSAGES_PER_CHAT messages
  const sortedMessages = messages
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, MAX_MESSAGES_PER_CHAT);

  await Promise.all(
    sortedMessages.map(msg =>
      tx.store.put({
        id: msg.id,
        conversationId,
        content: msg,
        createdAt: new Date(msg.created_at).getTime(),
        cachedAt: Date.now(),
      })
    )
  );

  await tx.done;
};

/**
 * Get cached messages for a conversation
 */
export const getCachedMessages = async (conversationId: string): Promise<any[]> => {
  const database = await initDB();
  const messages = await database.getAllFromIndex(
    'messages',
    'by-conversation',
    conversationId
  );

  // Filter out expired cache
  const validMessages = messages.filter(
    msg => Date.now() - msg.cachedAt < CACHE_TTL
  );

  return validMessages
    .map(msg => msg.content)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
};

/**
 * Cache media blob
 */
export const cacheMedia = async (url: string, blob: Blob) => {
  const database = await initDB();
  
  // Check total cache size
  const allMedia = await database.getAll('media');
  const totalSize = allMedia.reduce((sum, item) => sum + item.size, 0);

  // If cache is too large, delete oldest items
  if (totalSize + blob.size > MAX_MEDIA_SIZE) {
    const sortedMedia = allMedia.sort((a, b) => a.cachedAt - b.cachedAt);
    let freedSpace = 0;
    const tx = database.transaction('media', 'readwrite');

    for (const item of sortedMedia) {
      if (freedSpace >= blob.size) break;
      await tx.store.delete(item.url);
      freedSpace += item.size;
    }

    await tx.done;
  }

  await database.put('media', {
    url,
    blob,
    cachedAt: Date.now(),
    size: blob.size,
  });
};

/**
 * Get cached media
 */
export const getCachedMedia = async (url: string): Promise<Blob | null> => {
  const database = await initDB();
  const cached = await database.get('media', url);

  if (!cached) return null;

  // Check if expired
  if (Date.now() - cached.cachedAt > CACHE_TTL) {
    await database.delete('media', url);
    return null;
  }

  return cached.blob;
};

/**
 * Cache conversation data
 */
export const cacheConversation = async (id: string, data: any) => {
  const database = await initDB();
  await database.put('conversations', {
    id,
    data,
    cachedAt: Date.now(),
  });
};

/**
 * Get cached conversation
 */
export const getCachedConversation = async (id: string): Promise<any | null> => {
  const database = await initDB();
  const cached = await database.get('conversations', id);

  if (!cached) return null;

  // Check if expired
  if (Date.now() - cached.cachedAt > CACHE_TTL) {
    await database.delete('conversations', id);
    return null;
  }

  return cached.data;
};

/**
 * Clear all cache
 */
export const clearCache = async () => {
  const database = await initDB();
  await Promise.all([
    database.clear('messages'),
    database.clear('media'),
    database.clear('conversations'),
  ]);
};

/**
 * Get cache statistics
 */
export const getCacheStats = async () => {
  const database = await initDB();
  
  const [messageCount, mediaItems, conversationCount] = await Promise.all([
    database.count('messages'),
    database.getAll('media'),
    database.count('conversations'),
  ]);

  const mediaTotalSize = mediaItems.reduce((sum, item) => sum + item.size, 0);

  return {
    messages: messageCount,
    media: mediaItems.length,
    mediaSizeMB: (mediaTotalSize / (1024 * 1024)).toFixed(2),
    conversations: conversationCount,
  };
};
