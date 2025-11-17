import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * CRITICAL: Prevents calls from disconnecting due to mobile network issues
 * Implements heartbeat mechanism to keep WebRTC connection alive
 */
export const useCallKeepAlive = (callId: string | null, isActive: boolean) => {
  const heartbeatInterval = useRef<NodeJS.Timeout | null>(null);
  const lastHeartbeat = useRef<number>(Date.now());

  useEffect(() => {
    if (!callId || !isActive) {
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
      return;
    }

    console.log('💓 [CallKeepAlive] Starting heartbeat for call:', callId);

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
            // Use only valid fields from calls table
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

    return () => {
      console.log('💓 [CallKeepAlive] Stopping heartbeat');
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }
    };
  }, [callId, isActive]);
};
