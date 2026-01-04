import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Pill, Users, Bell, Activity, FileText, Gift, 
  ChevronRight, Heart, Droplet, Wind, Bone, Sparkles, Package,
  Calendar, TrendingUp, Shield, Clock, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MedicineBottomNav } from '@/components/care/MedicineBottomNav';
import { TodayMedicineCard } from '@/components/care/TodayMedicineCard';
import { DeliveryTracker } from '@/components/care/DeliveryTracker';
import { format, addDays } from 'date-fns';

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
  const [todayAdherence, setTodayAdherence] = useState(0);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, username')
        .eq('id', user.id)
        .single();
      
      if (profile) {
        setUserName(profile.username || profile.full_name?.split(' ')[0] || 'there');
      }

      // Load conditions
      const { data: conditionsData } = await supabase
        .from('health_conditions')
        .select('*')
        .eq('is_active', true)
        .limit(6);
      
      if (conditionsData) setConditions(conditionsData);

      // Load streak
      const { data: streakData } = await supabase
        .from('health_streaks')
        .select('*')
        .eq('user_id', user.id)
        .eq('streak_type', 'medicine_adherence')
        .single();
      
      if (streakData) setStreak(streakData);

      // Load active subscription
      const { data: subData } = await supabase
        .from('medicine_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (subData) setSubscription(subData);

      // Calculate today's adherence
      const today = new Date().toISOString().split('T')[0];
      const { data: intakeData } = await supabase
        .from('medicine_intake_log')
        .select('status')
        .eq('user_id', user.id)
        .gte('scheduled_at', today);

      if (intakeData && intakeData.length > 0) {
        const taken = intakeData.filter(i => i.status === 'taken').length;
        setTodayAdherence(Math.round((taken / intakeData.length) * 100));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { 
      title: 'My Subscriptions', 
      description: 'Manage your plans',
      icon: Package, 
      route: '/care/medicines/subscriptions',
      gradient: 'from-primary to-primary/70'
    },
    { 
      title: 'Family Control', 
      description: 'Manage family health',
      icon: Users, 
      route: '/care/medicines/family',
      gradient: 'from-blue-500 to-cyan-500'
    },
    { 
      title: 'Prescriptions', 
      description: 'AI-powered scanner',
      icon: FileText, 
      route: '/care/medicines/prescriptions',
      gradient: 'from-purple-500 to-pink-500'
    },
    { 
      title: 'Track Vitals', 
      description: 'BP, Sugar, Weight',
      icon: Activity, 
      route: '/care/medicines/vitals',
      gradient: 'from-green-500 to-emerald-500'
    },
  ];

  const benefits = [
    { icon: TrendingUp, text: 'Save 20-25% on medicines' },
    { icon: Clock, text: 'Auto-delivery every month' },
    { icon: Bell, text: 'Smart WhatsApp reminders' },
    { icon: Shield, text: 'Family caregiver alerts' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background pb-24">
      {/* Premium Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        
        <div className="relative p-4 pt-safe">
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/care')} 
              className="text-white/90 hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Badge className="bg-white/20 text-white border-0 gap-1">
                <Sparkles className="h-3 w-3" />
                CHATR Health
              </Badge>
            </div>
          </div>

          {/* Welcome Section */}
          <div className="mb-6">
            <p className="text-white/80 text-sm">Welcome back,</p>
            <h1 className="text-2xl font-bold text-white">{userName} 👋</h1>
          </div>

          {/* Streak & Coins Card */}
          <Card className="bg-white/15 backdrop-blur-lg border-white/20 text-white shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg">
                    <span className="text-2xl">🔥</span>
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{streak?.current_streak || 0}</p>
                    <p className="text-sm text-white/80">day streak</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 justify-end">
                    <span className="text-2xl">🪙</span>
                    <span className="text-2xl font-bold">{streak?.coins_earned || 0}</span>
                  </div>
                  <p className="text-sm text-white/80">health coins</p>
                </div>
              </div>
              
              <div className="bg-white/10 rounded-xl p-3">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-white/80">Today's Progress</span>
                  <span className="font-medium">{todayAdherence}% completed</span>
                </div>
                <Progress value={todayAdherence} className="h-2 bg-white/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="p-4 space-y-6 -mt-2">
        {/* Today's Medicines */}
        <TodayMedicineCard />

        {/* Delivery Tracker (if has subscription) */}
        {subscription && subscription.next_delivery_date && (
          <DeliveryTracker 
            status="shipped"
            orderDate={format(new Date(), 'dd MMM')}
            expectedDate={format(new Date(subscription.next_delivery_date), 'dd MMM yyyy')}
            trackingId={`CHT${subscription.id.slice(0, 8).toUpperCase()}`}
          />
        )}

        {/* Quick Subscribe CTA (if no subscription) */}
        {!subscription && (
          <Card className="overflow-hidden border-0 shadow-xl">
            <div className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <Badge className="bg-white/20 text-white border-0 mb-3">
                    <Star className="h-3 w-3 mr-1" />
                    Save 20-25%
                  </Badge>
                  <h3 className="font-bold text-xl text-white mb-1">
                    Start Medicine Subscription
                  </h3>
                  <p className="text-white/90 text-sm mb-4">
                    Never run out of medicines. Auto-delivery every month.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {benefits.map((b, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs text-white/90 bg-white/10 rounded-full px-2 py-1">
                        <b.icon className="h-3 w-3" />
                        <span>{b.text}</span>
                      </div>
                    ))}
                  </div>
                  <Button 
                    onClick={() => navigate('/care/medicines/subscribe')}
                    className="bg-white text-green-600 hover:bg-white/90 font-semibold shadow-lg"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Subscribe Now - ₹99/mo
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Quick Actions Grid */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Card 
                key={action.title}
                className="cursor-pointer hover:shadow-lg transition-all duration-300 overflow-hidden group"
                onClick={() => navigate(action.route)}
              >
                <CardContent className="p-4 relative">
                  <div className={`absolute -right-6 -top-6 w-20 h-20 rounded-full bg-gradient-to-br ${action.gradient} opacity-10 group-hover:opacity-20 transition-opacity`} />
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3 shadow-lg`}>
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-sm">{action.title}</h3>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                  <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Conditions We Cover */}
        {conditions.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Conditions We Support</h2>
            <div className="grid grid-cols-3 gap-2">
              {conditions.map((condition) => {
                const IconComponent = conditionIcons[condition.icon || 'heart'] || Heart;
                return (
                  <Card 
                    key={condition.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                    onClick={() => navigate('/care/medicines/subscribe')}
                  >
                    <CardContent className="p-3 text-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-2">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-xs font-medium line-clamp-1">{condition.name}</p>
                      {condition.name_hindi && (
                        <p className="text-[10px] text-muted-foreground">{condition.name_hindi}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Pricing Plans */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Choose Your Plan</h2>
          <div className="space-y-3">
            {[
              { 
                id: 'care', 
                name: 'Care', 
                price: 99, 
                desc: 'For individuals',
                features: ['1 user', 'Auto-delivery', 'Reminders', 'Vitals tracking'],
                badge: 'Most Popular',
                gradient: 'from-primary to-primary/70'
              },
              { 
                id: 'family', 
                name: 'Family', 
                price: 199, 
                desc: 'Up to 4 members',
                features: ['4 users', 'Caregiver alerts', 'Family dashboard', 'Priority support'],
                badge: 'Best Value',
                gradient: 'from-blue-500 to-cyan-500'
              },
              { 
                id: 'care_plus', 
                name: 'Care+', 
                price: 299, 
                desc: 'With doctor consults',
                features: ['Unlimited users', '2 free consults/mo', '24/7 support', 'Lab discounts'],
                badge: 'Premium',
                gradient: 'from-purple-500 to-pink-500'
              },
            ].map((plan, idx) => (
              <Card 
                key={plan.id} 
                className={`overflow-hidden cursor-pointer hover:shadow-lg transition-shadow ${idx === 0 ? 'ring-2 ring-primary' : ''}`}
                onClick={() => navigate('/care/medicines/subscribe')}
              >
                <CardContent className="p-0">
                  <div className="flex">
                    <div className={`w-1.5 bg-gradient-to-b ${plan.gradient}`} />
                    <div className="flex-1 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <Badge className={`bg-gradient-to-r ${plan.gradient} text-white border-0 mb-1`}>
                            {plan.badge}
                          </Badge>
                          <h3 className="font-bold text-lg">{plan.name}</h3>
                          <p className="text-sm text-muted-foreground">{plan.desc}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold">₹{plan.price}</p>
                          <p className="text-xs text-muted-foreground">/month</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {plan.features.map((f) => (
                          <Badge key={f} variant="secondary" className="text-[10px] font-normal">
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Trust Banner */}
        <Card className="bg-gradient-to-r from-muted/50 to-muted/30 border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Your data is encrypted & secure</p>
                <p className="text-xs text-muted-foreground">
                  Trusted by 10,000+ families across India 🇮🇳
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <MedicineBottomNav />
    </div>
  );
};

export default MedicineHub;
