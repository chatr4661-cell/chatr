import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to track app usage sessions with start/end times
 */
export const useAppUsageTracking = (appId: string | null) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const sessionStartRef = useRef<Date | null>(null);

  useEffect(() => {
    if (appId) {
      startSession(appId);
    }

    return () => {
      if (sessionId) {
        endSession();
      }
    };
  }, [appId]);

  const startSession = async (appId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    sessionStartRef.current = new Date();

    try {
      const { data, error } = await supabase
        .from('app_usage_sessions' as any)
        .insert({
          user_id: user.id,
          app_id: appId,
          session_start: sessionStartRef.current.toISOString(),
        })
        .select()
        .single() as any;

      if (error) {
        console.error('Failed to start session:', error);
        return;
      }

      setSessionId(data?.id || null);
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  const endSession = async () => {
    if (!sessionId) return;

    try {
      await supabase
        .from('app_usage_sessions' as any)
        .update({
          session_end: new Date().toISOString(),
        })
        .eq('id', sessionId);

      setSessionId(null);
      sessionStartRef.current = null;
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  return {
    sessionId,
    startSession,
    endSession,
  };
};
