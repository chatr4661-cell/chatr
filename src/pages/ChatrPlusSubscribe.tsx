import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Crown,
  Check,
  Sparkles,
  Zap,
  Wallet,
  Shield,
  TrendingUp,
  HeadphonesIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { UPIPaymentModal } from '@/components/payment/UPIPaymentModal';

export default function ChatrPlusSubscribe() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [showPayment, setShowPayment] = useState(false);

  const plans = {
    monthly: {
      price: 99,
      period: 'month',
      savings: 0
    },
    yearly: {
      price: 999,
      period: 'year',
      savings: 189,
      perMonth: 83
    }
  };

  const features = [
    {
      icon: Zap,
      title: 'Unlimited Bookings',
      description: 'Book any service without limits'
    },
    {
      icon: Sparkles,
      title: 'AI Assistant 24/7',
      description: 'Smart recommendations & support'
    },
    {
      icon: Wallet,
      title: 'Cashback Rewards',
      description: 'Earn on every booking'
    },
    {
      icon: Shield,
      title: 'Priority Support',
      description: 'Get help instantly'
    },
    {
      icon: TrendingUp,
      title: 'Exclusive Deals',
      description: 'Access member-only discounts'
    },
    {
      icon: HeadphonesIcon,
      title: 'Direct Seller Contact',
      description: 'Chat & call service providers'
    }
  ];

  const handlePaymentSubmitted = (paymentId: string) => {
    toast.success('🎉 Payment submitted! Your Chatr+ Premium will activate once verified.');
    setShowPayment(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/chatr-plus')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Subscribe to Chatr+ Premium</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-4 py-2 rounded-full mb-4">
            <Crown className="w-5 h-5 text-amber-500" />
            <span className="font-medium">Premium Membership</span>
          </div>
          <h2 className="text-4xl font-bold mb-4">
            Unlock Unlimited Access
          </h2>
          <p className="text-xl text-muted-foreground">
            One subscription for all your service needs
          </p>
        </motion.div>

        {/* Plan Selection */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card
            className={`p-6 cursor-pointer transition-all ${
              selectedPlan === 'monthly'
                ? 'ring-2 ring-primary bg-primary/5'
                : 'hover:bg-muted/50'
            }`}
            onClick={() => setSelectedPlan('monthly')}
          >
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-2">Monthly</h3>
              <div className="text-3xl font-bold mb-1">₹99</div>
              <div className="text-sm text-muted-foreground">per month</div>
            </div>
          </Card>

          <Card
            className={`p-6 cursor-pointer transition-all relative ${
              selectedPlan === 'yearly'
                ? 'ring-2 ring-primary bg-primary/5'
                : 'hover:bg-muted/50'
            }`}
            onClick={() => setSelectedPlan('yearly')}
          >
            <Badge className="absolute -top-2 -right-2 bg-green-500">
              Save ₹189
            </Badge>
            <div className="text-center">
              <h3 className="font-semibold text-lg mb-2">Yearly</h3>
              <div className="text-3xl font-bold mb-1">₹999</div>
              <div className="text-sm text-muted-foreground">₹83/month</div>
            </div>
          </Card>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-4 hover:bg-muted/50 transition-all">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-lg">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{feature.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* What's Included */}
        <Card className="p-6 mb-8">
          <h3 className="font-bold text-lg mb-4">What's Included</h3>
          <div className="space-y-3">
            {[
              'Unlimited service bookings across all categories',
              'AI-powered service recommendations',
              '24/7 priority customer support',
              'Instant chat & call with sellers',
              'Cashback on every booking',
              'Exclusive member-only deals & discounts',
              'Early access to new features',
              'No booking fees or hidden charges'
            ].map((item, index) => (
              <div key={index} className="flex items-start gap-3">
                <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* CTA */}
        <Card className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-amber-500/30 p-6">
          <div className="text-center space-y-4">
            <div>
              <div className="text-3xl font-bold mb-2">
                ₹{plans[selectedPlan].price}
                <span className="text-lg font-normal text-muted-foreground">
                  /{plans[selectedPlan].period}
                </span>
              </div>
              {selectedPlan === 'yearly' && (
                <p className="text-sm text-green-600 font-medium">
                  Save ₹{plans.yearly.savings} with annual billing
                </p>
              )}
            </div>
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              onClick={() => setShowPayment(true)}
            >
              <Crown className="w-5 h-5 mr-2" />
              Pay with UPI
            </Button>
            <p className="text-xs text-muted-foreground">
              Cancel anytime. No questions asked.
            </p>
          </div>
        </Card>
      </div>

      {/* UPI Payment Modal */}
      <UPIPaymentModal
        open={showPayment}
        onOpenChange={setShowPayment}
        amount={plans[selectedPlan].price}
        orderType="service"
        onPaymentSubmitted={handlePaymentSubmitted}
      />
    </div>
  );
}
