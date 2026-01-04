import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pill, Users, Bell, Activity, FileText, Gift, ChevronRight, Heart, Droplet, Wind, Bone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  const [todayAdherence, setTodayAdherence] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load conditions
      const { data: conditionsData } = await supabase
        .from('health_conditions')
        .select('*')
        .eq('is_active', true);
      
      if (conditionsData) setConditions(conditionsData);

      // Load streak
      const { data: streakData } = await supabase
        .from('health_streaks')
        .select('*')
        .eq('user_id', user.id)
        .eq('streak_type', 'medicine_adherence')
        .single();
      
      if (streakData) setStreak(streakData);

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
      description: 'Manage your medicine plans',
      icon: Pill, 
      route: '/care/medicines/subscriptions',
      color: 'bg-primary/10 text-primary'
    },
    { 
      title: 'Family Members', 
      description: 'Manage family health',
      icon: Users, 
      route: '/care/medicines/family',
      color: 'bg-blue-500/10 text-blue-500'
    },
    { 
      title: 'Reminders', 
      description: 'Set medicine reminders',
      icon: Bell, 
      route: '/care/medicines/reminders',
      color: 'bg-amber-500/10 text-amber-500'
    },
    { 
      title: 'Track Vitals', 
      description: 'Log BP, Sugar, Weight',
      icon: Activity, 
      route: '/care/medicines/vitals',
      color: 'bg-green-500/10 text-green-500'
    },
    { 
      title: 'Prescriptions', 
      description: 'Upload & manage',
      icon: FileText, 
      route: '/care/medicines/prescriptions',
      color: 'bg-purple-500/10 text-purple-500'
    },
    { 
      title: 'Health Rewards', 
      description: 'Earn coins & badges',
      icon: Gift, 
      route: '/care/medicines/rewards',
      color: 'bg-pink-500/10 text-pink-500'
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-4">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-white/20">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">CHATR Health</h1>
            <p className="text-sm opacity-90">Smart Medicine Subscription</p>
          </div>
        </div>

        {/* Streak Card */}
        <Card className="bg-white/10 border-white/20 text-primary-foreground">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Current Streak</p>
                <p className="text-3xl font-bold">{streak?.current_streak || 0} days</p>
                <p className="text-xs opacity-70">Best: {streak?.longest_streak || 0} days</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-80">Health Coins</p>
                <p className="text-2xl font-bold">🪙 {streak?.coins_earned || 0}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span>Today's Adherence</span>
                <span>{todayAdherence}%</span>
              </div>
              <Progress value={todayAdherence} className="h-2 bg-white/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 space-y-6">
        {/* Quick Subscribe CTA */}
        <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg">Start Medicine Subscription</h3>
                <p className="text-sm opacity-90">Save 20-25% on monthly medicines</p>
                <p className="text-xs mt-1 opacity-80">Starting at ₹99/month</p>
              </div>
              <Button 
                onClick={() => navigate('/care/medicines/subscribe')}
                className="bg-white text-green-600 hover:bg-white/90"
              >
                <Plus className="h-4 w-4 mr-1" />
                Subscribe
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Conditions We Cover */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Conditions We Cover</h2>
          <div className="grid grid-cols-3 gap-3">
            {conditions.slice(0, 6).map((condition) => {
              const IconComponent = conditionIcons[condition.icon || 'heart'] || Heart;
              return (
                <Card key={condition.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardContent className="p-3 text-center">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-xs font-medium line-clamp-2">{condition.name}</p>
                    {condition.name_hindi && (
                      <p className="text-[10px] text-muted-foreground">{condition.name_hindi}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Card 
                key={action.title}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(action.route)}
              >
                <CardContent className="p-4">
                  <div className={`w-10 h-10 rounded-lg ${action.color} flex items-center justify-center mb-3`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-medium text-sm">{action.title}</h3>
                  <p className="text-xs text-muted-foreground">{action.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Pricing Plans */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Subscription Plans</h2>
          <div className="space-y-3">
            <Card className="border-primary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge className="mb-2">Most Popular</Badge>
                    <h3 className="font-bold">Care Plan</h3>
                    <p className="text-sm text-muted-foreground">For individuals</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">₹99<span className="text-sm font-normal">/mo</span></p>
                    <p className="text-xs text-green-600">Save 20-25%</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">Auto-delivery</Badge>
                  <Badge variant="secondary" className="text-xs">Reminders</Badge>
                  <Badge variant="secondary" className="text-xs">Vitals tracking</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge variant="outline" className="mb-2">For Families</Badge>
                    <h3 className="font-bold">Family Plan</h3>
                    <p className="text-sm text-muted-foreground">Up to 4 members</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">₹199<span className="text-sm font-normal">/mo</span></p>
                    <p className="text-xs text-green-600">₹50/member</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="text-xs">Caregiver alerts</Badge>
                  <Badge variant="secondary" className="text-xs">Emergency escalation</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Trust Banner */}
        <Card className="bg-muted/50">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              🔒 Your health data is encrypted and secure
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Trusted by 10,000+ families across India
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MedicineHub;
