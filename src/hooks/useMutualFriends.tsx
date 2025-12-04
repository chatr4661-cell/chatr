import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MutualFriend {
  id: string;
  username: string;
  avatarUrl?: string;
}

export const useMutualFriends = () => {
  const [loading, setLoading] = useState(false);
  const [mutualFriendsMap, setMutualFriendsMap] = useState<Map<string, MutualFriend[]>>(new Map());

  const fetchMutualFriends = useCallback(async (userId: string): Promise<MutualFriend[]> => {
    const cached = mutualFriendsMap.get(userId);
    if (cached) return cached;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get my contacts using friend_id column
      const { data: myContacts } = await supabase
        .from('contacts')
        .select('friend_id')
        .eq('user_id', user.id);

      // Get their contacts
      const { data: theirContacts } = await supabase
        .from('contacts')
        .select('friend_id')
        .eq('user_id', userId);

      if (!myContacts || !theirContacts) return [];

      const myContactIds = new Set(myContacts.map((c: any) => c.friend_id));
      const mutualIds = theirContacts
        .filter((c: any) => myContactIds.has(c.friend_id))
        .map((c: any) => c.friend_id);

      if (mutualIds.length === 0) return [];

      // Fetch mutual friend profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', mutualIds);

      const mutualFriends = (profiles || []).map(p => ({
        id: p.id,
        username: p.username || 'Unknown',
        avatarUrl: p.avatar_url || undefined
      }));

      setMutualFriendsMap(prev => new Map(prev).set(userId, mutualFriends));

      // Update database cache
      await supabase.from('mutual_friends').upsert({
        user_a: user.id < userId ? user.id : userId,
        user_b: user.id < userId ? userId : user.id,
        mutual_friend_ids: mutualIds,
        mutual_count: mutualIds.length,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_a,user_b' });

      return mutualFriends;
    } catch (error) {
      console.error('Failed to fetch mutual friends:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [mutualFriendsMap]);

  const getMutualCount = useCallback((userId: string): number => {
    return mutualFriendsMap.get(userId)?.length || 0;
  }, [mutualFriendsMap]);

  return {
    loading,
    fetchMutualFriends,
    getMutualCount,
    mutualFriendsMap
  };
};
