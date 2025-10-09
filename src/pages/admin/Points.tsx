import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Coins, TrendingUp, Users, Gift, DollarSign, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface PointsStats {
  totalPoints: number;
  totalEarned: number;
  totalSpent: number;
  totalUsers: number;
  totalRedemptions: number;
}

interface TopUser {
  username: string;
  avatar_url: string;
  balance: number;
  lifetime_earned: number;
}

export default function AdminPoints() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PointsStats>({
    totalPoints: 0,
    totalEarned: 0,
    totalSpent: 0,
    totalUsers: 0,
    totalRedemptions: 0,
  });
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");

  useEffect(() => {
    checkAdminAccess();
    loadPointsStats();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      toast({
        title: "Access Denied",
        description: "You don't have admin privileges",
        variant: "destructive",
      });
      navigate("/");
    }
  };

  const loadPointsStats = async () => {
    try {
      // Get total stats
      const { data: pointsData } = await supabase
        .from("user_points")
        .select("balance, lifetime_earned, lifetime_spent");

      const totalPoints = pointsData?.reduce((sum, p) => sum + p.balance, 0) || 0;
      const totalEarned = pointsData?.reduce((sum, p) => sum + p.lifetime_earned, 0) || 0;
      const totalSpent = pointsData?.reduce((sum, p) => sum + p.lifetime_spent, 0) || 0;

      // Get redemptions count
      const { count: redemptionsCount } = await supabase
        .from("user_reward_redemptions")
        .select("*", { count: "exact", head: true });

      // Get top users
      const { data: topUsersData } = await supabase
        .from("user_points")
        .select(`
          user_id,
          balance,
          lifetime_earned,
          profiles:user_id (username, avatar_url)
        `)
        .order("lifetime_earned", { ascending: false })
        .limit(10);

      const formattedTopUsers = topUsersData?.map((u: any) => ({
        username: u.profiles?.username || "Unknown",
        avatar_url: u.profiles?.avatar_url,
        balance: u.balance,
        lifetime_earned: u.lifetime_earned,
      })) || [];

      setStats({
        totalPoints,
        totalEarned,
        totalSpent,
        totalUsers: pointsData?.length || 0,
        totalRedemptions: redemptionsCount || 0,
      });

      setTopUsers(formattedTopUsers);
    } catch (error: any) {
      toast({
        title: "Error loading stats",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustPoints = async () => {
    if (!selectedUser || !adjustmentAmount) {
      toast({
        title: "Missing Information",
        description: "Please select a user and enter an amount",
        variant: "destructive",
      });
      return;
    }

    try {
      const amount = parseInt(adjustmentAmount);
      
      // Get current user points
      const { data: currentPoints } = await supabase
        .from("user_points")
        .select("balance, lifetime_earned, lifetime_spent")
        .eq("user_id", selectedUser)
        .single();

      if (!currentPoints) {
        toast({
          title: "User not found",
          variant: "destructive",
        });
        return;
      }

      const newBalance = currentPoints.balance + amount;
      const newLifetimeEarned = amount > 0 ? currentPoints.lifetime_earned + amount : currentPoints.lifetime_earned;

      // Update user points
      await supabase
        .from("user_points")
        .update({
          balance: newBalance,
          lifetime_earned: newLifetimeEarned,
        })
        .eq("user_id", selectedUser);

      // Create transaction record
      await supabase
        .from("point_transactions")
        .insert({
          user_id: selectedUser,
          amount: amount,
          transaction_type: amount > 0 ? "bonus" : "expire",
          source: "admin",
          description: adjustmentReason || "Admin adjustment",
        });

      toast({
        title: "Points Adjusted",
        description: `Successfully ${amount > 0 ? "added" : "removed"} ${Math.abs(amount)} points`,
      });

      setSelectedUser("");
      setAdjustmentAmount("");
      setAdjustmentReason("");
      loadPointsStats();
    } catch (error: any) {
      toast({
        title: "Error adjusting points",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Coins className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading points dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/admin")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Chatr Points Management</h1>
              <p className="text-muted-foreground">Monitor and manage the points economy</p>
            </div>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adjust Points
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adjust User Points</DialogTitle>
                <DialogDescription>
                  Add or remove points from a user's account
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>User ID</Label>
                  <Input
                    placeholder="Enter user ID"
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Amount (use negative to remove)</Label>
                  <Input
                    type="number"
                    placeholder="e.g., 100 or -50"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Reason</Label>
                  <Textarea
                    placeholder="Why are you adjusting points?"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                  />
                </div>
                <Button onClick={handleAdjustPoints} className="w-full">
                  Apply Adjustment
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Points in Circulation</CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Active points balance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEarned.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">All-time points earned</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSpent.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Points redeemed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">With points balance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Redemptions</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRedemptions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total rewards claimed</p>
            </CardContent>
          </Card>
        </div>

        {/* Breakage Analysis */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Points Breakage Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Points Issued vs Redeemed</p>
                  <p className="text-sm text-muted-foreground">Total breakage revenue opportunity</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {((stats.totalEarned - stats.totalSpent) / stats.totalEarned * 100).toFixed(1)}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {(stats.totalEarned - stats.totalSpent).toLocaleString()} points
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Points Issued</p>
                  <p className="text-xl font-bold">{stats.totalEarned.toLocaleString()}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Points Redeemed</p>
                  <p className="text-xl font-bold">{stats.totalSpent.toLocaleString()}</p>
                </div>
                <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950">
                  <p className="text-sm text-muted-foreground mb-1">Breakage (Unused)</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {(stats.totalEarned - stats.totalSpent).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Users Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle>Top Points Earners</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topUsers.map((user, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                      {index + 1}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className="w-10 h-10 rounded-full" />
                      ) : (
                        <span className="text-lg">👤</span>
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{user.username}</p>
                      <p className="text-sm text-muted-foreground">
                        {user.lifetime_earned.toLocaleString()} earned
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    <Coins className="w-3 h-3 mr-1" />
                    {user.balance.toLocaleString()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
