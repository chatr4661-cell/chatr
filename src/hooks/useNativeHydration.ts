/**
 * Native Hydration Hook
 * Provides instant app launch with cached data + background sync
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  getCachedHydration, 
  saveHydration, 
  clearHydrationCache,
  isCacheStale,
  HydrationPayload 
} from '@/utils/nativeHydration';
import { exposeOEMToNative } from '@/utils/oemDetection';

interface UseNativeHydrationResult {
  isHydrated: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  data: HydrationPayload | null;
  error: Error | null;
  refresh: () => Promise<void>;
  clear: () => Promise<void>;
}

/**
 * Hook for instant app hydration with offline-first strategy
 */
export function useNativeHydration(): UseNativeHydrationResult {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [data, setData] = useState<HydrationPayload | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const syncInProgress = useRef(false);

  // Expose OEM info to native on mount
  useEffect(() => {
    exposeOEMToNative();
  }, []);

  // Initial hydration from cache
  useEffect(() => {
    let mounted = true;

    const hydrate = async () => {
      const startTime = performance.now();
      
      try {
        // Step 1: Try to get cached data immediately
        const cached = await getCachedHydration();
        
        if (cached && mounted) {
          setData(cached);
          setIsHydrated(true);
          setIsLoading(false);
          
          const cacheTime = performance.now() - startTime;
          console.log(`[Hydration] Cache loaded in ${cacheTime.toFixed(0)}ms`);
          
          // Step 2: Check if we need background sync
          const stale = await isCacheStale();
          if (stale && !syncInProgress.current) {
            // Start background sync
            syncInProgress.current = true;
            setIsSyncing(true);
            await performBackgroundSync(cached, mounted, setData, setIsSyncing);
            syncInProgress.current = false;
          }
        } else {
          // No cache - must fetch fresh data
          console.log('[Hydration] No cache, fetching fresh data...');
          await fetchFreshData(mounted, setData, setIsHydrated, setIsLoading);
        }
      } catch (err) {
        console.error('[Hydration] Error:', err);
        if (mounted) {
          setError(err as Error);
          setIsLoading(false);
        }
      }
    };

    hydrate();

    return () => {
      mounted = false;
    };
  }, []);

  // Refresh function (for pull-to-refresh)
  const refresh = useCallback(async () => {
    if (syncInProgress.current) return;
    
    syncInProgress.current = true;
    setIsSyncing(true);
    
    try {
      await fetchFreshData(true, setData, setIsHydrated, () => {});
    } finally {
      setIsSyncing(false);
      syncInProgress.current = false;
    }
  }, []);

  // Clear cache (for logout)
  const clear = useCallback(async () => {
    await clearHydrationCache();
    setData(null);
    setIsHydrated(false);
  }, []);

  return {
    isHydrated,
    isLoading,
    isSyncing,
    data,
    error,
    refresh,
    clear,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function fetchFreshData(
  mounted: boolean,
  setData: (d: HydrationPayload) => void,
  setIsHydrated: (b: boolean) => void,
  setIsLoading: (b: boolean) => void
): Promise<void> {
  const startTime = performance.now();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    setIsLoading(false);
    return;
  }

  // Fetch all data in parallel for speed
  const [profileResult, conversationsResult, callsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, phone_number, avatar_url')
      .eq('id', user.id)
      .single(),
    
    supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations!inner (
          id,
          is_group,
          group_name,
          group_icon_url,
          last_message,
          last_message_at,
          is_muted
        )
      `)
      .eq('user_id', user.id)
      .order('conversations(last_message_at)', { ascending: false })
      .limit(50),
    
    supabase
      .from('calls')
      .select('id, caller_phone, caller_name, receiver_phone, receiver_name, call_type, status, duration, created_at')
      .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(50),
  ]);

  if (!mounted) return;

  const profile = profileResult.data;
  const conversations = conversationsResult.data || [];
  const calls = callsResult.data || [];

  // Transform conversations to include other user info
  const processedConversations = await Promise.all(
    conversations.map(async (cp: any) => {
      const conv = cp.conversations;
      
      // Get other participant for non-group chats
      let otherUserPhone = '';
      let otherUserName = '';
      let otherUserAvatar: string | null = null;
      
      if (!conv.is_group) {
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id, profiles!inner(phone_number, full_name, avatar_url)')
          .eq('conversation_id', conv.id)
          .neq('user_id', user.id)
          .limit(1)
          .single();
        
        if (participants?.profiles) {
          const p = participants.profiles as any;
          otherUserPhone = p.phone_number || '';
          otherUserName = p.full_name || 'Unknown';
          otherUserAvatar = p.avatar_url;
        }
      }

      // Get unread count
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .neq('sender_id', user.id)
        .eq('status', 'delivered');

      return {
        id: conv.id,
        other_user_phone: otherUserPhone,
        other_user_name: conv.is_group ? conv.group_name : otherUserName,
        other_user_avatar: conv.is_group ? conv.group_icon_url : otherUserAvatar,
        last_message: conv.last_message || '',
        last_message_at: conv.last_message_at || new Date().toISOString(),
        unread_count: count || 0,
        is_muted: conv.is_muted || false,
        is_group: conv.is_group || false,
        group_name: conv.group_name,
      };
    })
  );

  const payload: HydrationPayload = {
    profile: {
      user_id: user.id,
      display_name: profile?.full_name || 'User',
      phone_number: profile?.phone_number || '',
      avatar_url: profile?.avatar_url || null,
    },
    conversations: processedConversations,
    recentCalls: calls.map((c: any) => ({
      id: c.id,
      caller_phone: c.caller_phone || '',
      caller_name: c.caller_name || 'Unknown',
      receiver_phone: c.receiver_phone || '',
      receiver_name: c.receiver_name || 'Unknown',
      call_type: c.call_type,
      status: c.status,
      duration: c.duration || 0,
      created_at: c.created_at,
    })),
    lastSync: Date.now(),
    version: 1,
  };

  // Save to cache
  await saveHydration(payload);

  setData(payload);
  setIsHydrated(true);
  setIsLoading(false);

  const fetchTime = performance.now() - startTime;
  console.log(`[Hydration] Fresh data loaded in ${fetchTime.toFixed(0)}ms`);
}

async function performBackgroundSync(
  currentData: HydrationPayload,
  mounted: boolean,
  setData: (d: HydrationPayload) => void,
  setIsSyncing: (b: boolean) => void
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !mounted) {
      setIsSyncing(false);
      return;
    }

    // Fetch only data changed since last sync
    const lastSync = new Date(currentData.lastSync).toISOString();
    
    const [conversationsResult, callsResult] = await Promise.all([
      // Get conversations with recent activity
      supabase
        .from('conversations')
        .select('id, last_message, last_message_at')
        .gt('last_message_at', lastSync)
        .limit(50),
      
      // Get new calls
      supabase
        .from('calls')
        .select('id, caller_phone, caller_name, receiver_phone, receiver_name, call_type, status, duration, created_at')
        .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .gt('created_at', lastSync)
        .limit(20),
    ]);

    if (!mounted) return;

    // If there are updates, refresh full data
    const hasUpdates = 
      (conversationsResult.data?.length || 0) > 0 ||
      (callsResult.data?.length || 0) > 0;

    if (hasUpdates) {
      console.log('[Hydration] Updates detected, refreshing...');
      await fetchFreshData(mounted, setData, () => {}, () => {});
    } else {
      // Just update sync time
      const updatedPayload = {
        ...currentData,
        lastSync: Date.now(),
      };
      await saveHydration(updatedPayload);
    }
  } catch (error) {
    console.error('[Hydration] Background sync error:', error);
  } finally {
    if (mounted) {
      setIsSyncing(false);
    }
  }
}
