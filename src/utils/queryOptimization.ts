/**
 * Database Query Optimization Utilities
 * Helpers for optimizing Supabase queries on 2G networks
 */

import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Optimized pagination with cursor-based approach
 */
export function createCursorPagination<T extends { id: string; created_at: string }>(
  query: any,
  options: {
    pageSize?: number;
    cursor?: string;
    direction?: 'forward' | 'backward';
  } = {}
) {
  const { pageSize = 20, cursor, direction = 'forward' } = options;

  if (cursor) {
    if (direction === 'forward') {
      query = query.gt('created_at', cursor);
    } else {
      query = query.lt('created_at', cursor);
    }
  }

  return query
    .order('created_at', { ascending: direction === 'forward' })
    .limit(pageSize);
}

/**
 * Select only required fields to reduce data transfer
 */
export const SELECT_PROFILES_MINIMAL = 'id,username,avatar_url';
export const SELECT_MESSAGES_MINIMAL = 'id,content,sender_id,created_at,read_at';
export const SELECT_CONVERSATIONS_MINIMAL = 'id,group_name,is_group,updated_at';

/**
 * Batch multiple queries into single request where possible
 */
export async function batchQueries(
  client: SupabaseClient,
  queries: Array<() => Promise<any>>
): Promise<any[]> {
  // Execute in parallel but limit concurrency on slow networks
  const results: any[] = [];
  const batchSize = 3; // Limit concurrent requests on 2G

  for (let i = 0; i < queries.length; i += batchSize) {
    const batch = queries.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(q => q()));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Query with automatic retry and exponential backoff
 */
export async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Query failed after retries');
}

/**
 * Count without loading all records (use PostgreSQL count)
 */
export async function efficientCount(
  query: any
): Promise<number> {
  const { count, error } = await query
    .select('*', { count: 'exact', head: true });
  
  if (error) throw error;
  return count || 0;
}

/**
 * Lazy load relationships only when needed
 */
export function createLazyLoader<T>(
  loadFn: () => Promise<T>
) {
  let cache: T | null = null;
  let loading = false;
  let promise: Promise<T> | null = null;

  return async (): Promise<T> => {
    if (cache) return cache;
    if (loading && promise) return promise;

    loading = true;
    promise = loadFn().then(result => {
      cache = result;
      loading = false;
      return result;
    });

    return promise;
  };
}

/**
 * Recommended indexes for optimal performance
 * These should be added via Supabase migrations
 */
export const RECOMMENDED_INDEXES = `
-- Messages table indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
  ON messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender 
  ON messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_read_status 
  ON messages(conversation_id, read_at) 
  WHERE read_at IS NULL;

-- Conversation participants for fast lookups
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user 
  ON conversation_participants(user_id, conversation_id);

-- Profiles for contact search
CREATE INDEX IF NOT EXISTS idx_profiles_phone_search 
  ON profiles(phone_search) 
  WHERE phone_search IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_username 
  ON profiles(username);

-- Calls for history
CREATE INDEX IF NOT EXISTS idx_calls_user_date 
  ON calls(caller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calls_conversation 
  ON calls(conversation_id, created_at DESC);

-- Points and transactions
CREATE INDEX IF NOT EXISTS idx_point_transactions_user_date 
  ON point_transactions(user_id, created_at DESC);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, read) 
  WHERE read = false;
`;

/**
 * Query optimization tips for 2G networks
 */
export const QUERY_OPTIMIZATION_TIPS = {
  // Always specify exact fields needed
  selectMinimal: 'Use .select() with only required fields',
  
  // Use range queries for pagination
  usePagination: 'Always limit results with .range() or .limit()',
  
  // Leverage indexes
  useIndexes: 'Query on indexed columns when possible',
  
  // Avoid N+1 queries
  avoidN1: 'Use joins instead of multiple queries',
  
  // Cache aggressively
  cacheResults: 'Cache frequently accessed data',
  
  // Use count carefully
  lightweightCount: 'Use head: true for count-only queries',
};
