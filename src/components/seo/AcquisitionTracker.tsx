import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { captureAcquisition } from '@/utils/seoAttribution';
import { supabase } from '@/integrations/supabase/client';

export const AcquisitionTracker = () => {
  const location = useLocation();

  // 1. Capture acquisition signal on route change / first visit
  useEffect(() => {
    captureAcquisition().catch(() => {
      // Non-blocking fire-and-forget
    });
  }, [location.pathname, location.search]);

  // 2. Link attribution to user on login/signup
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user?.id) {
        try {
          const sessionId = sessionStorage.getItem('chatr.seo.sessionId');
          if (sessionId) {
            await supabase
              .from('seo_attribution')
              .update({ user_id: session.user.id })
              .eq('session_id', sessionId);
          }
        } catch {
          // Non-blocking
        }
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  return null;
};
