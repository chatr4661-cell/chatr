import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, ArrowRight, CheckCircle, Clock, XCircle, TrendingUp } from 'lucide-react';

export default function ReferralNetwork() {
  const navigate = useNavigate();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [networkStats, setNetworkStats] = useState({
    level1: 0,
    level2: 0,
    level3: 0,
    level4: 0,
    totalCoins: 0
  });

  useEffect(() => {
    loadReferrals();
    loadNetworkStats();
  }, []);

  const loadReferrals = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/auth');
      return;
    }

    const { data } = await supabase
      .from('chatr_referrals')
      .select(`
        *,
        profiles:referred_user_id (username, avatar_url)
      `)
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    setReferrals(data || []);
  };

  const loadNetworkStats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get network breakdown by level
    const { data: network } = await supabase
      .from('chatr_referral_network')
      .select('level')
      .eq('root_user_id', user.id);

    const stats = {
      level1: 0,
      level2: 0,
      level3: 0,
      level4: 0,
      totalCoins: 0
    };

    network?.forEach((entry) => {
      if (entry.level === 1) stats.level1++;
      if (entry.level === 2) stats.level2++;
      if (entry.level === 3) stats.level3++;
      if (entry.level === 4) stats.level4++;
    });

    // Calculate total coins (approximation)
    stats.totalCoins = stats.level1 * 500 + stats.level2 * 150 + stats.level3 * 75 + stats.level4 * 25;

    setNetworkStats(stats);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="glass-card border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">My Network</h1>
              <p className="text-muted-foreground">Multi-level referral structure</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Network Stats */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Network Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-primary/10 text-center">
                <p className="text-sm text-muted-foreground mb-1">Level 1</p>
                <p className="text-3xl font-bold text-primary">{networkStats.level1}</p>
                <p className="text-xs text-muted-foreground mt-1">Direct referrals</p>
              </div>
              <div className="p-4 rounded-lg bg-accent/10 text-center">
                <p className="text-sm text-muted-foreground mb-1">Level 2</p>
                <p className="text-3xl font-bold text-accent">{networkStats.level2}</p>
                <p className="text-xs text-muted-foreground mt-1">2nd tier</p>
              </div>
              <div className="p-4 rounded-lg bg-primary/10 text-center">
                <p className="text-sm text-muted-foreground mb-1">Level 3</p>
                <p className="text-3xl font-bold text-primary">{networkStats.level3}</p>
                <p className="text-xs text-muted-foreground mt-1">3rd tier</p>
              </div>
              <div className="p-4 rounded-lg bg-accent/10 text-center">
                <p className="text-sm text-muted-foreground mb-1">Level 4</p>
                <p className="text-3xl font-bold text-accent">{networkStats.level4}</p>
                <p className="text-xs text-muted-foreground mt-1">4th tier</p>
              </div>
            </div>
            <div className="mt-4 p-4 rounded-lg bg-gradient-hero text-white text-center">
              <p className="text-sm opacity-90">Total Network Earnings</p>
              <p className="text-3xl font-bold">{networkStats.totalCoins.toLocaleString()} coins</p>
            </div>
          </CardContent>
        </Card>

        {/* Referrals List */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Direct Referrals (Level 1)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referrals.length > 0 ? (
                referrals.map((ref) => (
                  <div
                    key={ref.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-gradient-hero text-white">
                          {ref.profiles?.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{ref.profiles?.username || 'User'}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {new Date(ref.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant={ref.status === 'active' ? 'default' : 'secondary'}>
                        {getStatusIcon(ref.status)}
                        <span className="ml-1">{ref.status}</span>
                      </Badge>
                      {ref.status === 'active' && (
                        <span className="text-sm font-semibold text-primary">+500 coins</span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No referrals yet</p>
                  <p className="text-sm">Share your code to start building your network!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* How it Works */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>How Multi-Level Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { level: 1, bonus: 500, desc: 'Your direct referrals' },
              { level: 2, bonus: 150, desc: 'People referred by your referrals' },
              { level: 3, bonus: 75, desc: 'Third level down' },
              { level: 4, bonus: 25, desc: 'Fourth level down' }
            ].map((item) => (
              <div key={item.level} className="flex items-center justify-between p-3 rounded-lg bg-accent/5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="font-bold text-primary">{item.level}</span>
                  </div>
                  <div>
                    <p className="font-medium">Level {item.level}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <span className="font-semibold text-primary">{item.bonus} coins</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
