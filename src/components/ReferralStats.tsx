import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MousePointer, UserCheck, Coins, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface ReferralStatsProps {
  userId: string;
}

interface Stats {
  totalInvitesSent: number;
  totalClicks: number;
  totalJoined: number;
  totalCoinsEarned: number;
  conversionRate: number;
}

export const ReferralStats = ({ userId }: ReferralStatsProps) => {
  const [stats, setStats] = useState<Stats>({
    totalInvitesSent: 0,
    totalClicks: 0,
    totalJoined: 0,
    totalCoinsEarned: 0,
    conversionRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Get invite stats
        const { data: invites } = await supabase
          .from('contact_invites')
          .select('status, reward_given')
          .eq('inviter_id', userId);

        if (invites) {
          const sent = invites.length;
          const clicked = invites.filter(i => i.status === 'clicked' || i.status === 'joined').length;
          const joined = invites.filter(i => i.status === 'joined').length;
          const rewarded = invites.filter(i => i.reward_given).length;
          
          setStats({
            totalInvitesSent: sent,
            totalClicks: clicked,
            totalJoined: joined,
            totalCoinsEarned: rewarded * 50, // 50 coins per successful referral
            conversionRate: sent > 0 ? Math.round((joined / sent) * 100) : 0,
          });
        }
      } catch (error) {
        console.error('Failed to load referral stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [userId]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="h-32" />
      </Card>
    );
  }

  const statItems = [
    { icon: Users, label: 'Invites Sent', value: stats.totalInvitesSent, color: 'text-blue-500' },
    { icon: MousePointer, label: 'Link Clicks', value: stats.totalClicks, color: 'text-orange-500' },
    { icon: UserCheck, label: 'Friends Joined', value: stats.totalJoined, color: 'text-green-500' },
    { icon: Coins, label: 'Coins Earned', value: stats.totalCoinsEarned, color: 'text-yellow-500' },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Your Referral Stats
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {statItems.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-muted/50 rounded-lg p-3 text-center">
              <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
              <p className="text-lg font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        {stats.conversionRate > 0 && (
          <p className="text-xs text-center text-muted-foreground mt-3">
            {stats.conversionRate}% conversion rate
          </p>
        )}
      </CardContent>
    </Card>
  );
};
