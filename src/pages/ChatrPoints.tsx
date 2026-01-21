import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, Coins, Gift, History, ShoppingCart, TrendingUp, Trophy, 
  Users, Share2, Flame, Medal, CheckCircle, 
  Loader2, Copy, Sparkles, Crown, Wallet
} from "lucide-react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { SocialShareDialog } from "@/components/SocialShareDialog";
import { UPIPaymentModal } from "@/components/payment/UPIPaymentModal";
import { motion } from "framer-motion";

interface UserPoints {
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
}

interface PointTransaction {
  id: string;
  amount: number;
  transaction_type: string;
  source: string;
  description: string;
  created_at: string;
}

interface UserRedemption {
  id: string;
  reward: {
    name: string;
    description: string;
    icon: string;
  };
  points_spent: number;
  status: string;
  redeemed_at: string;
  expires_at: string;
  redemption_code: string;
}

interface CoinPackage {
  name: string;
  coins: number;
  bonus: number;
  price: number;
  popular: boolean;
  badge?: string;
}

const COIN_REWARDS = [
  { icon: '🚫', name: 'Ad-Free for 7 Days', description: 'Enjoy Chatr without ads for a week', coins: 500, value: '₹50' },
  { icon: '💊', name: 'Free Medicine Delivery', description: 'Get free delivery on your next medicine order', coins: 1000, discount: '100% OFF', value: '₹100' },
  { icon: '🏥', name: '10% Off Next Consultation', description: 'Save 10% on your next doctor consultation', coins: 2000, discount: '10% OFF', value: '₹200' },
  { icon: '🛒', name: '₹500 Marketplace Credit', description: 'Get ₹500 discount on marketplace purchases', coins: 3000, discount: '₹500 OFF', value: '₹300' },
  { icon: '🔬', name: '25% Off Lab Tests', description: 'Save 25% on your next lab test booking', coins: 5000, discount: '25% OFF', value: '₹500' },
  { icon: '⭐', name: 'Premium Features (30 Days)', description: 'Unlock all premium features for a month', coins: 7500, value: '₹750' },
  { icon: '🏠', name: 'Free Home Care Visit', description: 'One free home healthcare service visit', coins: 10000, discount: '100% OFF', value: '₹1,000' }
];

const COIN_PACKAGES: CoinPackage[] = [
  { name: 'Starter Pack', coins: 2500, bonus: 0, price: 199, popular: false },
  { name: 'Value Pack', coins: 6000, bonus: 500, price: 499, popular: true, badge: 'MOST POPULAR' },
  { name: 'Premium Pack', coins: 15000, bonus: 2000, price: 999, popular: false, badge: 'BEST VALUE' },
  { name: 'Ultimate Pack', coins: 40000, bonus: 8000, price: 2499, popular: false, badge: 'ULTIMATE' }
];

const EARN_ACTIONS = [
  { icon: '👥', title: 'Refer a Friend', coins: 500, rupees: 50, desc: 'Each new user via your code' },
  { icon: '🎯', title: 'Complete Your Profile', coins: 100, rupees: 10, desc: 'Fill in all profile details' },
  { icon: '📱', title: 'Install 3 Mini-Apps', coins: 200, rupees: 20, desc: 'Try out our mini-apps' },
  { icon: '✍️', title: 'Create Content/Post', coins: 100, rupees: 10, desc: 'Share in communities' },
  { icon: '🔥', title: '7-Day Login Streak', coins: 200, rupees: 20, desc: 'Login daily for a week' },
  { icon: '🏢', title: 'Refer a Business', coins: 1000, rupees: 100, desc: 'Bring businesses to Chatr' },
  { icon: '💬', title: 'Daily Login', coins: 50, rupees: 5, desc: 'Login every day' },
  { icon: '📊', title: 'Upload Lab Reports', coins: 250, rupees: 25, desc: 'Add health documents' },
  { icon: '💊', title: 'Medicine Adherence', coins: 50, rupees: 5, desc: 'Take medicines on time' }
];

export default function ChatrPoints() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [redemptions, setRedemptions] = useState<UserRedemption[]>([]);
  
  // Unified coin economy states
  const [coinBalance, setCoinBalance] = useState(0);
  const [lifetimeEarned, setLifetimeEarned] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  
  // Referral states
  const [referralCode, setReferralCode] = useState('');
  const [referralStats, setReferralStats] = useState({ total: 0, active: 0 });
  const [referrals, setReferrals] = useState<any[]>([]);
  const [networkStats, setNetworkStats] = useState({ level1: 0, level2: 0, level3: 0, level4: 0, totalCoins: 0 });
  
  // Leaderboard
  const [leaderboards, setLeaderboards] = useState<any[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState('referrals');
  
  // UI states
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  useEffect(() => {
    if (leaderboardTab) loadLeaderboards();
  }, [leaderboardTab]);

  const checkAuthAndLoad = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    
    await Promise.all([
      loadPointsData(),
      loadGrowthData(),
      processDailyLogin()
    ]);
  };

  const loadPointsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [pointsResult, transResult, redemptionsResult] = await Promise.all([
        supabase.from("user_points").select("*").eq("user_id", user.id).single(),
        supabase.from("point_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("user_reward_redemptions").select(`*, reward:reward_id (*)`).eq("user_id", user.id).order("redeemed_at", { ascending: false })
      ]);

      setUserPoints(pointsResult.data);
      setTransactions(transResult.data || []);
      setRedemptions(redemptionsResult.data as any || []);
    } catch (error: any) {
      console.error('Error loading points data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGrowthData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Generate or get referral code - FIX: use correct property name
      const { data: codeData } = await supabase.functions.invoke('generate-referral-code');
      if (codeData) {
        // The edge function returns 'referralCode' not 'code'
        setReferralCode(codeData.referralCode || codeData.code || '');
      }

      // Get coin balance from chatr_coin_balances
      const { data: balance } = await supabase
        .from('chatr_coin_balances')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (balance) {
        setCoinBalance(balance.total_coins || 0);
        setLifetimeEarned(balance.lifetime_earned || 0);
        setCurrentStreak(balance.current_streak || 0);
        setLongestStreak(balance.longest_streak || 0);
      }

      // Get referral stats
      const [totalResult, activeResult] = await Promise.all([
        supabase.from('chatr_referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', user.id),
        supabase.from('chatr_referrals').select('*', { count: 'exact', head: true }).eq('referrer_id', user.id).eq('status', 'active')
      ]);

      setReferralStats({
        total: totalResult.count || 0,
        active: activeResult.count || 0
      });

      // Load referrals list
      const { data: refData } = await supabase
        .from('chatr_referrals')
        .select(`*, profiles:referred_user_id (username, avatar_url)`)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      setReferrals(refData || []);

      // Load network stats
      const { data: network } = await supabase
        .from('chatr_referral_network')
        .select('level')
        .eq('root_user_id', user.id);

      const stats = { level1: 0, level2: 0, level3: 0, level4: 0, totalCoins: 0 };
      network?.forEach((entry) => {
        if (entry.level === 1) stats.level1++;
        else if (entry.level === 2) stats.level2++;
        else if (entry.level === 3) stats.level3++;
        else if (entry.level === 4) stats.level4++;
      });
      stats.totalCoins = stats.level1 * 500 + stats.level2 * 150 + stats.level3 * 75 + stats.level4 * 25;
      setNetworkStats(stats);

    } catch (error) {
      console.error('Error loading growth data:', error);
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
        // Refresh data after a short delay
        setTimeout(() => {
          loadPointsData();
          loadGrowthData();
        }, 500);
      }
    } catch (error) {
      console.error('Error processing daily login:', error);
    }
  };

  const loadLeaderboards = async () => {
    const { data } = await supabase
      .from('chatr_leaderboards')
      .select(`*, profiles:user_id (username, avatar_url)`)
      .eq('leaderboard_type', leaderboardTab)
      .eq('period', 'monthly')
      .order('rank')
      .limit(100);

    setLeaderboards(data || []);
  };

  const copyReferralLink = () => {
    const shareUrl = `https://chatr.chat/auth?ref=${referralCode}`;
    navigator.clipboard.writeText(shareUrl);
    toast({ title: 'Copied! 📋', description: 'Referral link copied to clipboard' });
  };

  const handleRedeemCoinReward = async (rewardName: string, coinsRequired: number) => {
    try {
      setRedeeming(rewardName);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Please login to redeem", variant: "destructive" });
        return;
      }

      if (coinBalance < coinsRequired) {
        toast({
          title: "Insufficient Coins",
          description: `You need ${coinsRequired - coinBalance} more coins`,
          variant: "destructive"
        });
        return;
      }

      const redemptionCode = `CHATR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Deduct coins
      await supabase
        .from('chatr_coin_balances')
        .update({ total_coins: coinBalance - coinsRequired, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      // Record transaction
      await supabase.from('chatr_coin_transactions').insert({
        user_id: user.id,
        transaction_type: 'spend',
        amount: -coinsRequired,
        source: 'reward_redemption',
        description: `Redeemed: ${rewardName}`,
        reference_id: redemptionCode
      });

      setCoinBalance(prev => prev - coinsRequired);
      
      toast({
        title: "Reward Redeemed! 🎉",
        description: `Code: ${redemptionCode} - Valid for 30 days`,
      });

      loadPointsData();
      loadGrowthData();
    } catch (error: any) {
      toast({ title: "Redemption failed", description: error.message, variant: "destructive" });
    } finally {
      setRedeeming(null);
    }
  };

  const handleBuyCoins = (pkg: CoinPackage) => {
    setSelectedPackage(pkg);
    setShowPaymentModal(true);
  };

  const handlePaymentSubmitted = async (paymentId: string) => {
    if (!selectedPackage) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('chatr_coin_transactions').insert({
        user_id: user.id,
        transaction_type: 'purchase_pending',
        amount: selectedPackage.coins + selectedPackage.bonus,
        source: 'coin_purchase',
        description: `${selectedPackage.name} - ₹${selectedPackage.price} (Pending verification)`,
        reference_id: paymentId,
        metadata: { package_name: selectedPackage.name, price: selectedPackage.price, coins: selectedPackage.coins, bonus: selectedPackage.bonus }
      });

      toast({
        title: "Payment Submitted! 🎉",
        description: `Your ${selectedPackage.name} purchase is pending verification.`,
      });

      setShowPaymentModal(false);
      setSelectedPackage(null);
    } catch (error) {
      console.error('Error recording purchase:', error);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-orange-600" />;
    return null;
  };

  const getTransactionIcon = (type: string) => {
    if (type === "earn") return "💰";
    if (type === "spend") return "💸";
    if (type === "purchase") return "💳";
    if (type === "bonus") return "🎁";
    return "📊";
  };

  // Unified balance = coin balance (primary currency)
  const displayBalance = coinBalance || userPoints?.balance || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <Coins className="w-16 h-16 mx-auto mb-4 text-primary" />
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-primary/30"
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
          <p className="text-muted-foreground">Loading your wallet...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Premium Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        
        <div className="relative p-6 pb-24">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4 text-primary-foreground hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary-foreground flex items-center gap-2">
                <Wallet className="w-7 h-7" />
                Chatr Wallet
              </h1>
              <p className="text-primary-foreground/70 text-sm mt-1">
                Earn • Spend • Grow
              </p>
            </div>
            
            {/* Streak Badge */}
            {currentStreak > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full"
              >
                <Flame className="h-4 w-4 text-orange-300" />
                <span className="text-sm font-semibold text-primary-foreground">{currentStreak} days</span>
              </motion.div>
            )}
          </div>

          {/* Balance Card */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="mt-6"
          >
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20">
              <div className="flex items-center gap-2 text-primary-foreground/70 text-sm mb-2">
                <Coins className="h-4 w-4" />
                Available Balance
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-5xl font-bold text-primary-foreground">
                  {displayBalance.toLocaleString()}
                </span>
                <span className="text-primary-foreground/60 text-sm">coins</span>
              </div>
              <div className="text-primary-foreground/60 text-sm mt-1">
                ≈ ₹{(displayBalance / 10).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-green-300">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-xs">Earned</span>
                  </div>
                  <div className="text-lg font-bold text-primary-foreground mt-1">
                    {lifetimeEarned.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-orange-300">
                    <Flame className="h-4 w-4" />
                    <span className="text-xs">Best Streak</span>
                  </div>
                  <div className="text-lg font-bold text-primary-foreground mt-1">
                    {longestStreak} days
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-4 gap-2 mt-4"
          >
            {[
              { icon: Gift, label: 'Redeem', action: () => setActiveTab('rewards') },
              { icon: ShoppingCart, label: 'Buy', action: () => setActiveTab('buy') },
              { icon: Share2, label: 'Refer', action: () => setActiveTab('referral') },
              { icon: Trophy, label: 'Rank', action: () => setActiveTab('leaderboard') },
            ].map((item, i) => (
              <Button
                key={i}
                variant="ghost"
                onClick={item.action}
                className="flex-col h-auto py-3 bg-white/10 hover:bg-white/20 text-primary-foreground rounded-xl"
              >
                <item.icon className="h-5 w-5 mb-1" />
                <span className="text-xs">{item.label}</span>
              </Button>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 -mt-12 pb-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-card shadow-lg rounded-xl p-1">
            <TabsTrigger value="overview" className="text-xs rounded-lg">Overview</TabsTrigger>
            <TabsTrigger value="rewards" className="text-xs rounded-lg">Rewards</TabsTrigger>
            <TabsTrigger value="buy" className="text-xs rounded-lg">Buy</TabsTrigger>
            <TabsTrigger value="referral" className="text-xs rounded-lg">Refer</TabsTrigger>
            <TabsTrigger value="history" className="text-xs rounded-lg">History</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Earn More Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Ways to Earn
                </CardTitle>
                <CardDescription>Complete actions to earn coins</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {EARN_ACTIONS.slice(0, 5).map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-primary font-bold">
                        <Coins className="h-3.5 w-3.5 text-yellow-500" />
                        {item.coins}
                      </div>
                      <p className="text-xs text-muted-foreground">₹{item.rupees}</p>
                    </div>
                  </motion.div>
                ))}
                <Button variant="outline" className="w-full mt-2" onClick={() => setActiveTab('referral')}>
                  View All Ways to Earn
                </Button>
              </CardContent>
            </Card>

            {/* Referral Quick Card */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Your Referral Code</p>
                    <p className="text-2xl font-bold font-mono tracking-wider text-primary">
                      {referralCode || '------'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="outline" onClick={copyReferralLink} disabled={!referralCode}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" onClick={() => setShowShareDialog(true)} disabled={!referralCode}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                  <div className="text-center flex-1">
                    <p className="text-xl font-bold text-primary">{referralStats.total}</p>
                    <p className="text-xs text-muted-foreground">Referrals</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-xl font-bold text-green-500">{referralStats.active}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-xl font-bold text-amber-500">{referralStats.total * 500}</p>
                    <p className="text-xs text-muted-foreground">Coins Earned</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="mt-4 space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  Redeem Coins
                </CardTitle>
                <CardDescription>1 coin = ₹0.10 value</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {COIN_REWARDS.map((reward, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-xl border bg-card hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-3xl">{reward.icon}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{reward.name}</h3>
                        <p className="text-sm text-muted-foreground">{reward.description}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <Badge variant="secondary" className="bg-primary/10">
                            <Coins className="w-3 h-3 mr-1 text-yellow-500" />
                            {reward.coins.toLocaleString()}
                          </Badge>
                          <Badge variant="outline">{reward.value}</Badge>
                          {reward.discount && (
                            <Badge className="bg-green-500">{reward.discount}</Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleRedeemCoinReward(reward.name, reward.coins)}
                        disabled={displayBalance < reward.coins || redeeming === reward.name}
                        className="shrink-0"
                      >
                        {redeeming === reward.name ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : displayBalance >= reward.coins ? (
                          'Redeem'
                        ) : (
                          `Need ${(reward.coins - displayBalance).toLocaleString()}`
                        )}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => navigate('/reward-shop')}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Browse Full Reward Shop
            </Button>
          </TabsContent>

          {/* Buy Tab */}
          <TabsContent value="buy" className="mt-4 space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  Buy Coins
                </CardTitle>
                <CardDescription>Get more coins to unlock rewards</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {COIN_PACKAGES.map((pkg, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      pkg.popular 
                        ? 'border-primary shadow-lg bg-primary/5' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {pkg.badge && (
                      <div className="absolute -top-2 right-4 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full font-semibold">
                        {pkg.badge}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{pkg.name}</h3>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-3xl font-bold text-primary">
                            {(pkg.coins + pkg.bonus).toLocaleString()}
                          </span>
                          <span className="text-muted-foreground text-sm">coins</span>
                        </div>
                        {pkg.bonus > 0 && (
                          <Badge variant="secondary" className="mt-2 bg-green-100 text-green-700">
                            +{pkg.bonus.toLocaleString()} BONUS
                          </Badge>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Worth ₹{((pkg.coins + pkg.bonus) / 10).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">₹{pkg.price}</div>
                        <Button 
                          size="sm" 
                          className="mt-2"
                          onClick={() => handleBuyCoins(pkg)}
                        >
                          Buy Now
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Referral Tab */}
          <TabsContent value="referral" className="mt-4 space-y-4">
            {/* Referral Code Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Your Referral Code
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border-2 border-dashed border-primary/30 text-center">
                  <code className="text-3xl font-bold tracking-[0.3em] text-primary">
                    {referralCode || 'LOADING'}
                  </code>
                </div>

                {referralCode && (
                  <div className="flex justify-center p-4 bg-white rounded-xl">
                    <QRCodeSVG 
                      value={`https://chatr.chat/auth?ref=${referralCode}`} 
                      size={180}
                      level="M"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={copyReferralLink} disabled={!referralCode}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                  <Button onClick={() => setShowShareDialog(true)} disabled={!referralCode}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                </div>

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
                    <p className="text-2xl font-bold text-amber-500">{referralStats.total * 500}</p>
                    <p className="text-xs text-muted-foreground">Coins</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Network Stats */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Your Network
                </CardTitle>
                <CardDescription>Multi-level referral earnings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { level: 1, count: networkStats.level1, bonus: 500 },
                    { level: 2, count: networkStats.level2, bonus: 150 },
                    { level: 3, count: networkStats.level3, bonus: 75 },
                    { level: 4, count: networkStats.level4, bonus: 25 },
                  ].map((item) => (
                    <div key={item.level} className="text-center p-3 rounded-xl bg-muted/50">
                      <div className="text-xs text-muted-foreground">L{item.level}</div>
                      <div className="text-xl font-bold">{item.count}</div>
                      <div className="text-xs text-primary">+{item.bonus}</div>
                    </div>
                  ))}
                </div>
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-center">
                  <p className="text-sm opacity-80">Total Network Earnings</p>
                  <p className="text-3xl font-bold">{networkStats.totalCoins.toLocaleString()} coins</p>
                </div>
              </CardContent>
            </Card>

            {/* All Earn Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>All Ways to Earn</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {EARN_ACTIONS.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{item.icon}</span>
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-primary font-bold">
                        <Coins className="h-3.5 w-3.5 text-yellow-500" />
                        {item.coins}
                      </div>
                      <p className="text-xs text-muted-foreground">₹{item.rupees}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4 space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Transaction History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length > 0 ? (
                  <div className="space-y-2">
                    {transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 rounded-xl bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getTransactionIcon(transaction.transaction_type)}</span>
                          <div>
                            <p className="font-medium text-sm">{transaction.description}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(transaction.created_at), "MMM d, yyyy 'at' h:mm a")}
                            </p>
                          </div>
                        </div>
                        <div className={`font-bold ${transaction.amount > 0 ? "text-green-600" : "text-red-500"}`}>
                          {transaction.amount > 0 ? "+" : ""}{transaction.amount}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No transactions yet</p>
                    <p className="text-sm">Start earning coins to see your history!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Active Redemptions */}
            {redemptions.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Active Rewards
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {redemptions.map((redemption) => (
                    <div key={redemption.id} className="p-4 rounded-xl border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{redemption.reward?.icon || '🎁'}</span>
                          <span className="font-medium">{redemption.reward?.name}</span>
                        </div>
                        <Badge variant={redemption.status === 'active' ? 'default' : 'secondary'}>
                          {redemption.status}
                        </Badge>
                      </div>
                      <div className="bg-muted p-2 rounded-lg font-mono text-sm">
                        {redemption.redemption_code}
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>Redeemed: {format(new Date(redemption.redeemed_at), "MMM d, yyyy")}</span>
                        <span>Expires: {format(new Date(redemption.expires_at), "MMM d, yyyy")}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Leaderboard Tab (accessible via quick action) */}
          <TabsContent value="leaderboard" className="mt-4 space-y-4">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={leaderboardTab} onValueChange={setLeaderboardTab}>
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="referrals">Referrals</TabsTrigger>
                    <TabsTrigger value="coins">Coins</TabsTrigger>
                    <TabsTrigger value="creators">Creators</TabsTrigger>
                  </TabsList>

                  {leaderboards.length > 0 ? (
                    <div className="space-y-2">
                      {leaderboards.map((entry) => (
                        <div
                          key={entry.id}
                          className={`flex items-center gap-3 p-3 rounded-xl ${
                            entry.rank <= 3 ? 'bg-gradient-to-r from-primary/10 to-transparent' : 'bg-muted/50'
                          }`}
                        >
                          <div className="w-10 text-center">
                            {getRankIcon(entry.rank) || (
                              <span className="font-bold text-muted-foreground">#{entry.rank}</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{entry.profiles?.username || 'Anonymous'}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary">{entry.score?.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">
                              {leaderboardTab === 'coins' ? 'coins' : leaderboardTab === 'referrals' ? 'users' : 'posts'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Trophy className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p className="font-medium">No rankings yet</p>
                      <p className="text-sm">Be the first to climb the leaderboard!</p>
                    </div>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <SocialShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        referralCode={referralCode}
        shareUrl={`https://chatr.chat/auth?ref=${referralCode}`}
      />

      <UPIPaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        amount={selectedPackage?.price || 0}
        orderType="service"
        onPaymentSubmitted={handlePaymentSubmitted}
      />
    </div>
  );
}
