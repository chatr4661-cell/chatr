import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { syncAuthToNative, hasNativeAuthBridge } from '@/utils/androidBridge';

/**
 * Hook to automatically sync Supabase auth state to native Android app
 * Call this in your root component or auth provider
 */
export const useNativeAuthSync = () => {
  useEffect(() => {
    // Check if we're in a native WebView
    if (!hasNativeAuthBridge()) {
      console.log('[useNativeAuthSync] Not in native WebView, skipping sync setup');
      return;
    }

    console.log('[useNativeAuthSync] NativeAuth bridge detected, setting up auth sync');

    // Sync current session on mount
    const syncCurrentSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        syncAuthToNative(
          'SIGNED_IN',
          session.user.id,
          session.access_token,
          session.refresh_token
        );
      }
    };

    syncCurrentSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`[useNativeAuthSync] Auth event: ${event}`);
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session) {
            syncAuthToNative(
              'SIGNED_IN',
              session.user.id,
              session.access_token,
              session.refresh_token
            );
          }
        } else if (event === 'SIGNED_OUT') {
          syncAuthToNative('SIGNED_OUT', null, null, null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);
};

export default useNativeAuthSync;
