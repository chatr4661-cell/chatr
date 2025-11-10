import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Check, Crown, Sparkles, ArrowLeft, Zap } from 'lucide-react';

const UserSubscription = () => {
  const navigate = useNavigate();
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('chatr_user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      setCurrentSubscription(data);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login first');
        return;
      }

      // Create/update subscription
      const { error } = await supabase
        .from('chatr_user_subscriptions')
        .upsert({
          user_id: user.id,
          plan_type: 'premium',
          status: 'active',
          price: 99.00,
          start_date: new Date().toISOString(),
          end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        });

      if (error) throw error;

      toast.success('Successfully upgraded to Premium!');
      loadSubscription();
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error('Failed to upgrade subscription');
    }
  };

  const premiumFeatures = [
    'Unlimited search & bookings',
    'Instant chat & call with service providers',
    'Rewards & cashback on every transaction',
    '24x7 AI Assistant for recommendations',
    'Priority customer support',
    'Exclusive deals & early access',
    'No booking fees',
    'Ad-free experience'
  ];

  const isPremium = currentSubscription?.plan_type === 'premium' && 
                    currentSubscription?.status === 'active';

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-purple-500/5">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">Chatr Premium</h1>
            <p className="text-xs text-muted-foreground">Unlock unlimited possibilities</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Current Status */}
        {isPremium && (
          <Card className="p-6 mb-6 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
            <div className="flex items-center gap-3 mb-2">
              <Crown className="w-6 h-6 text-primary" />
              <div>
                <h3 className="font-bold text-lg">You're Premium!</h3>
                <p className="text-sm text-muted-foreground">
                  Active until {new Date(currentSubscription.end_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Premium Plan Card */}
        <Card className="p-6 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold">Chatr Premium</h2>
              <Badge className="bg-gradient-to-r from-primary to-purple-500">Most Popular</Badge>
            </div>
            
            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-primary">₹99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Cancel anytime • No hidden charges
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {premiumFeatures.map((feature, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0">
                    <Check className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm">{feature}</p>
                </div>
              ))}
            </div>

            {!isPremium && (
              <Button 
                onClick={handleUpgrade}
                className="w-full bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
                size="lg"
              >
                <Zap className="w-5 h-5 mr-2" />
                Upgrade to Premium
              </Button>
            )}
          </div>
        </Card>

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-primary mb-1">Unlimited</div>
            <p className="text-sm text-muted-foreground">Searches & Bookings</p>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-primary mb-1">24x7</div>
            <p className="text-sm text-muted-foreground">AI Assistant</p>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-primary mb-1">₹0</div>
            <p className="text-sm text-muted-foreground">Booking Fees</p>
          </Card>
          <Card className="p-4 text-center">
            <div className="text-3xl font-bold text-primary mb-1">5%</div>
            <p className="text-sm text-muted-foreground">Cashback</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserSubscription;