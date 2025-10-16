import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { prefetchCache } from './useAggressiveCache';

export function usePrefetch() {
  useEffect(() => {
    const prefetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Prefetch likely next pages
      const prefetches = [
        // Contacts
        prefetchCache('contacts', async () => {
          const { data } = await supabase
            .from('contacts')
            .select('*')
            .eq('user_id', user.id)
            .eq('is_registered', true)
            .limit(100);
          return data || [];
        }),
        
        // Notifications
        prefetchCache('notifications', async () => {
          const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);
          return data || [];
        }),
        
        // Stories
        prefetchCache('stories', async () => {
          const { data } = await supabase
            .from('stories')
            .select('*, profiles!inner(*)')
            .gte('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(20);
          return data || [];
        }),
      ];

      // Execute all prefetches in parallel
      await Promise.allSettled(prefetches);
    };

    // Prefetch after a short delay to not block initial render
    const timer = setTimeout(prefetchData, 500);
    return () => clearTimeout(timer);
  }, []);
}
