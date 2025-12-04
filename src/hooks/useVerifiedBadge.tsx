import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type BadgeType = 'verified' | 'creator' | 'business' | 'celebrity';

interface Badge {
  type: BadgeType;
  verifiedAt: string;
}

export const useVerifiedBadge = () => {
  const [badges, setBadges] = useState<Map<string, Badge[]>>(new Map());
  const [loading, setLoading] = useState(false);

  const fetchUserBadges = useCallback(async (userId: string): Promise<Badge[]> => {
    const cached = badges.get(userId);
    if (cached) return cached;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_badges')
        .select('badge_type, verified_at')
        .eq('user_id', userId);

      if (error) throw error;

      const userBadges = (data || []).map(b => ({
        type: b.badge_type as BadgeType,
        verifiedAt: b.verified_at
      }));

      setBadges(prev => new Map(prev).set(userId, userBadges));
      return userBadges;
    } catch (error) {
      console.error('Failed to fetch badges:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [badges]);

  const isVerified = useCallback((userId: string): boolean => {
    const userBadges = badges.get(userId);
    return userBadges?.some(b => b.type === 'verified') || false;
  }, [badges]);

  const getPrimaryBadge = useCallback((userId: string): BadgeType | null => {
    const userBadges = badges.get(userId);
    if (!userBadges || userBadges.length === 0) return null;
    
    // Priority: celebrity > business > creator > verified
    const priority: BadgeType[] = ['celebrity', 'business', 'creator', 'verified'];
    for (const type of priority) {
      if (userBadges.some(b => b.type === type)) return type;
    }
    return null;
  }, [badges]);

  const getBadgeColor = useCallback((type: BadgeType): string => {
    switch (type) {
      case 'celebrity': return 'text-yellow-500';
      case 'business': return 'text-blue-500';
      case 'creator': return 'text-purple-500';
      case 'verified': return 'text-primary';
      default: return 'text-primary';
    }
  }, []);

  return {
    loading,
    fetchUserBadges,
    isVerified,
    getPrimaryBadge,
    getBadgeColor,
    badges
  };
};
