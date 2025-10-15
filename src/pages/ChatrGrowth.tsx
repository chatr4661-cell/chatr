import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Coins, Users, Gift, Trophy, Zap, Share2, TrendingUp,
  Copy, QrCode, Award, Star, Target, ArrowRight, Flame
} from 'lucide-react';

export default function ChatrGrowth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [coinBalance, setCoinBalance] = useState(0);
  const [lifetimeEarned, setLifetimeEarned] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [referralStats, setReferralStats] = useState({ total: 0, active: 0 });

  useEffect(() => {
    loadGrowthData();
    processDailyLogin();
  }, []);

  const loadGrowthData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Generate or get referral code
      const { data: codeData } = await supabase.functions.invoke('generate-referral-code');
      if (codeData) {
        setReferralCode(codeData.code);
        setQrCodeUrl(codeData.qrCodeUrl);
      }

      // Get coin balance
      const { data: balance } = await supabase
        .from('chatr_coin_balances')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (balance) {
        setCoinBalance(balance.total_coins);
        setLifetimeEarned(balance.lifetime_earned);
        setCurrentStreak(balance.current_streak || 0);
      }

      // Get referral stats
      const { count: totalReferrals } = await supabase
        .from('chatr_referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id);

      const { count: activeReferrals } = await supabase
        .from('chatr_referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id)
        .eq('status', 'active');

      setReferralStats({
        total: totalReferrals || 0,
        active: activeReferrals || 0
      });

    } catch (error) {
      console.error('Error loading growth data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your growth data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const processDailyLogin = async () => {
    try {
      const { data } = await supabase.functions.invoke('process-daily-login-streak');
      if (data && !data.alreadyLoggedIn && data.coinsAwarded > 0) {
        toast({
          title: `🎉 Daily Login Reward!`,
          description: `You earned ${data.coinsAwarded} coins! Current streak: ${data.currentStreak} days`,
        });
        // Reload balance
        setTimeout(loadGrowthData, 1000);
      }
    } catch (error) {
      console.error('Error processing daily login:', error);
    }
  };

  const copyReferralLink = () => {
    const shareUrl = `https://chatr.app/join/${referralCode}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: 'Copied!',
      description: 'Referral link copied to clipboard',
    });
  };

  const shareReferral = async () => {
    const shareUrl = `https://chatr.app/join/${referralCode}`;
    const shareText = `Join me on Chatr and earn 100 coins! Use my code: ${referralCode}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Chatr',
          text: shareText,
          url: shareUrl
        });
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      copyReferralLink();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header with gradient */}
      <div className="glass-card relative overflow-hidden border-b">
        <div className="absolute inset-0 bg-gradient-hero opacity-10" />
        <div className="max-w-4xl mx-auto px-4 py-6 relative">
          <div className="text-center animate-fade-in">
            <div className="inline-flex items-center gap-2 mb-2">
              <Zap className="h-8 w-8 text-primary animate-pulse" />
              <h1 className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                Growth & Rewards
              </h1>
            </div>
            <p className="text-muted-foreground">
              Earn coins, grow your network, climb leaderboards
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Coin Balance Card */}
        <Card className="glass-card hover:shadow-glow transition-all animate-fade-in relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-hero opacity-5" />
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-gradient-hero">
                  <Coins className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                    {coinBalance.toLocaleString()}
                  </CardTitle>
                  <CardDescription>Chatr Coins (₹{(coinBalance / 10).toFixed(2)})</CardDescription>
                </div>
              </div>
              <Button
                onClick={() => navigate('/chatr-points')}
                variant="outline"
                className="hover:shadow-glow"
              >
                Redeem
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <p className="text-sm text-muted-foreground">Lifetime Earned</p>
                <p className="text-xl font-semibold">{lifetimeEarned.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg bg-primary/10 flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Login Streak</p>
                  <p className="text-xl font-semibold">{currentStreak} days</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Referral Section */}
        <Card className="glass-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle>Your Referral Network</CardTitle>
              </div>
              <Badge variant="default" className="bg-gradient-hero">
                {referralStats.total} referrals
              </Badge>
            </div>
            <CardDescription>
              Earn 500 coins for every friend who joins + network bonuses!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Referral Code */}
            <div className="p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Your Referral Code</p>
                <Button size="sm" variant="ghost" onClick={copyReferralLink}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-2xl font-bold tracking-wider bg-gradient-hero bg-clip-text text-transparent">
                  {referralCode}
                </code>
              </div>
            </div>

            {/* QR Code */}
            {qrCodeUrl && (
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <img src={qrCodeUrl} alt="Referral QR Code" className="w-48 h-48" />
              </div>
            )}

            {/* Share Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={shareReferral} className="hover:shadow-glow">
                <Share2 className="mr-2 h-4 w-4" />
                Share Link
              </Button>
              <Button variant="outline" onClick={() => navigate('/referrals')}>
                <Users className="mr-2 h-4 w-4" />
                View Network
              </Button>
            </div>

            {/* Network Stats */}
            <div className="grid grid-cols-3 gap-3 pt-3 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{referralStats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-500">{referralStats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent">
                  {referralStats.total * 500}
                </p>
                <p className="text-xs text-muted-foreground">Coins Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Earning Opportunities */}
        <Card className="glass-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              <CardTitle>Earn More Coins</CardTitle>
            </div>
            <CardDescription>Complete these actions to earn rewards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { action: 'Refer a friend', coins: 500, icon: Users },
                { action: 'Complete your profile', coins: 100, icon: Target },
                { action: 'Install 3 mini-apps', coins: 200, icon: Star },
                { action: 'Create content/post', coins: 100, icon: Trophy },
                { action: '7-day login streak', coins: 200, icon: Flame },
                { action: 'Refer a business', coins: 1000, icon: TrendingUp }
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <item.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium">{item.action}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span className="font-semibold">{item.coins}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <Button
            onClick={() => navigate('/leaderboard')}
            className="h-auto p-6 flex flex-col gap-2 hover:shadow-glow"
            variant="outline"
          >
            <Trophy className="h-6 w-6 text-primary" />
            <span className="font-semibold">Leaderboard</span>
            <span className="text-xs text-muted-foreground">See top earners</span>
          </Button>

          <Button
            onClick={() => navigate('/rewards-history')}
            className="h-auto p-6 flex flex-col gap-2 hover:shadow-glow"
            variant="outline"
          >
            <Award className="h-6 w-6 text-accent" />
            <span className="font-semibold">My Rewards</span>
            <span className="text-xs text-muted-foreground">View history</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
