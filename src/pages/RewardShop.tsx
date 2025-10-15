import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Gift, ShoppingCart, Award, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RewardItem {
  id: string;
  name: string;
  description: string;
  point_cost: number;
  category: string;
  image_url?: string;
  stock_quantity?: number;
}

const RewardShop = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [userPoints, setUserPoints] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUserPoints();
    loadRewards();
  }, []);

  const loadUserPoints = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await (supabase as any)
      .from('user_points')
      .select('balance')
      .eq('user_id', user.id)
      .single();

    if (data) setUserPoints(data.balance);
  };

  const loadRewards = async () => {
    const { data, error } = await (supabase as any)
      .from('reward_items')
      .select('*')
      .eq('is_active', true)
      .order('point_cost', { ascending: true });

    if (!error && data) setRewards(data);
  };

  const handleRedeem = async (reward: RewardItem) => {
    if (userPoints < reward.point_cost) {
      toast({
        title: 'Insufficient Points',
        description: `You need ${reward.point_cost - userPoints} more points to redeem this reward.`,
        variant: 'destructive'
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);
    try {
      // Create redemption
      const { error: redeemError } = await (supabase as any)
        .from('reward_redemptions')
        .insert({
          user_id: user.id,
          reward_id: reward.id,
          points_spent: reward.point_cost,
          status: 'pending'
        });

      if (redeemError) throw redeemError;

      // Deduct points
      const { error: pointsError } = await (supabase as any)
        .from('user_points')
        .update({
          balance: userPoints - reward.point_cost,
          lifetime_spent: (await supabase.from('user_points').select('lifetime_spent').eq('user_id', user.id).single()).data?.lifetime_spent + reward.point_cost
        })
        .eq('user_id', user.id);

      if (pointsError) throw pointsError;

      toast({
        title: 'Redemption Successful! 🎉',
        description: `You've redeemed ${reward.name}. Check your email for details.`
      });

      loadUserPoints();
    } catch (error: any) {
      toast({
        title: 'Redemption Failed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'all', name: 'All', icon: Gift },
    { id: 'vouchers', name: 'Vouchers', icon: ShoppingCart },
    { id: 'badges', name: 'Badges', icon: Award },
    { id: 'premium', name: 'Premium', icon: Star }
  ];

  const filteredRewards = selectedCategory === 'all' 
    ? rewards 
    : rewards.filter(r => r.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/chatr-points')}
              className="text-primary-foreground hover:bg-primary-foreground/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Reward Shop</h1>
          </div>
          
          <Card className="bg-primary-foreground/10 border-primary-foreground/20 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">Your Balance</p>
                <p className="text-3xl font-bold">{userPoints.toLocaleString()}</p>
                <p className="text-sm opacity-75">Chatr Coins</p>
              </div>
              <Gift className="h-12 w-12 opacity-50" />
            </div>
          </Card>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Category Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map(cat => {
            const Icon = cat.icon;
            return (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(cat.id)}
                className="whitespace-nowrap"
              >
                <Icon className="h-4 w-4 mr-2" />
                {cat.name}
              </Button>
            );
          })}
        </div>

        {/* Rewards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRewards.map(reward => (
            <Card key={reward.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-muted rounded-lg mb-3 flex items-center justify-center">
                <Gift className="h-12 w-12 text-muted-foreground" />
              </div>
              
              <h3 className="font-semibold mb-1">{reward.name}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {reward.description}
              </p>

              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-base font-bold">
                  {reward.point_cost} coins
                </Badge>
                
                <Button
                  size="sm"
                  onClick={() => handleRedeem(reward)}
                  disabled={loading || userPoints < reward.point_cost}
                >
                  {userPoints < reward.point_cost ? 'Not Enough' : 'Redeem'}
                </Button>
              </div>

              {reward.stock_quantity !== undefined && reward.stock_quantity < 10 && (
                <p className="text-xs text-orange-600 mt-2">
                  Only {reward.stock_quantity} left!
                </p>
              )}
            </Card>
          ))}
        </div>

        {filteredRewards.length === 0 && (
          <div className="text-center py-12">
            <Gift className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No rewards available in this category</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardShop;