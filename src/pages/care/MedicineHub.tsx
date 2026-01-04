import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Pill, Users, Bell, Activity, FileText, Gift, 
  Heart, Droplet, Wind, Bone, Sparkles, Package,
  Shield, Crown, Zap, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { MedicineBottomNav } from '@/components/care/MedicineBottomNav';
import { MedicineHeroHeader } from '@/components/care/MedicineHeroHeader';
import { MedicineIntakeCard } from '@/components/care/MedicineIntakeCard';
import { PremiumDeliveryTracker } from '@/components/care/PremiumDeliveryTracker';
import { HealthCoinsCard } from '@/components/care/HealthCoinsCard';
import { QuickActionCard } from '@/components/care/QuickActionCard';
import { PricingCards } from '@/components/care/PricingCards';
import { StreakRing } from '@/components/care/StreakRing';
import { format } from 'date-fns';

interface HealthCondition {
  id: string;
  name: string;
  name_hindi: string | null;
  icon: string | null;
  description: string | null;
}

interface HealthStreak {
  streak_type: string;
  current_streak: number;
  longest_streak: number;
  coins_earned: number;
}

interface Subscription {
  id: string;
  subscription_name: string;
  plan_type: string;
  status: string;
  monthly_cost: number;
  next_delivery_date: string | null;
}

const conditionIcons: Record<string, any> = {
  'droplet': Droplet,
  'heart-pulse': Heart,
  'heart': Heart,
  'activity': Activity,
  'wind': Wind,
  'bone': Bone,
};

const MedicineHub = () => {
  const navigate = useNavigate();
  const [conditions, setConditions] = useState<HealthCondition[]>([]);
  const [streak, setStreak] = useState<HealthStreak | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('care');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setUserName(profile.username || profile.full_name?.split(' ')[0] || 'there');
      }

      const { data: conditionsData } = await supabase
        .from('health_conditions')
        .select('*')
        .eq('is_active', true)
        .limit(6);
      
      if (conditionsData) setConditions(conditionsData);

      const { data: streakData } = await supabase
        .from('health_streaks')
        .select('*')
        .eq('user_id', user.id)
        .eq('streak_type', 'medicine_adherence')
        .single();
      
      if (streakData) setStreak(streakData);

      const { data: subData } = await supabase
        .from('medicine_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (subData) setSubscription(subData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { 
      title: 'My Subscriptions', 
      description: 'Manage your active plans',
      icon: Package, 
      route: '/care/medicines/subscriptions',
      gradient: 'from-primary to-primary/70',
      badge: 'Active'
    },
    { 
      title: 'Family Control', 
      description: 'Monitor family health',
      icon: Users, 
      route: '/care/medicines/family',
      gradient: 'from-blue-500 to-indigo-600'
    },
    { 
      title: 'AI Prescription Scanner', 
      description: 'Scan & auto-detect medicines',
      icon: FileText, 
      route: '/care/medicines/prescriptions',
      gradient: 'from-violet-500 to-purple-600',
      badge: 'AI Powered'
    },
    { 
      title: 'Track Vitals', 
      description: 'BP, Sugar, Weight, TSH',
      icon: Activity, 
      route: '/care/medicines/vitals',
      gradient: 'from-emerald-500 to-green-600'
    },
  ];

  const pricingPlans = [
    { 
      id: 'care', 
      name: 'Care', 
      price: 99, 
      description: 'Perfect for individuals',
      features: ['1 user', 'Auto-delivery', 'Smart reminders', 'Vitals tracking'],
      badge: 'Most Popular',
      popular: true,
      gradient: 'from-primary to-primary/70'
    },
    { 
      id: 'family', 
      name: 'Family', 
      price: 199, 
      description: 'For the whole family',
      features: ['Up to 4 users', 'Caregiver alerts', 'Family dashboard', 'Priority support'],
      badge: 'Best Value',
      gradient: 'from-blue-500 to-cyan-500'
    },
    { 
      id: 'care_plus', 
      name: 'Care+', 
      price: 299, 
      description: 'Premium with doctor consults',
      features: ['Unlimited users', '2 free consults/mo', '24/7 support', 'Lab discounts'],
      badge: 'Premium',
      gradient: 'from-purple-500 to-pink-500'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background pb-24">
      {/* Hero Header */}
      <MedicineHeroHeader
        title={`Hey ${userName} 👋`}
        subtitle="Your health companion is ready"
        gradient="primary"
        showBack={true}
        backPath="/care"
      >
        {/* Streak & Coins Summary */}
        <Card className="bg-white/15 backdrop-blur-xl border-white/20 shadow-2xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <StreakRing 
                  currentStreak={streak?.current_streak || 0} 
                  maxStreak={30} 
                  size={70}
                  strokeWidth={6}
                />
                <div className="text-white">
                  <motion.p 
                    className="text-3xl font-bold"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                  >
                    {streak?.current_streak || 0}
                  </motion.p>
                  <p className="text-sm text-white/80">day streak</p>
                </div>
              </div>
              <div className="text-right">
                <motion.div 
                  className="flex items-center gap-1.5 justify-end"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <motion.span 
                    className="text-2xl"
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  >
                    🪙
                  </motion.span>
                  <span className="text-2xl font-bold text-white">{streak?.coins_earned || 0}</span>
                </motion.div>
                <p className="text-sm text-white/80">health coins</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </MedicineHeroHeader>

      <div className="p-4 space-y-6 -mt-2">
        {/* Today's Medicines */}
        <MedicineIntakeCard />

        {/* Delivery Tracker */}
        {subscription && subscription.next_delivery_date && (
          <PremiumDeliveryTracker 
            status="shipped"
            orderDate={format(new Date(), 'dd MMM')}
            expectedDate={format(new Date(subscription.next_delivery_date), 'dd MMM yyyy')}
            trackingId={`CHT${subscription.id.slice(0, 8).toUpperCase()}`}
          />
        )}

        {/* Subscribe CTA for new users */}
        {!subscription && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Card className="overflow-hidden border-0 shadow-xl">
              <div className="relative bg-gradient-to-br from-emerald-500 via-green-500 to-teal-500 p-6">
                {/* Animated Background */}
                <div className="absolute inset-0 overflow-hidden">
                  <motion.div
                    className="absolute w-64 h-64 rounded-full bg-white/10 -top-32 -right-32"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.div
                    className="absolute w-40 h-40 rounded-full bg-white/10 bottom-0 left-0"
                    animate={{ rotate: -360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  />
                </div>

                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-white/20 text-white border-0 gap-1">
                      <Crown className="h-3 w-3" />
                      Save 20-25%
                    </Badge>
                    <Badge className="bg-white/20 text-white border-0 gap-1">
                      <Zap className="h-3 w-3" />
                      Auto-Delivery
                    </Badge>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Start Your Medicine Subscription
                  </h3>
                  <p className="text-white/90 text-sm mb-5">
                    Never miss a dose. Get medicines delivered monthly at discounted prices.
                  </p>

                  <div className="grid grid-cols-2 gap-2 mb-5">
                    {[
                      { icon: '💊', text: 'Smart reminders' },
                      { icon: '🚚', text: 'Free delivery' },
                      { icon: '👨‍👩‍👧', text: 'Family care' },
                      { icon: '📊', text: 'Health tracking' },
                    ].map((item, i) => (
                      <motion.div 
                        key={item.text}
                        className="flex items-center gap-2 text-white/90 text-sm bg-white/10 rounded-lg px-3 py-2"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + (i * 0.1) }}
                      >
                        <span>{item.icon}</span>
                        <span>{item.text}</span>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      onClick={() => navigate('/care/medicines/subscribe')}
                      size="lg"
                      className="w-full bg-white text-green-600 hover:bg-white/90 font-bold shadow-xl"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Subscribe Now - Starting ₹99/mo
                    </Button>
                  </motion.div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Quick Actions */}
        <div>
          <motion.div 
            className="flex items-center gap-2 mb-4"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Quick Actions</h2>
          </motion.div>
          <div className="space-y-3">
            {quickActions.map((action, idx) => (
              <QuickActionCard 
                key={action.title}
                {...action}
                delay={0.1 + (idx * 0.05)}
              />
            ))}
          </div>
        </div>

        {/* Conditions We Support */}
        {conditions.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-4">Conditions We Support</h2>
            <div className="grid grid-cols-3 gap-2">
              {conditions.map((condition, idx) => {
                const IconComponent = conditionIcons[condition.icon || 'heart'] || Heart;
                return (
                  <motion.div
                    key={condition.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 * idx }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Card 
                      className="cursor-pointer hover:shadow-md transition-all border-0 shadow-sm overflow-hidden group"
                      onClick={() => navigate('/care/medicines/subscribe')}
                    >
                      <CardContent className="p-4 text-center relative">
                        <motion.div 
                          className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-3 relative">
                          <IconComponent className="h-6 w-6 text-primary" />
                        </div>
                        <p className="text-sm font-semibold line-clamp-1">{condition.name}</p>
                        {condition.name_hindi && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{condition.name_hindi}</p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pricing Plans */}
        <div>
          <h2 className="text-lg font-bold mb-4">Choose Your Plan</h2>
          <PricingCards 
            plans={pricingPlans}
            selectedPlan={selectedPlan}
            onSelectPlan={setSelectedPlan}
          />
          {!subscription && (
            <motion.div 
              className="mt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Button 
                className="w-full h-12 text-base font-semibold"
                onClick={() => navigate('/care/medicines/subscribe')}
              >
                Get Started with {pricingPlans.find(p => p.id === selectedPlan)?.name}
                <ChevronRight className="h-5 w-5 ml-2" />
              </Button>
            </motion.div>
          )}
        </div>

        {/* Trust Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card className="bg-gradient-to-r from-muted/50 to-muted/30 border-dashed">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <motion.div 
                  className="w-12 h-12 rounded-2xl bg-green-100 flex items-center justify-center"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Shield className="h-6 w-6 text-green-600" />
                </motion.div>
                <div>
                  <p className="font-semibold">Your data is encrypted & secure</p>
                  <p className="text-sm text-muted-foreground">
                    Trusted by 10,000+ families across India 🇮🇳
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <MedicineBottomNav />
    </div>
  );
};

export default MedicineHub;
