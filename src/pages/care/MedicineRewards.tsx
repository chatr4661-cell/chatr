import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Gift, Trophy, Flame, Star, Medal, Target, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MedicineBottomNav } from '@/components/care/MedicineBottomNav';

interface Streak {
  streak_type: string;
  current_streak: number;
  longest_streak: number;
  coins_earned: number;
  last_activity_date: string | null;
}

const MedicineRewards = () => {
  const navigate = useNavigate();
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [totalCoins, setTotalCoins] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRewards();
  }, []);

  const loadRewards = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('health_streaks')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      
      setStreaks(data || []);
      setTotalCoins(data?.reduce((sum, s) => sum + (s.coins_earned || 0), 0) || 0);
    } catch (error) {
      console.error('Error loading rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMedicineStreak = () => streaks.find(s => s.streak_type === 'medicine_adherence');
  const getVitalsStreak = () => streaks.find(s => s.streak_type === 'vitals_tracking');

  const badges = [
    { name: '7-Day Warrior', icon: Medal, requirement: 7, earned: (getMedicineStreak()?.longest_streak || 0) >= 7 },
    { name: '30-Day Champion', icon: Trophy, requirement: 30, earned: (getMedicineStreak()?.longest_streak || 0) >= 30 },
    { name: '100-Day Legend', icon: Star, requirement: 100, earned: (getMedicineStreak()?.longest_streak || 0) >= 100 },
    { name: 'Vitals Tracker', icon: Target, requirement: 7, earned: (getVitalsStreak()?.current_streak || 0) >= 7 },
  ];

  const rewards = [
    { coins: 100, reward: '₹10 off on next order', available: totalCoins >= 100 },
    { coins: 250, reward: 'Free delivery on next order', available: totalCoins >= 250 },
    { coins: 500, reward: '₹50 off on subscription', available: totalCoins >= 500 },
    { coins: 1000, reward: 'Free health checkup', available: totalCoins >= 1000 },
  ];

  const medicineStreak = getMedicineStreak();
  const nextMilestone = [7, 30, 60, 100].find(m => m > (medicineStreak?.current_streak || 0)) || 100;
  const progressToNext = ((medicineStreak?.current_streak || 0) / nextMilestone) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-amber-500 to-orange-600 text-white p-4 pt-safe">
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/care/medicines')} className="text-white hover:bg-white/20">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Health Rewards</h1>
            <p className="text-sm opacity-90">Earn coins, unlock rewards</p>
          </div>
        </div>

        {/* Total Coins */}
        <Card className="bg-white/10 border-white/20 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Total Health Coins</p>
                <p className="text-4xl font-bold">🪙 {totalCoins}</p>
              </div>
              <Gift className="h-12 w-12 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="p-4 space-y-6">
        {/* Current Streak */}
        <Card className="border-2 border-primary">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-full bg-orange-100">
                <Flame className="h-8 w-8 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Current Medicine Streak</p>
                <p className="text-3xl font-bold">{medicineStreak?.current_streak || 0} days</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Best</p>
                <p className="text-xl font-bold text-primary">{medicineStreak?.longest_streak || 0}</p>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Progress to {nextMilestone}-day milestone</span>
                <span>{medicineStreak?.current_streak || 0}/{nextMilestone}</span>
              </div>
              <Progress value={progressToNext} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* How to Earn */}
        <div>
          <h2 className="text-lg font-semibold mb-3">How to Earn Coins</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { action: 'Take medicine on time', coins: 5, icon: '💊' },
              { action: 'Log daily vitals', coins: 3, icon: '📊' },
              { action: 'Complete 7-day streak', coins: 50, icon: '🔥' },
              { action: 'Refer a friend', coins: 100, icon: '👥' },
            ].map((item) => (
              <Card key={item.action}>
                <CardContent className="p-3">
                  <div className="text-2xl mb-2">{item.icon}</div>
                  <p className="text-xs font-medium">{item.action}</p>
                  <p className="text-sm text-primary font-bold">+{item.coins} coins</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Badges</h2>
          <div className="grid grid-cols-4 gap-3">
            {badges.map((badge) => (
              <Card 
                key={badge.name} 
                className={`${badge.earned ? '' : 'opacity-40 grayscale'}`}
              >
                <CardContent className="p-3 text-center">
                  <badge.icon className={`h-8 w-8 mx-auto mb-1 ${badge.earned ? 'text-amber-500' : 'text-muted-foreground'}`} />
                  <p className="text-[10px] font-medium leading-tight">{badge.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Redeem Rewards */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Redeem Rewards</h2>
          <div className="space-y-3">
            {rewards.map((reward) => (
              <Card key={reward.coins} className={!reward.available ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{reward.reward}</p>
                      <p className="text-sm text-muted-foreground">🪙 {reward.coins} coins</p>
                    </div>
                    <Button 
                      size="sm" 
                      disabled={!reward.available}
                      variant={reward.available ? 'default' : 'outline'}
                    >
                      {reward.available ? 'Redeem' : 'Locked'}
                    </Button>
                  </div>
                  {!reward.available && (
                    <Progress 
                      value={(totalCoins / reward.coins) * 100} 
                      className="h-1 mt-2" 
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Streak Calendar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              This Month's Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 31 }, (_, i) => {
                const day = i + 1;
                const today = new Date().getDate();
                const isPast = day < today;
                const isToday = day === today;
                // Simulate some completed days based on streak
                const completed = isPast && day > (today - (medicineStreak?.current_streak || 0));
                
                return (
                  <div
                    key={day}
                    className={`
                      aspect-square rounded-sm flex items-center justify-center text-xs font-medium
                      ${completed ? 'bg-green-500 text-white' : ''}
                      ${isToday ? 'ring-2 ring-primary' : ''}
                      ${!completed && isPast ? 'bg-muted text-muted-foreground' : ''}
                      ${!isPast && !isToday ? 'bg-muted/50 text-muted-foreground' : ''}
                    `}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-green-500" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm bg-muted" />
                <span>Missed</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-sm ring-2 ring-primary" />
                <span>Today</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <MedicineBottomNav />
    </div>
  );
};

export default MedicineRewards;
