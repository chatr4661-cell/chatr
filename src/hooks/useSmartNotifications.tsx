import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NotificationBundle {
  id: string;
  type: string;
  count: number;
  summary: string;
  createdAt: string;
}

export const useSmartNotifications = () => {
  const [bundles, setBundles] = useState<NotificationBundle[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBundles = useCallback(async (): Promise<NotificationBundle[]> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notification_bundles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map(b => ({
        id: b.id,
        type: b.bundle_type,
        count: b.notification_ids?.length || 0,
        summary: b.summary || '',
        createdAt: b.created_at
      }));

      setBundles(mapped);
      return mapped;
    } catch (error) {
      console.error('Failed to fetch bundles:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const bundleNotifications = useCallback(async (
    notificationIds: string[],
    bundleType: string
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Generate summary using AI
      const { data: aiData } = await supabase.functions.invoke('generate-notification-summary', {
        body: { notificationIds, bundleType }
      });

      const { error } = await supabase.from('notification_bundles').insert({
        user_id: user.id,
        bundle_type: bundleType,
        notification_ids: notificationIds,
        summary: aiData?.summary || `${notificationIds.length} ${bundleType} notifications`
      });

      if (error) throw error;

      await fetchBundles();
      return true;
    } catch (error) {
      console.error('Failed to bundle notifications:', error);
      return false;
    }
  }, [fetchBundles]);

  const generateSmartSummary = useCallback(async (
    notifications: { title: string; body: string; type: string }[]
  ): Promise<string> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-notification-summary', {
        body: { notifications }
      });

      if (error) throw error;
      return data?.summary || `${notifications.length} new notifications`;
    } catch {
      return `${notifications.length} new notifications`;
    }
  }, []);

  return {
    bundles,
    loading,
    fetchBundles,
    bundleNotifications,
    generateSmartSummary
  };
};
