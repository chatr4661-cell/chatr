import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type ActivityType = 
  | 'message_sent'
  | 'call_made'
  | 'app_installed'
  | 'deal_redeemed'
  | 'food_ordered'
  | 'app_created'
  | 'referral_made'
  | 'daily_login';

const ACTIVITY_REWARDS: Record<ActivityType, number> = {
  message_sent: 1,
  call_made: 5,
  app_installed: 10,
  deal_redeemed: 15,
  food_ordered: 20,
  app_created: 50,
  referral_made: 50,
  daily_login: 10,
};

export const useActivityTracking = () => {
  const trackActivity = useCallback(async (
    activityType: ActivityType,
    metadata?: Record<string, any>
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const coinsEarned = ACTIVITY_REWARDS[activityType] || 0;

      // Record activity
      const { error: activityError } = await supabase
        .from('user_activities')
        .insert({
          user_id: user.id,
          activity_type: activityType,
          coins_earned: coinsEarned,
          metadata: metadata || {},
        });

      if (activityError) throw activityError;

      // Update user points
      const { data: currentPoints } = await supabase
        .from('user_points')
        .select('balance, lifetime_earned')
        .eq('user_id', user.id)
        .single();

      if (currentPoints) {
        const { error: pointsError } = await supabase
          .from('user_points')
          .update({
            balance: (currentPoints.balance || 0) + coinsEarned,
            lifetime_earned: (currentPoints.lifetime_earned || 0) + coinsEarned,
          })
          .eq('user_id', user.id);

        if (pointsError) throw pointsError;
      }

      // Record transaction
      const { error: transactionError } = await supabase
        .from('point_transactions')
        .insert({
          user_id: user.id,
          amount: coinsEarned,
          transaction_type: 'earn',
          source: activityType,
          description: `Earned ${coinsEarned} coins for ${activityType.replace('_', ' ')}`,
        });

      if (transactionError) throw transactionError;

      if (coinsEarned > 0) {
        toast.success(`+${coinsEarned} Chatr Coins! 🪙`, {
          description: `Keep it up! You're earning rewards.`,
        });
      }
    } catch (error) {
      console.error('[ACTIVITY] Tracking error:', error);
    }
  }, []);

  return { trackActivity };
};
