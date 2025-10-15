import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Users,
  TrendingUp,
  Gift,
  Target,
  Copy,
  Share2,
  Download,
  QrCode,
  Trophy,
  Zap,
  Coins,
  ArrowRight,
  Check,
  Star,
  Sparkles
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function ChatrGrowth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalCoinsEarned: 0,
    networkSize: 0,
    rank: null as number | null,
  });
  const [networkStats, setNetworkStats] = useState({
    level1: 0,
    level2: 0,
    level3: 0,
    level4: 0,
  });

  useEffect(() => {
    loadGrowthData();
  }, []);

  const loadGrowthData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Load referral code
      const { data: codeData } = await supabase
        .from('chatr_referral_codes')
        .select('code, qr_code_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (codeData) {
        setReferralCode(codeData.code);
        setQrCodeUrl(codeData.qr_code_url || '');
      } else {
        // Generate referral code
        await generateReferralCode(user.id);
      }

      // Load referral stats
      const { data: referrals } = await supabase
        .from('chatr_referrals')
        .select('*')
        .eq('referrer_id', user.id);

      // Load network stats
      const { data: network } = await supabase
        .from('chatr_referral_network')
        .select('level')
        .eq('root_user_id', user.id);

      // Calculate network by level
      const levelCounts = {
        level1: network?.filter(n => n.level === 1).length || 0,
        level2: network?.filter(n => n.level === 2).length || 0,
        level3: network?.filter(n => n.level === 3).length || 0,
        level4: network?.filter(n => n.level === 4).length || 0,
      };

      setNetworkStats(levelCounts);

      // Load coin balance
      const { data: coinData } = await supabase
        .from('chatr_coin_balances')
        .select('lifetime_earned')
        .eq('user_id', user.id)
        .maybeSingle();

      // Load leaderboard rank
      const { data: leaderboard } = await supabase
        .from('chatr_leaderboards')
        .select('rank')
        .eq('user_id', user.id)
        .eq('leaderboard_type', 'referrals')
        .eq('period', 'all_time')
        .maybeSingle();

      setStats({
        totalReferrals: referrals?.length || 0,
        totalCoinsEarned: coinData?.lifetime_earned || 0,
        networkSize: network?.length || 0,
        rank: leaderboard?.rank || null,
      });
    } catch (error) {
      console.error('Error loading growth data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReferralCode = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-referral-code', {
        body: { userId }
      });

      if (error) throw error;

      if (data?.code) {
        setReferralCode(data.code);
        setQrCodeUrl(data.qrCodeUrl || '');
      }
    } catch (error) {
      console.error('Error generating referral code:', error);
      toast.error('Failed to generate referral code');
    }
  };

  const copyReferralLink = () => {
    const link = `https://chatr.chat?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied!');
  };

  const shareReferralLink = async () => {
    const link = `https://chatr.chat?ref=${referralCode}`;
    const text = `🎁 Join me on Chatr+ and earn ₹500 instantly! Use my code: ${referralCode}\n\n💰 Earn coins, access free healthcare, and build your network!\n\n`;
    
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join Chatr+', text: text + link });
      } catch (error) {
        copyReferralLink();
      }
    } else {
      copyReferralLink();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500/10 via-background to-pink-500/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500/10 via-background to-pink-500/10 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Button
            variant="ghost"
            size="sm"
            className="text-white mb-4 hover:bg-white/20"
            onClick={() => navigate('/')}
          >
            ← Back
          </Button>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-2">
            <Sparkles className="w-8 h-8" />
            Chatr Champions
          </h1>
          <p className="text-purple-100 text-lg">Earn ₹ by growing your network</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">Direct Referrals</span>
            </div>
            <div className="text-3xl font-bold text-blue-600">{stats.totalReferrals}</div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Coins className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-muted-foreground">Coins Earned</span>
            </div>
            <div className="text-3xl font-bold text-amber-600">{stats.totalCoinsEarned.toLocaleString()}</div>
            <div className="text-xs text-amber-600 mt-1">≈ ₹{(stats.totalCoinsEarned / 10).toFixed(0)}</div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-muted-foreground">Network Size</span>
            </div>
            <div className="text-3xl font-bold text-purple-600">{stats.networkSize}</div>
          </Card>

          <Card className="p-4 bg-gradient-to-br from-pink-500/10 to-pink-600/10 border-pink-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-5 h-5 text-pink-600" />
              <span className="text-sm font-medium text-muted-foreground">Rank</span>
            </div>
            <div className="text-3xl font-bold text-pink-600">
              {stats.rank ? `#${stats.rank}` : '-'}
            </div>
          </Card>
        </div>

        {/* Referral Card */}
        <Card className="p-6 bg-gradient-to-br from-primary/5 to-pink-500/5 border-primary/20">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Gift className="w-6 h-6 text-primary" />
            Your Referral Code
          </h2>
          
          <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
            <div className="flex-1 w-full">
              <div className="bg-background rounded-lg p-4 border-2 border-primary/30 mb-3">
                <div className="text-sm text-muted-foreground mb-1">Your unique code</div>
                <div className="text-3xl font-bold text-primary tracking-wider">{referralCode}</div>
              </div>
              <div className="flex gap-2">
                <Button onClick={copyReferralLink} className="flex-1 gap-2">
                  <Copy className="w-4 h-4" />
                  Copy Link
                </Button>
                <Button onClick={shareReferralLink} className="flex-1 gap-2" variant="outline">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg border-2 border-border">
              <QRCodeSVG 
                value={`https://chatr.chat?ref=${referralCode}`}
                size={160}
                level="H"
              />
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-semibold text-green-700 mb-1">Earn up to ₹7,500 per referral!</div>
                <div className="text-sm text-green-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Level 1 (Direct): 500 coins = ₹50</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Level 2: 150 coins = ₹15</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Level 3: 75 coins = ₹7.5</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    <span>Level 4: 25 coins = ₹2.5</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Network Breakdown */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Your Network
          </h2>
          
          <div className="space-y-3">
            {[
              { level: 1, count: networkStats.level1, coins: 500, color: 'blue' },
              { level: 2, count: networkStats.level2, coins: 150, color: 'purple' },
              { level: 3, count: networkStats.level3, coins: 75, color: 'pink' },
              { level: 4, count: networkStats.level4, coins: 25, color: 'orange' },
            ].map(({ level, count, coins, color }) => (
              <div key={level} className={`flex items-center justify-between p-4 rounded-lg bg-${color}-500/10 border border-${color}-500/20`}>
                <div>
                  <div className="font-semibold">Level {level}</div>
                  <div className="text-sm text-muted-foreground">{coins} coins per signup</div>
                </div>
                <div className={`text-2xl font-bold text-${color}-600`}>{count}</div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-amber-700">Potential Monthly Earnings</div>
                <div className="text-sm text-amber-600">If each person refers 10 friends</div>
              </div>
              <div className="text-3xl font-bold text-amber-600">
                ₹{((networkStats.level1 * 10 * 500 + networkStats.level2 * 10 * 150) / 10).toLocaleString()}
              </div>
            </div>
          </div>
        </Card>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card 
            className="p-6 cursor-pointer hover:shadow-lg transition-all bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20"
            onClick={() => navigate('/leaderboard')}
          >
            <Trophy className="w-12 h-12 text-blue-600 mb-3" />
            <h3 className="text-lg font-bold mb-2">View Leaderboard</h3>
            <p className="text-sm text-muted-foreground mb-4">See top performers and compete</p>
            <Button variant="outline" className="w-full gap-2">
              View Rankings <ArrowRight className="w-4 h-4" />
            </Button>
          </Card>

          <Card 
            className="p-6 cursor-pointer hover:shadow-lg transition-all bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-500/20"
            onClick={() => navigate('/referrals')}
          >
            <Users className="w-12 h-12 text-purple-600 mb-3" />
            <h3 className="text-lg font-bold mb-2">Network Tree</h3>
            <p className="text-sm text-muted-foreground mb-4">Visualize your referral network</p>
            <Button variant="outline" className="w-full gap-2">
              View Network <ArrowRight className="w-4 h-4" />
            </Button>
          </Card>
        </div>

        {/* Ambassador Program CTA */}
        <Card className="p-6 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white border-0">
          <div className="flex items-start gap-4">
            <Star className="w-12 h-12 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">Become a Chatr Partner</h3>
              <p className="mb-4 text-purple-100">Earn 5,000 bonus coins + exclusive perks</p>
              <Button 
                variant="secondary" 
                className="gap-2"
                onClick={() => navigate('/ambassador-program')}
              >
                Apply Now <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
