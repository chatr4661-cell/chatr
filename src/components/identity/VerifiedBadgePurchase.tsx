import React, { useState } from 'react';
import { CheckCircle2, Coins, Shield, Star, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VerifiedBadgePurchaseProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userPoints: number;
  onPurchased: () => void;
}

const BADGE_TIERS = [
  {
    id: 'verified',
    name: 'Verified',
    icon: CheckCircle2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
    cost: 500,
    description: 'Blue checkmark showing your identity is verified',
    perks: ['Blue verification badge', 'Priority in search results', 'Verified tag on messages'],
  },
  {
    id: 'premium',
    name: 'Premium',
    icon: Star,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
    cost: 1500,
    description: 'Gold star badge with premium features',
    perks: ['Gold premium badge', 'Custom profile themes', 'Extended AI clone features', 'Priority support'],
  },
  {
    id: 'elite',
    name: 'Elite',
    icon: Crown,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10 border-purple-500/20',
    cost: 5000,
    description: 'Crown badge — the ultimate CHATR status',
    perks: ['Crown elite badge', 'All Premium perks', 'Exclusive communities', 'Early feature access', 'Dedicated AI clone capacity'],
  },
];

export const VerifiedBadgePurchase: React.FC<VerifiedBadgePurchaseProps> = ({
  open,
  onOpenChange,
  userPoints,
  onPurchased,
}) => {
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const handlePurchase = async (tier: typeof BADGE_TIERS[0]) => {
    if (userPoints < tier.cost) {
      toast.error(`Not enough points. You need ${tier.cost - userPoints} more coins.`);
      return;
    }

    setPurchasing(tier.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Deduct points
      const { error: pointsError } = await supabase
        .from('point_transactions')
        .insert({
          user_id: user.id,
          amount: -tier.cost,
          transaction_type: 'spend',
          source: 'badge_purchase',
          description: `Purchased ${tier.name} badge`,
        });

      if (pointsError) throw pointsError;

      // Update balance
      await supabase
        .from('user_points')
        .update({ balance: userPoints - tier.cost })
        .eq('user_id', user.id);

      // Add badge
      await supabase
        .from('user_badges' as any)
        .upsert({
          user_id: user.id,
          badge_type: tier.id,
          badge_name: tier.name,
          purchased_at: new Date().toISOString(),
          is_active: true,
        } as any);

      toast.success(`${tier.name} badge purchased! 🎉`);
      onPurchased();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Get Verified
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Your balance</p>
            <p className="text-2xl font-bold flex items-center justify-center gap-1">
              <Coins className="h-5 w-5 text-amber-500" /> {userPoints.toLocaleString()}
            </p>
          </div>

          {BADGE_TIERS.map((tier) => {
            const Icon = tier.icon;
            const canAfford = userPoints >= tier.cost;
            return (
              <Card key={tier.id} className={`border ${tier.bgColor}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${tier.bgColor}`}>
                      <Icon className={`h-6 w-6 ${tier.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold">{tier.name}</h3>
                        <Badge variant="outline" className="text-[10px]">
                          <Coins className="h-3 w-3 mr-0.5" /> {tier.cost.toLocaleString()}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">{tier.description}</p>
                      <ul className="space-y-0.5">
                        {tier.perks.map((perk, i) => (
                          <li key={i} className="text-xs flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                            {perk}
                          </li>
                        ))}
                      </ul>
                      <Button
                        size="sm"
                        className="w-full mt-3"
                        disabled={!canAfford || purchasing !== null}
                        onClick={() => handlePurchase(tier)}
                      >
                        {purchasing === tier.id
                          ? 'Processing...'
                          : canAfford
                          ? `Get ${tier.name}`
                          : `Need ${(tier.cost - userPoints).toLocaleString()} more coins`}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
