import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Coins, Gift, History, ShoppingCart, TrendingUp, Trophy, Zap, Users, Share2, Target, Star, Flame, Medal, Award, CheckCircle, Clock, XCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { QRCodeSVG } from "qrcode.react";
import { SocialShareDialog } from "@/components/SocialShareDialog";
import { UPIPaymentModal } from "@/components/payment/UPIPaymentModal";

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

interface PointReward {
  id: string;
  name: string;
  description: string;
  points_required: number;
  reward_type: string;
  icon: string;
  discount_percentage?: number;
}

interface PointPackage {
  id: string;
  name: string;
  points: number;
  price_usd: number;
  bonus_points: number;
  badge_text?: string;
  popular: boolean;
}

interface UserRedemption {
  id: string;
  reward: PointReward;
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

export default function ChatrPoints() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [rewards, setRewards] = useState<PointReward[]>([]);
  const [packages, setPackages] = useState<PointPackage[]>([]);
  const [redemptions, setRedemptions] = useState<UserRedemption[]>([]);
  
  // Growth system states
  const [referralCode, setReferralCode] = useState('');
  const [coinBalance, setCoinBalance] = useState(0);
  const [lifetimeEarned, setLifetimeEarned] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [referralStats, setReferralStats] = useState({ total: 0, active: 0 });
  const [referrals, setReferrals] = useState<any[]>([]);
  const [networkStats, setNetworkStats] = useState({
    level1: 0,
    level2: 0,
    level3: 0,
    level4: 0,
    totalCoins: 0
  });
  const [leaderboards, setLeaderboards] = useState<any[]>([]);
  const [leaderboardTab, setLeaderboardTab] = useState('referrals');
  const [showShareDialog, setShowShareDialog] = useState(false);
  
  // Payment states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CoinPackage | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => {
    loadPointsData();
    loadGrowthData();
    processDailyLogin();
  }, []);

  useEffect(() => {
    loadLeaderboards();
  }, [leaderboardTab]);

  const loadPointsData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load user points
      const { data: pointsData } = await supabase
        .from("user_points")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setUserPoints(pointsData);

      // Load transactions
      const { data: transData } = await supabase
        .from("point_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      setTransactions(transData || []);

      // Load rewards
      const { data: rewardsData } = await supabase
        .from("point_rewards")
        .select("*")
        .eq("is_active", true)
        .order("points_required");

      setRewards(rewardsData || []);

      // Load packages
      const { data: packagesData } = await supabase
        .from("point_packages")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      setPackages(packagesData || []);

      // Load user redemptions
      const { data: redemptionsData } = await supabase
        .from("user_reward_redemptions")
        .select(`
          *,
          reward:reward_id (*)
        `)
        .eq("user_id", user.id)
        .order("redeemed_at", { ascending: false });

      setRedemptions(redemptionsData as any || []);

    } catch (error: any) {
      toast({
        title: "Error loading points data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadGrowthData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Generate or get referral code
      const { data: codeData } = await supabase.functions.invoke('generate-referral-code');
      if (codeData) {
        setReferralCode(codeData.code);
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

      // Load referrals
      const { data: refData } = await supabase
        .from('chatr_referrals')
        .select(`
          *,
          profiles:referred_user_id (username, avatar_url)
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      setReferrals(refData || []);

      // Load network stats
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
        setTimeout(() => {
          loadPointsData();
          loadGrowthData();
        }, 1000);
      }
    } catch (error) {
      console.error('Error processing daily login:', error);
    }
  };

  const loadLeaderboards = async () => {
    const { data } = await supabase
      .from('chatr_leaderboards')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .eq('leaderboard_type', leaderboardTab)
      .eq('period', 'monthly')
      .order('rank')
      .limit(100);

    setLeaderboards(data || []);
  };

  const copyReferralLink = () => {
    const shareUrl = `https://chatr.chat/auth?ref=${referralCode}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: 'Copied!',
      description: 'Referral link copied to clipboard',
    });
  };

  const shareReferral = () => {
    setShowShareDialog(true);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-orange-600" />;
    return null;
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

  const handleRedeemReward = async (reward: PointReward) => {
    if (!userPoints || userPoints.balance < reward.points_required) {
      toast({
        title: "Insufficient Points",
        description: `You need ${reward.points_required} points to redeem this reward.`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create redemption code
      const redemptionCode = `CHATR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Start transaction
      const newBalance = userPoints.balance - reward.points_required;

      // Update user points
      await supabase
        .from("user_points")
        .update({
          balance: newBalance,
          lifetime_spent: userPoints.lifetime_spent + reward.points_required,
        })
        .eq("user_id", user.id);

      // Create transaction record
      const { data: transaction } = await supabase
        .from("point_transactions")
        .insert({
          user_id: user.id,
          amount: -reward.points_required,
          transaction_type: "spend",
          source: "redemption",
          description: `Redeemed: ${reward.name}`,
          reference_id: reward.id,
          reference_type: "reward",
        })
        .select()
        .single();

      // Create redemption record
      await supabase
        .from("user_reward_redemptions")
        .insert({
          user_id: user.id,
          reward_id: reward.id,
          points_spent: reward.points_required,
          expires_at: expiresAt.toISOString(),
          redemption_code: redemptionCode,
          transaction_id: transaction?.id,
        });

      toast({
        title: "Reward Redeemed! 🎉",
        description: `Your redemption code: ${redemptionCode}`,
      });

      loadPointsData();
    } catch (error: any) {
      toast({
        title: "Redemption failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getTransactionIcon = (type: string, source: string) => {
    if (type === "earn") return "🎁";
    if (type === "spend") return "💸";
    if (type === "purchase") return "💳";
    if (type === "expire") return "⏰";
    return "📊";
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      active: "default",
      used: "secondary",
      expired: "destructive",
      refunded: "outline",
    };
    return variants[status] || "default";
  };

  // Handle coin reward redemption
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

      // Create redemption code
      const redemptionCode = `CHATR-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Deduct coins from balance
      const { error: balanceError } = await supabase
        .from('chatr_coin_balances')
        .update({
          total_coins: coinBalance - coinsRequired,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (balanceError) throw balanceError;

      // Record transaction
      await supabase
        .from('chatr_coin_transactions')
        .insert({
          user_id: user.id,
          transaction_type: 'spend',
          amount: -coinsRequired,
          source: 'reward_redemption',
          description: `Redeemed: ${rewardName}`,
          reference_id: redemptionCode
        });

      // Update local state
      setCoinBalance(prev => prev - coinsRequired);
      
      toast({
        title: "Reward Redeemed! 🎉",
        description: `Code: ${redemptionCode} - Valid for 30 days`,
      });

      loadPointsData();
      loadGrowthData();
    } catch (error: any) {
      toast({
        title: "Redemption failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setRedeeming(null);
    }
  };

  // Handle buying coins
  const handleBuyCoins = (pkg: CoinPackage) => {
    setSelectedPackage(pkg);
    setShowPaymentModal(true);
  };

  // Handle payment submission
  const handlePaymentSubmitted = async (paymentId: string) => {
    if (!selectedPackage) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create pending coin purchase record
      await supabase
        .from('chatr_coin_transactions')
        .insert({
          user_id: user.id,
          transaction_type: 'purchase_pending',
          amount: selectedPackage.coins + selectedPackage.bonus,
          source: 'coin_purchase',
          description: `${selectedPackage.name} - ₹${selectedPackage.price} (Pending verification)`,
          reference_id: paymentId,
          metadata: {
            package_name: selectedPackage.name,
            price: selectedPackage.price,
            coins: selectedPackage.coins,
            bonus: selectedPackage.bonus
          }
        });

      toast({
        title: "Payment Submitted! 🎉",
        description: `Your ${selectedPackage.name} purchase is pending verification. Coins will be credited once verified.`,
      });

      setShowPaymentModal(false);
      setSelectedPackage(null);
    } catch (error) {
      console.error('Error recording purchase:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Coins className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading your points...</p>
        </div>
      </div>
    );
  }

  const nextReward = rewards.find(r => r.points_required > (userPoints?.balance || 0));
  const progressToNext = nextReward
    ? ((userPoints?.balance || 0) / nextReward.points_required) * 100
    : 100;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-primary-foreground p-6 pb-20">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-4 text-primary-foreground hover:bg-primary-foreground/10"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Coins className="w-8 h-8" />
              Chatr Points
            </h1>
            <p className="text-primary-foreground/80 mt-1">
              Chat • Pay • Earn • Redeem
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{userPoints?.balance || 0}</div>
            <div className="text-sm text-primary-foreground/80">Available Points</div>
          </div>
        </div>

        {/* Quick Action: Reward Shop */}
        <Button
          onClick={() => navigate('/reward-shop')}
          className="w-full mt-6 bg-primary-foreground text-primary hover:bg-primary-foreground/90 h-14 text-lg font-semibold"
          size="lg"
        >
          <Gift className="mr-2 h-5 w-5" />
          Browse Reward Shop
        </Button>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <Card className="bg-primary-foreground/10 border-primary-foreground/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary-foreground" />
                <div>
                  <div className="text-2xl font-bold text-primary-foreground">
                    {userPoints?.lifetime_earned || 0}
                  </div>
                  <div className="text-xs text-primary-foreground/80">Lifetime Earned</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-primary-foreground/10 border-primary-foreground/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary-foreground" />
                <div>
                  <div className="text-2xl font-bold text-primary-foreground">
                    {userPoints?.lifetime_spent || 0}
                  </div>
                  <div className="text-xs text-primary-foreground/80">Lifetime Spent</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress to next reward */}
        {nextReward && (
          <Card className="mt-4 bg-primary-foreground/10 border-primary-foreground/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-primary-foreground">Next Reward: {nextReward.name}</span>
                <span className="text-xs text-primary-foreground/80">
                  {userPoints?.balance}/{nextReward.points_required}
                </span>
              </div>
              <Progress value={progressToNext} className="h-2" />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Main Content */}
      <div className="p-6 -mt-12">
        <Tabs defaultValue="rewards" className="w-full">
          <TabsList className="grid w-full grid-cols-7 gap-1">
            <TabsTrigger value="rewards">
              <Gift className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Rewards</span>
            </TabsTrigger>
            <TabsTrigger value="buy">
              <ShoppingCart className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Buy</span>
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="active">
              <Zap className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Active</span>
            </TabsTrigger>
            <TabsTrigger value="growth">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Growth</span>
            </TabsTrigger>
            <TabsTrigger value="leaderboard">
              <Trophy className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Leaders</span>
            </TabsTrigger>
            <TabsTrigger value="network">
              <Users className="w-4 h-4 mr-1" />
              <span className="hidden sm:inline">Network</span>
            </TabsTrigger>
          </TabsList>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Redeem Chatr Coins</CardTitle>
                <CardDescription>
                  Use your coins to get amazing rewards and discounts (1 coin = ₹0.10)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Hardcoded rewards matching the coin economy */}
                {[
                  {
                    icon: '🚫',
                    name: 'Ad-Free for 7 Days',
                    description: 'Enjoy Chatr without ads for a week',
                    coins: 500,
                    value: '₹50'
                  },
                  {
                    icon: '💊',
                    name: 'Free Medicine Delivery',
                    description: 'Get free delivery on your next medicine order',
                    coins: 1000,
                    discount: '100% OFF',
                    value: '₹100'
                  },
                  {
                    icon: '🏥',
                    name: '10% Off Next Consultation',
                    description: 'Save 10% on your next doctor consultation',
                    coins: 2000,
                    discount: '10% OFF',
                    value: '₹200'
                  },
                  {
                    icon: '🛒',
                    name: '₹500 Marketplace Credit',
                    description: 'Get ₹500 discount on marketplace purchases',
                    coins: 3000,
                    discount: '₹500 OFF',
                    value: '₹300'
                  },
                  {
                    icon: '🔬',
                    name: '25% Off Lab Tests',
                    description: 'Save 25% on your next lab test booking',
                    coins: 5000,
                    discount: '25% OFF',
                    value: '₹500'
                  },
                  {
                    icon: '⭐',
                    name: 'Premium Features (30 Days)',
                    description: 'Unlock all premium features for a month',
                    coins: 7500,
                    value: '₹750'
                  },
                  {
                    icon: '🏠',
                    name: 'Free Home Care Visit',
                    description: 'One free home healthcare service visit',
                    coins: 10000,
                    discount: '100% OFF',
                    value: '₹1,000'
                  }
                ].map((reward, index) => (
                  <Card key={index} className="overflow-hidden hover:shadow-lg transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-3xl">{reward.icon}</span>
                            <div>
                              <h3 className="font-semibold text-lg">{reward.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {reward.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <Badge variant="secondary" className="bg-gradient-to-r from-primary/20 to-primary/10">
                              <Coins className="w-4 h-4 mr-1 text-yellow-600" />
                              <span className="font-bold">{reward.coins.toLocaleString()}</span> coins
                            </Badge>
                            <Badge variant="outline" className="text-muted-foreground">
                              {reward.value}
                            </Badge>
                            {reward.discount && (
                              <Badge variant="default" className="bg-green-600">
                                {reward.discount}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleRedeemCoinReward(reward.name, reward.coins)}
                          disabled={(coinBalance || 0) < reward.coins || redeeming === reward.name}
                          size="sm"
                          className="min-w-[80px]"
                        >
                          {redeeming === reward.name ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Redeem'
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Buy Points Tab */}
          <TabsContent value="buy" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Buy Chatr Coins</CardTitle>
                <CardDescription>
                  Get more coins to unlock exclusive rewards (1 coin = ₹0.10)
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {[
                  {
                    name: 'Starter Pack',
                    coins: 2500,
                    bonus: 0,
                    price: 199,
                    popular: false
                  },
                  {
                    name: 'Value Pack',
                    coins: 6000,
                    bonus: 500,
                    price: 499,
                    popular: true,
                    badge: 'MOST POPULAR'
                  },
                  {
                    name: 'Premium Pack',
                    coins: 15000,
                    bonus: 2000,
                    price: 999,
                    popular: false,
                    badge: 'BEST VALUE'
                  },
                  {
                    name: 'Ultimate Pack',
                    coins: 40000,
                    bonus: 8000,
                    price: 2499,
                    popular: false,
                    badge: 'ULTIMATE'
                  }
                ].map((pkg, index) => (
                  <Card
                    key={index}
                    className={`relative overflow-hidden ${
                      pkg.popular ? "border-primary shadow-lg ring-2 ring-primary" : ""
                    }`}
                  >
                    {pkg.badge && (
                      <div className="absolute top-0 right-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs px-4 py-1 rounded-bl-lg font-bold">
                        {pkg.badge}
                      </div>
                    )}
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold">{pkg.name}</h3>
                          <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                              {(pkg.coins + pkg.bonus).toLocaleString()}
                            </span>
                            <span className="text-muted-foreground">coins</span>
                          </div>
                          {pkg.bonus > 0 && (
                            <Badge variant="secondary" className="mt-2 bg-green-100 text-green-700">
                              + {pkg.bonus.toLocaleString()} BONUS
                            </Badge>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Worth ₹{((pkg.coins + pkg.bonus) / 10).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-primary">
                            ₹{pkg.price}
                          </div>
                           <Button 
                            className="mt-3 hover:scale-105 transition-transform" 
                            size="sm"
                            onClick={() => handleBuyCoins(pkg)}
                          >
                            Buy Now
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  Your points earning and spending history
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {getTransactionIcon(transaction.transaction_type, transaction.source)}
                      </span>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(transaction.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`text-lg font-bold ${
                        transaction.amount > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {transaction.amount > 0 ? "+" : ""}
                      {transaction.amount}
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No transactions yet. Start earning points!
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Rewards Tab */}
          <TabsContent value="active" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Rewards</CardTitle>
                <CardDescription>
                  Your redeemed rewards and their status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {redemptions.map((redemption) => (
                  <Card key={redemption.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{redemption.reward.icon}</span>
                          <div>
                            <h3 className="font-semibold">{redemption.reward.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {redemption.reward.description}
                            </p>
                          </div>
                        </div>
                        <Badge variant={getStatusBadge(redemption.status)}>
                          {redemption.status.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Redemption Code</p>
                        <p className="font-mono font-bold">{redemption.redemption_code}</p>
                      </div>
                      <div className="flex items-center justify-between mt-3 text-sm">
                        <span className="text-muted-foreground">
                          Redeemed: {format(new Date(redemption.redeemed_at), "MMM d, yyyy")}
                        </span>
                        <span className="text-muted-foreground">
                          Expires: {format(new Date(redemption.expires_at), "MMM d, yyyy")}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {redemptions.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No active rewards. Redeem points to get started!
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Growth Tab */}
          <TabsContent value="growth" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coins className="h-5 w-5 text-primary" />
                  Chatr Coins Balance
                </CardTitle>
                <CardDescription>₹{(coinBalance / 10).toFixed(2)} value</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-4xl font-bold text-primary">{coinBalance.toLocaleString()}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-accent/10">
                    <p className="text-sm text-muted-foreground">Lifetime Earned</p>
                    <p className="text-xl font-semibold">{lifetimeEarned.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/10 flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Streak</p>
                      <p className="text-xl font-semibold">{currentStreak} days</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Your Referral Code
                  </CardTitle>
                  <Badge variant="default">{referralStats.total} referrals</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
                  <div className="flex items-center justify-between">
                    <code className="text-2xl font-bold tracking-wider text-primary">
                      {referralCode || 'Loading...'}
                    </code>
                    <Button size="sm" variant="ghost" onClick={copyReferralLink}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {referralCode && (
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <QRCodeSVG value={`https://chatr.app/join/${referralCode}`} size={200} />
                  </div>
                )}

                <Button onClick={shareReferral} className="w-full">
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Referral Link
                </Button>

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
                    <p className="text-xs text-muted-foreground">Coins</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-primary" />
                  Earn More Coins
                </CardTitle>
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
          </TabsContent>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Top 100 This Month
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs value={leaderboardTab} onValueChange={setLeaderboardTab}>
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="referrals">Referrals</TabsTrigger>
                    <TabsTrigger value="coins">Coins</TabsTrigger>
                    <TabsTrigger value="creators">Creators</TabsTrigger>
                  </TabsList>

                  <div className="space-y-2">
                    {leaderboards.length > 0 ? (
                      leaderboards.map((entry) => (
                        <div
                          key={entry.id}
                          className={`flex items-center gap-4 p-3 rounded-lg ${
                            entry.rank <= 3 ? 'bg-gradient-to-r from-primary/10 to-transparent' : 'hover:bg-accent/5'
                          }`}
                        >
                          <div className="w-12 text-center">
                            {getRankIcon(entry.rank) || (
                              <span className="font-bold text-lg">#{entry.rank}</span>
                            )}
                          </div>

                          <div className="flex-1">
                            <p className="font-semibold">
                              {entry.profiles?.username || 'Anonymous'}
                            </p>
                            {entry.city && (
                              <p className="text-xs text-muted-foreground">{entry.city}</p>
                            )}
                          </div>

                          <div className="text-right">
                            <p className="font-bold text-lg text-primary">
                              {entry.score.toLocaleString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {leaderboardTab === 'coins' ? 'coins' : leaderboardTab === 'referrals' ? 'users' : 'posts'}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No leaderboard data yet</p>
                        <p className="text-sm">Be the first to climb the ranks!</p>
                      </div>
                    )}
                  </div>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Network Tab */}
          <TabsContent value="network" className="space-y-4 mt-6">
            <Card>
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
                    <p className="text-xs text-muted-foreground mt-1">Direct</p>
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
                <div className="mt-4 p-4 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-center">
                  <p className="text-sm opacity-90">Total Network Earnings</p>
                  <p className="text-3xl font-bold">{networkStats.totalCoins.toLocaleString()} coins</p>
                </div>
              </CardContent>
            </Card>

            <Card>
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
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold">
                            {ref.profiles?.username?.[0]?.toUpperCase() || 'U'}
                          </div>
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

            <Card>
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
          </TabsContent>
        </Tabs>

        {/* How to Earn Coins */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How to Earn Chatr Coins</CardTitle>
            <CardDescription>1 coin = ₹0.10 • Build your coin balance!</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {[
              {
                icon: '👥',
                title: 'Refer a Friend',
                coins: 500,
                rupees: 50,
                desc: 'Each new user via your code'
              },
              {
                icon: '🎯',
                title: 'Complete Your Profile',
                coins: 100,
                rupees: 10,
                desc: 'Fill in all profile details'
              },
              {
                icon: '📱',
                title: 'Install 3 Mini-Apps',
                coins: 200,
                rupees: 20,
                desc: 'Try out our mini-apps'
              },
              {
                icon: '✍️',
                title: 'Create Content/Post',
                coins: 100,
                rupees: 10,
                desc: 'Share in communities'
              },
              {
                icon: '🔥',
                title: '7-Day Login Streak',
                coins: 200,
                rupees: 20,
                desc: 'Login daily for a week'
              },
              {
                icon: '🏢',
                title: 'Refer a Business',
                coins: 1000,
                rupees: 100,
                desc: 'Bring businesses to Chatr'
              },
              {
                icon: '💬',
                title: 'Daily Login',
                coins: 50,
                rupees: 5,
                desc: 'Login every day'
              },
              {
                icon: '📊',
                title: 'Upload Lab Reports',
                coins: 250,
                rupees: 25,
                desc: 'Add health documents'
              },
              {
                icon: '💊',
                title: 'Medicine Adherence',
                coins: 50,
                rupees: 5,
                desc: 'Take medicines on time'
              }
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg hover:bg-accent/10 transition-colors group">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-primary font-bold">
                    <Coins className="h-4 w-4 text-yellow-600" />
                    {item.coins}
                  </div>
                  <p className="text-xs text-muted-foreground">₹{item.rupees}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      
      <SocialShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        referralCode={referralCode}
        shareUrl={`https://chatr.chat/auth?ref=${referralCode}`}
      />
      
      {/* UPI Payment Modal for buying coins */}
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
