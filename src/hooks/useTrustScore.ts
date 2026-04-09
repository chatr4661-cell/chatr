import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TrustFactor {
  id: string;
  factor_type: string;
  factor_value: number;
  weight: number;
  source: string | null;
}

export interface TrustProfile {
  score: number;
  tier: 'safe' | 'unknown' | 'risky';
  level: string;
  factors: TrustFactor[];
  color: string;
  emoji: string;
}

export const useTrustScore = () => {
  const [trustProfiles, setTrustProfiles] = useState<Map<string, TrustProfile>>(new Map());

  const getTrustTier = (score: number): TrustProfile['tier'] => {
    if (score >= 70) return 'safe';
    if (score >= 40) return 'unknown';
    return 'risky';
  };

  const getTrustColor = (tier: TrustProfile['tier']): string => {
    switch (tier) {
      case 'safe': return 'text-green-500';
      case 'unknown': return 'text-yellow-500';
      case 'risky': return 'text-red-500';
    }
  };

  const getTrustEmoji = (tier: TrustProfile['tier']): string => {
    switch (tier) {
      case 'safe': return '🟢';
      case 'unknown': return '🟡';
      case 'risky': return '🔴';
    }
  };

  const fetchTrustProfile = useCallback(async (userId: string): Promise<TrustProfile | null> => {
    const cached = trustProfiles.get(userId);
    if (cached) return cached;

    try {
      const [scoreRes, factorsRes] = await Promise.all([
        supabase
          .from('user_trust_scores' as any)
          .select('trust_score, verification_level')
          .eq('user_id', userId)
          .maybeSingle() as any,
        supabase
          .from('trust_factors' as any)
          .select('*')
          .eq('user_id', userId) as any,
      ]);

      const score = scoreRes.data?.trust_score ?? 50;
      const level = scoreRes.data?.verification_level ?? 'unverified';
      const tier = getTrustTier(score);

      const profile: TrustProfile = {
        score,
        tier,
        level,
        factors: factorsRes.data || [],
        color: getTrustColor(tier),
        emoji: getTrustEmoji(tier),
      };

      setTrustProfiles(prev => new Map(prev).set(userId, profile));
      return profile;
    } catch (error) {
      console.error('Failed to fetch trust profile:', error);
      return null;
    }
  }, [trustProfiles]);

  const addTrustFactor = useCallback(async (
    factorType: string,
    factorValue: number,
    weight: number = 1.0,
    source?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('trust_factors' as any)
        .insert({
          user_id: user.id,
          factor_type: factorType,
          factor_value: factorValue,
          weight,
          source: source || 'self',
        } as any);
    } catch (error) {
      console.error('Failed to add trust factor:', error);
    }
  }, []);

  return {
    fetchTrustProfile,
    addTrustFactor,
    trustProfiles,
  };
};
