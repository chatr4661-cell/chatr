import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Coins, TrendingUp, Send, QrCode, Gift, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface UserPoints {
  balance: number;
  lifetime_earned: number;
  lifetime_spent: number;
}

interface Streak {
  current_streak: number;
  longest_streak: number;
}

export const PointsWallet = () => {
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadWalletData();
    processDailyLogin();
  }, []);

  const loadWalletData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: pointsData } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', user.id)
        .single();

      const { data: streakData } = await supabase
        .from('user_streaks')
        .select('current_streak, longest_streak')
        .eq('user_id', user.id)
        .single();

      setPoints(pointsData);
      setStreak(streakData);
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const processDailyLogin = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase.functions.invoke('process-daily-login', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      if (data.pointsEarned > 0) {
        toast.success(data.message, {
          description: `+${data.pointsEarned} points earned!`,
          icon: <Zap className="h-4 w-4" />
        });
        loadWalletData();
      }
    } catch (error) {
      console.error('Daily login error:', error);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2"></div>
          <div className="h-12 bg-muted rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Balance Card */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Coins className="h-6 w-6 text-primary" />
            <span className="text-sm text-muted-foreground">Chatr Points</span>
          </div>
          {streak && (
            <div className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-full">
              <span className="text-xs font-medium">🔥 {streak.current_streak} days</span>
            </div>
          )}
        </div>

        <div className="mb-6">
          <div className="text-4xl font-bold text-foreground mb-1">
            {points?.balance.toLocaleString() || 0}
          </div>
          <div className="text-sm text-muted-foreground">
            ≈ ₹{points?.balance.toLocaleString() || 0} INR
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-background/50 p-3 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Lifetime Earned</div>
            <div className="text-lg font-semibold text-green-600">
              +{points?.lifetime_earned.toLocaleString() || 0}
            </div>
          </div>
          <div className="bg-background/50 p-3 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Lifetime Spent</div>
            <div className="text-lg font-semibold text-orange-600">
              -{points?.lifetime_spent.toLocaleString() || 0}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-col h-auto py-3"
            onClick={() => navigate('/chatr-points?tab=rewards')}
          >
            <Gift className="h-4 w-4 mb-1" />
            <span className="text-xs">Redeem</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-col h-auto py-3"
            onClick={() => navigate('/chatr-points?tab=buy')}
          >
            <TrendingUp className="h-4 w-4 mb-1" />
            <span className="text-xs">Buy</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-col h-auto py-3"
            onClick={() => navigate('/qr-payment')}
          >
            <QrCode className="h-4 w-4 mb-1" />
            <span className="text-xs">QR Pay</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-col h-auto py-3"
            onClick={() => navigate('/send-points')}
          >
            <Send className="h-4 w-4 mb-1" />
            <span className="text-xs">Send</span>
          </Button>
        </div>
      </Card>

      {/* Ways to Earn Quick View */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Earn More Points
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Daily Login</span>
            <span className="font-medium text-green-600">+10 pts</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">5-Day Streak</span>
            <span className="font-medium text-green-600">+25 pts</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Book Appointment</span>
            <span className="font-medium text-green-600">+25 pts</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Refer a Friend</span>
            <span className="font-medium text-green-600">+200 pts</span>
          </div>
        </div>
        <Button 
          variant="link" 
          className="w-full mt-2 text-primary"
          onClick={() => navigate('/chatr-points')}
        >
          View All Ways to Earn →
        </Button>
      </Card>
    </div>
  );
};