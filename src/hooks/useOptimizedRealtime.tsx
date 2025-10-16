import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useNetworkQuality } from './useNetworkQuality';
import { useLiteMode } from './useLiteMode';

interface RealtimeSubscription {
  table: string;
  filter?: string;
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  callback: (payload: any) => void;
}

/**
 * Optimized realtime hook for 2G networks
 * - Single multiplexed channel
 * - Adaptive polling intervals
 * - Can be disabled in lite mode
 */
export const useOptimizedRealtime = (
  subscriptions: RealtimeSubscription[],
  enabled: boolean = true
) => {
  const networkQuality = useNetworkQuality();
  const { settings: liteModeSettings } = useLiteMode();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const batchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const batchedUpdates = useRef<any[]>([]);

  // Determine if realtime should be active
  const shouldUseRealtime = enabled && 
    !liteModeSettings.disableRealtime && 
    networkQuality !== 'offline';

  // Get polling interval based on network quality
  const getPollingInterval = useCallback(() => {
    if (networkQuality === 'slow') return 30000; // 30s on 2G
    if (networkQuality === 'fast') return 5000;  // 5s on fast networks
    return 10000; // 10s default
  }, [networkQuality]);

  /**
   * Batch updates to reduce re-renders
   */
  const batchUpdate = useCallback((update: any) => {
    batchedUpdates.current.push(update);
    
    if (batchTimerRef.current) {
      clearTimeout(batchTimerRef.current);
    }
    
    // Flush batch based on network quality
    const batchDelay = networkQuality === 'slow' ? 1000 : 100;
    
    batchTimerRef.current = setTimeout(() => {
      const updates = [...batchedUpdates.current];
      batchedUpdates.current = [];
      
      // Process all batched updates
      updates.forEach(update => {
        const subscription = subscriptions.find(
          sub => sub.table === update.table
        );
        if (subscription) {
          subscription.callback(update.payload);
        }
      });
    }, batchDelay);
  }, [networkQuality, subscriptions]);

  useEffect(() => {
    if (!shouldUseRealtime || subscriptions.length === 0) {
      return;
    }

    // Create single multiplexed channel
    const channelName = `optimized_realtime_${Date.now()}`;
    const channel = supabase.channel(channelName);

    // Subscribe to all tables on one channel
    subscriptions.forEach(({ table, event, filter }) => {
      channel.on(
        'postgres_changes' as any,
        {
          event,
          schema: 'public',
          table,
          filter,
        } as any,
        (payload: any) => {
          batchUpdate({ table, payload });
        }
      );
    });

    // Subscribe with adaptive heartbeat
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Optimized realtime connected');
      }
    });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
      }
    };
  }, [shouldUseRealtime, subscriptions, batchUpdate]);

  // Fallback to polling on slow networks with lite mode
  useEffect(() => {
    if (!enabled || shouldUseRealtime || subscriptions.length === 0) {
      return;
    }

    // Use polling as fallback
    const interval = getPollingInterval();
    const pollingTimer = setInterval(() => {
      // Trigger manual refresh
      subscriptions.forEach(({ callback }) => {
        callback({ eventType: 'POLL', new: null, old: null });
      });
    }, interval);

    return () => clearInterval(pollingTimer);
  }, [enabled, shouldUseRealtime, subscriptions, getPollingInterval]);

  return {
    isConnected: !!channelRef.current,
    isUsingPolling: !shouldUseRealtime,
    pollingInterval: getPollingInterval(),
  };
};
