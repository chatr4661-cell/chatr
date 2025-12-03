import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type StealthModeType = 'default' | 'seller' | 'rewards';

interface StealthModeData {
  current_mode: StealthModeType;
  seller_verified: boolean;
  rewards_opted_in: boolean;
}

interface SellerSettings {
  business_name: string | null;
  business_category: string | null;
  quick_replies: string[];
  auto_response_enabled: boolean;
  auto_response_message: string | null;
  broadcast_enabled: boolean;
}

interface RewardsSettings {
  coin_multiplier: number;
  current_streak: number;
  longest_streak: number;
  total_coins_earned: number;
  daily_challenges_enabled: boolean;
}

export const useStealthMode = () => {
  const [mode, setMode] = useState<StealthModeData | null>(null);
  const [sellerSettings, setSellerSettings] = useState<SellerSettings | null>(null);
  const [rewardsSettings, setRewardsSettings] = useState<RewardsSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStealthMode();
  }, []);

  const loadStealthMode = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('user_stealth_modes' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setMode(data as any);
        
        if ((data as any).current_mode === 'seller') {
          await loadSellerSettings(user.id);
        } else if ((data as any).current_mode === 'rewards') {
          await loadRewardsSettings(user.id);
        }
      } else {
        // Create default mode
        await supabase.from('user_stealth_modes' as any).insert({
          user_id: user.id,
          current_mode: 'default'
        });
        setMode({ current_mode: 'default', seller_verified: false, rewards_opted_in: false });
      }
    } catch (error) {
      console.error('Error loading stealth mode:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSellerSettings = async (userId: string) => {
    const { data } = await supabase
      .from('seller_mode_settings' as any)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data) setSellerSettings(data as any);
  };

  const loadRewardsSettings = async (userId: string) => {
    const { data } = await supabase
      .from('rewards_mode_settings' as any)
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data) setRewardsSettings(data as any);
  };

  const switchMode = async (newMode: StealthModeType) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Check verification for seller mode
    if (newMode === 'seller' && !mode?.seller_verified) {
      return { error: 'Please verify your account first' };
    }

    const { error } = await supabase
      .from('user_stealth_modes' as any)
      .update({ current_mode: newMode })
      .eq('user_id', user.id);

    if (!error) {
      setMode(prev => prev ? { ...prev, current_mode: newMode } : null);
      
      // Initialize mode-specific settings if needed
      if (newMode === 'seller') {
        const { data: existing } = await supabase
          .from('seller_mode_settings' as any)
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!existing) {
          await supabase.from('seller_mode_settings' as any).insert({ user_id: user.id });
        }
        await loadSellerSettings(user.id);
      } else if (newMode === 'rewards') {
        const { data: existing } = await supabase
          .from('rewards_mode_settings' as any)
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!existing) {
          await supabase.from('rewards_mode_settings' as any).insert({ user_id: user.id });
        }
        await loadRewardsSettings(user.id);
      }
    }

    return { error };
  };

  const verifyForSeller = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Simple phone/email verification (already done via auth)
    const { error } = await supabase
      .from('user_stealth_modes' as any)
      .update({ 
        seller_verified: true, 
        seller_verified_at: new Date().toISOString() 
      })
      .eq('user_id', user.id);

    if (!error) {
      setMode(prev => prev ? { ...prev, seller_verified: true } : null);
    }

    return { error };
  };

  const optIntoRewards = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { error } = await supabase
      .from('user_stealth_modes' as any)
      .update({ 
        rewards_opted_in: true, 
        rewards_opted_in_at: new Date().toISOString() 
      })
      .eq('user_id', user.id);

    if (!error) {
      setMode(prev => prev ? { ...prev, rewards_opted_in: true } : null);
    }

    return { error };
  };

  return {
    mode,
    sellerSettings,
    rewardsSettings,
    loading,
    switchMode,
    verifyForSeller,
    optIntoRewards,
    refresh: loadStealthMode
  };
};
