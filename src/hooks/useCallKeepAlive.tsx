import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * CRITICAL: Prevents calls from disconnecting due to mobile network issues
 * Implements heartbeat mechanism to keep WebRTC connection AND auth session alive
 */
export const useCallKeepAlive = (callId: string | null, isActive: boolean) => {
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const sessionRefreshInterval = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeat = useRef<number>(Date.now());

  // Refresh auth session to prevent logout during calls
  const refreshAuthSession = useCallback(async () => {
    try {
      console.log('🔐 [CallKeepAlive] Refreshing auth session...');
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('❌ [CallKeepAlive] Session refresh failed:', error);
        return false;
      }
      
      if (session) {
        console.log('✅ [CallKeepAlive] Auth session refreshed successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ [CallKeepAlive] Session refresh error:', error);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!callId || !isActive) {
      // Clear both intervals when call ends
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
      if (sessionRefreshInterval.current) {
        clearInterval(sessionRefreshInterval.current);
        sessionRefreshInterval.current = null;
      }
      return;
    }

    console.log('💓 [CallKeepAlive] Starting heartbeat + session refresh for call:', callId);

    // Refresh session immediately when call starts
    refreshAuthSession();

    // Send heartbeat every 5 seconds to keep call active
    heartbeatInterval.current = setInterval(async () => {
      try {
        const now = Date.now();
        const timeSinceLastHeartbeat = now - lastHeartbeat.current;
        
        console.log(`💓 [CallKeepAlive] Sending heartbeat (${timeSinceLastHeartbeat}ms since last)`);
        
        // Update call record to show it's still active  
        const { error } = await supabase
          .from('calls')
          .update({ 
            webrtc_state: 'connected'
          })
          .eq('id', callId);

        if (error) {
          console.error('❌ [CallKeepAlive] Heartbeat failed:', error);
        } else {
          lastHeartbeat.current = now;
        }
      } catch (error) {
        console.error('❌ [CallKeepAlive] Heartbeat error:', error);
      }
    }, 5000); // Every 5 seconds

    // CRITICAL: Refresh auth session every 30 seconds to prevent logout during calls
    sessionRefreshInterval.current = setInterval(async () => {
      await refreshAuthSession();
    }, 30000); // Every 30 seconds

    return () => {
      console.log('💓 [CallKeepAlive] Stopping heartbeat + session refresh');
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
      if (sessionRefreshInterval.current) {
        clearInterval(sessionRefreshInterval.current);
        sessionRefreshInterval.current = null;
      }
    };
  }, [callId, isActive, refreshAuthSession]);
};
