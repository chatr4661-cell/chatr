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
  Sparkles,
  MapPin
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { LiveLocationSharing } from '@/components/LiveLocationSharing';
import { ContactInvitation } from '@/components/ContactInvitation';

export default function ChatrGrowth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
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

      setUserId(user.id);
      setUsername(user.user_metadata?.username || user.email?.split('@')[0] || '');

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
        <div className="max-w-4xl mx-auto px-3 py-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-white mb-2 hover:bg-white/20 h-8 text-xs"
            onClick={() => navigate('/')}
          >
            ← Back
          </Button>
          <h1 className="text-xl font-bold mb-1 flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Chatr Champions
          </h1>
          <p className="text-purple-100 text-sm">Earn ₹ by growing your network</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Compact Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <Card className="p-2.5 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-[11px] font-medium text-muted-foreground">Referrals</span>
            </div>
            <div className="text-xl font-bold text-blue-600">{stats.totalReferrals}</div>
          </Card>

          <Card className="p-2.5 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-[11px] font-medium text-muted-foreground">Coins</span>
            </div>
            <div className="text-xl font-bold text-amber-600">{stats.totalCoinsEarned.toLocaleString()}</div>
            <div className="text-[10px] text-amber-600">≈ ₹{(stats.totalCoinsEarned / 10).toFixed(0)}</div>
          </Card>

          <Card className="p-2.5 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-1.5 mb-0.5">
              <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-[11px] font-medium text-muted-foreground">Network</span>
            </div>
            <div className="text-xl font-bold text-purple-600">{stats.networkSize}</div>
          </Card>

          <Card className="p-2.5 bg-gradient-to-br from-pink-50 to-pink-100 border-pink-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Trophy className="w-3.5 h-3.5 text-pink-600" />
              <span className="text-[11px] font-medium text-muted-foreground">Rank</span>
            </div>
            <div className="text-xl font-bold text-pink-600">
              {stats.rank ? `#${stats.rank}` : '-'}
            </div>
          </Card>
        </div>

        {/* Live Location & Invite Friends Section */}
        {userId && (
          <div className="animate-fade-in" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
            <div className="mb-3">
              <h2 className="text-base font-bold text-[#2E1065]">Quick Actions</h2>
              <div className="h-px w-full bg-gradient-to-r from-purple-200 to-transparent mt-1.5"></div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="transform scale-[0.75] origin-top">
                <LiveLocationSharing userId={userId} />
              </div>
              <div className="transform scale-[0.75] origin-top">
                <ContactInvitation userId={userId} username={username} />
              </div>
            </div>
          </div>
        )}

        {/* Referral Code Section */}
        <div className="animate-fade-in" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <div className="mb-3">
            <h2 className="text-base font-bold text-[#2E1065]">Referral & Rewards</h2>
            <div className="h-px w-full bg-gradient-to-r from-purple-200 to-transparent mt-1.5"></div>
          </div>
          <Card className="p-4 bg-gradient-to-br from-primary/5 to-pink-500/5 border-primary/20 hover:shadow-md transition-all">
            <h3 className="text-sm font-bold mb-2.5 flex items-center gap-2">
              <Gift className="w-4 h-4 text-primary" />
              Your Referral Code
            </h3>
            
            <div className="flex flex-col md:flex-row gap-3 items-center mb-3">
              <div className="flex-1 w-full">
                <div className="bg-background rounded-lg p-2.5 border-2 border-primary/30 mb-2">
                  <div className="text-[10px] text-muted-foreground mb-0.5">Your unique code</div>
                  <div className="text-xl font-bold text-primary tracking-wider">{referralCode}</div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={copyReferralLink} className="flex-1 gap-1.5 h-9 text-xs">
                    <Copy className="w-3.5 h-3.5" />
                    Copy Link
                  </Button>
                  <Button onClick={shareReferralLink} className="flex-1 gap-1.5 h-9 text-xs" variant="outline">
                    <Share2 className="w-3.5 h-3.5" />
                    Share
                  </Button>
                </div>
              </div>
              
              <div className="bg-white p-2.5 rounded-lg border-2 border-border">
                <QRCodeSVG 
                  value={`https://chatr.chat?ref=${referralCode}`}
                  size={100}
                  level="H"
                />
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-2.5">
              <div className="flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <div className="font-semibold text-green-700 text-xs mb-0.5">Earn up to ₹7,500 per referral!</div>
                  <div className="text-[11px] text-green-600 space-y-0.5">
                    <div className="flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" />
                      <span>Level 1 (Direct): 500 coins = ₹50</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" />
                      <span>Level 2: 150 coins = ₹15</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" />
                      <span>Level 3: 75 coins = ₹7.5</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Check className="w-2.5 h-2.5" />
                      <span>Level 4: 25 coins = ₹2.5</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Compact Network Breakdown */}
        <Card className="p-4 animate-fade-in hover:shadow-md transition-all" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
          <h3 className="text-sm font-bold mb-2.5 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Your Network
          </h3>
          
          <div className="space-y-2">
            {[
              { level: 1, count: networkStats.level1, coins: 500, color: 'blue' },
              { level: 2, count: networkStats.level2, coins: 150, color: 'purple' },
              { level: 3, count: networkStats.level3, coins: 75, color: 'pink' },
              { level: 4, count: networkStats.level4, coins: 25, color: 'orange' },
            ].map(({ level, count, coins }) => (
              <div key={level} className="flex items-center justify-between p-2.5 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 hover:shadow-sm transition-all">
                <div>
                  <div className="font-semibold text-xs">Level {level}</div>
                  <div className="text-[11px] text-muted-foreground">{coins} coins per signup</div>
                </div>
                <div className="text-lg font-bold text-[#9333EA]">{count}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 p-2.5 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-amber-700 text-xs">Potential Monthly Earnings</div>
                <div className="text-[10px] text-amber-600">If each person refers 10 friends</div>
              </div>
              <div className="text-xl font-bold text-amber-600">
                ₹{((networkStats.level1 * 10 * 500 + networkStats.level2 * 10 * 150) / 10).toLocaleString()}
              </div>
            </div>
          </div>
        </Card>

        {/* Compact Action Cards */}
        <div className="grid md:grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
          <Card 
            className="p-3 cursor-pointer hover:shadow-lg transition-all bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
            onClick={() => navigate('/leaderboard')}
          >
            <Trophy className="w-8 h-8 text-blue-600 mb-1.5" />
            <h3 className="text-sm font-bold mb-0.5">View Leaderboard</h3>
            <p className="text-[11px] text-muted-foreground mb-2.5">See top performers and compete</p>
            <Button variant="outline" size="sm" className="w-full gap-1.5 h-8 text-xs">
              View Rankings <ArrowRight className="w-3 h-3" />
            </Button>
          </Card>

          <Card 
            className="p-3 cursor-pointer hover:shadow-lg transition-all bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200"
            onClick={() => navigate('/referrals')}
          >
            <Users className="w-8 h-8 text-purple-600 mb-1.5" />
            <h3 className="text-sm font-bold mb-0.5">Network Tree</h3>
            <p className="text-[11px] text-muted-foreground mb-2.5">Visualize your referral network</p>
            <Button variant="outline" size="sm" className="w-full gap-1.5 h-8 text-xs">
              View Network <ArrowRight className="w-3 h-3" />
            </Button>
          </Card>
        </div>

        {/* Compact Ambassador Program CTA */}
        <Card className="p-4 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white border-0 animate-fade-in hover:shadow-lg transition-all" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
          <div className="flex items-start gap-2.5">
            <Star className="w-8 h-8 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-0.5">Become a Chatr Partner</h3>
              <p className="mb-2.5 text-purple-100 text-xs">Earn 5,000 bonus coins + exclusive perks</p>
              <Button 
                variant="secondary" 
                size="sm"
                className="gap-1.5 h-8 text-xs"
                onClick={() => navigate('/ambassador-program')}
              >
                Apply Now <ArrowRight className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
