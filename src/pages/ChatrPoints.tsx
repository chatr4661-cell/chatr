import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Coins, Gift, History, ShoppingCart, TrendingUp, Trophy, Zap } from "lucide-react";
import { format } from "date-fns";

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

export default function ChatrPoints() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [userPoints, setUserPoints] = useState<UserPoints | null>(null);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [rewards, setRewards] = useState<PointReward[]>([]);
  const [packages, setPackages] = useState<PointPackage[]>([]);
  const [redemptions, setRedemptions] = useState<UserRedemption[]>([]);

  useEffect(() => {
    loadPointsData();
  }, []);

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rewards">
              <Gift className="w-4 h-4 mr-2" />
              Rewards
            </TabsTrigger>
            <TabsTrigger value="buy">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Buy
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="active">
              <Zap className="w-4 h-4 mr-2" />
              Active
            </TabsTrigger>
          </TabsList>

          {/* Rewards Tab */}
          <TabsContent value="rewards" className="space-y-4 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Redeem Points</CardTitle>
                <CardDescription>
                  Use your points to get amazing rewards and discounts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {rewards.map((reward) => (
                  <Card key={reward.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{reward.icon}</span>
                            <div>
                              <h3 className="font-semibold">{reward.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {reward.description}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-3">
                            <Badge variant="secondary">
                              <Coins className="w-3 h-3 mr-1" />
                              {reward.points_required} points
                            </Badge>
                            {reward.discount_percentage && (
                              <Badge variant="outline">
                                {reward.discount_percentage}% OFF
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleRedeemReward(reward)}
                          disabled={(userPoints?.balance || 0) < reward.points_required}
                          size="sm"
                        >
                          Redeem
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
                <CardTitle>Buy Chatr Points</CardTitle>
                <CardDescription>
                  Get more points to unlock exclusive rewards
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {packages.map((pkg) => (
                  <Card
                    key={pkg.id}
                    className={`relative overflow-hidden ${
                      pkg.popular ? "border-primary shadow-lg" : ""
                    }`}
                  >
                    {pkg.popular && (
                      <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg font-semibold">
                        POPULAR
                      </div>
                    )}
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-bold">{pkg.name}</h3>
                          <div className="flex items-baseline gap-2 mt-2">
                            <span className="text-3xl font-bold text-primary">
                              {pkg.points}
                            </span>
                            <span className="text-muted-foreground">points</span>
                          </div>
                          {pkg.bonus_points > 0 && (
                            <Badge variant="secondary" className="mt-2">
                              + {pkg.bonus_points} BONUS
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">
                            ${pkg.price_usd}
                          </div>
                          <Button className="mt-2" size="sm">
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
        </Tabs>

        {/* How to Earn Points */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>How to Earn Points</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                💬
              </div>
              <div>
                <p className="font-medium">Chat Daily</p>
                <p className="text-sm text-muted-foreground">Earn 10 points per day</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                🎯
              </div>
              <div>
                <p className="font-medium">Complete Wellness Goals</p>
                <p className="text-sm text-muted-foreground">Earn up to 50 points</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                📊
              </div>
              <div>
                <p className="font-medium">Upload Lab Reports</p>
                <p className="text-sm text-muted-foreground">Earn 25 points per report</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                💊
              </div>
              <div>
                <p className="font-medium">Take Medicines On Time</p>
                <p className="text-sm text-muted-foreground">Earn 5 points per adherence</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                👥
              </div>
              <div>
                <p className="font-medium">Invite Friends</p>
                <p className="text-sm text-muted-foreground">Earn 100 points per referral</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
