import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Award, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  avatar_url: string | null;
  referral_count: number;
  coins_earned: number;
}

export function ReferralLeaderboard() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      // Get successful referrals count per user
      const { data: referrals, error } = await supabase
        .from('chatr_referrals')
        .select('referrer_id, coins_earned')
        .eq('status', 'completed');

      if (error) throw error;

      // Aggregate by referrer
      const referralCounts: Record<string, { count: number; coins: number }> = {};
      referrals?.forEach(ref => {
        if (!referralCounts[ref.referrer_id]) {
          referralCounts[ref.referrer_id] = { count: 0, coins: 0 };
        }
        referralCounts[ref.referrer_id].count++;
        referralCounts[ref.referrer_id].coins += ref.coins_earned || 0;
      });

      // Get user profiles for top referrers
      const userIds = Object.keys(referralCounts);
      if (userIds.length === 0) {
        setLeaders([]);
        setLoading(false);
        return;
      }

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      // Build leaderboard
      const leaderboard: LeaderboardEntry[] = (profiles || []).map(profile => ({
        user_id: profile.id,
        username: profile.username || 'Anonymous',
        avatar_url: profile.avatar_url,
        referral_count: referralCounts[profile.id]?.count || 0,
        coins_earned: referralCounts[profile.id]?.coins || 0,
      })).sort((a, b) => b.referral_count - a.referral_count).slice(0, 20);

      setLeaders(leaderboard);

      // Find current user's rank
      if (user?.id) {
        const rank = leaderboard.findIndex(l => l.user_id === user.id);
        setUserRank(rank >= 0 ? rank + 1 : null);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Award className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-xs text-muted-foreground font-medium">{index + 1}</span>;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Top Inviters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="w-5 h-5 text-yellow-500" />
          Top Inviters
        </CardTitle>
        {userRank && (
          <p className="text-xs text-muted-foreground">Your rank: #{userRank}</p>
        )}
      </CardHeader>
      <CardContent>
        {leaders.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No referrals yet. Be the first!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leaders.map((leader, index) => (
              <div
                key={leader.user_id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                  leader.user_id === currentUserId 
                    ? 'bg-primary/10 border border-primary/20' 
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="w-6 flex justify-center">
                  {getRankIcon(index)}
                </div>
                <Avatar className="w-8 h-8">
                  <AvatarImage src={leader.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">
                    {leader.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {leader.username}
                    {leader.user_id === currentUserId && (
                      <span className="text-xs text-primary ml-1">(You)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {leader.coins_earned.toLocaleString()} coins earned
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary">
                    {leader.referral_count}
                  </p>
                  <p className="text-xs text-muted-foreground">referrals</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
