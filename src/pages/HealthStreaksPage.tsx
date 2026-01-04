import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Flame, 
  Trophy, 
  Target, 
  Star,
  Calendar,
  TrendingUp,
  Gift,
  Zap,
  Medal,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';

interface StreakData {
  current_streak: number;
  longest_streak: number;
  coins_earned: number;
  last_activity_date: string | null;
  streak_type: string;
}

interface Challenge {
  id: string;
  name: string;
  description: string;
  target_value: number;
  current_progress: number;
  reward_points: number;
  challenge_type: string;
  end_date: string;
  status: string;
}

export default function HealthStreaksPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [streaks, setStreaks] = useState<StreakData[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [totalCoins, setTotalCoins] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Load streaks
      const { data: streakData } = await supabase
        .from('health_streaks')
        .select('*')
        .eq('user_id', user.id);

      if (streakData) {
        setStreaks(streakData);
        const total = streakData.reduce((sum, s) => sum + (s.coins_earned || 0), 0);
        setTotalCoins(total);
      }

      // Load active challenges
      const { data: challengeData } = await supabase
        .from('health_challenges')
        .select(`
          *,
          challenge_participants!inner(*)
        `)
        .eq('challenge_participants.user_id', user.id)
        .eq('is_active', true);

      if (challengeData) {
        setChallenges(challengeData.map(c => ({
          ...c,
          current_progress: c.challenge_participants[0]?.current_progress || 0,
          status: c.challenge_participants[0]?.completed ? 'completed' : 'active'
        })));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStreakIcon = (type: string) => {
    switch (type) {
      case 'medicine': return <Flame className="h-5 w-5 text-orange-500" />;
      case 'workout': return <Zap className="h-5 w-5 text-yellow-500" />;
      case 'sleep': return <Star className="h-5 w-5 text-purple-500" />;
      case 'nutrition': return <Target className="h-5 w-5 text-green-500" />;
      default: return <Trophy className="h-5 w-5 text-blue-500" />;
    }
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 30) return 'from-amber-400 to-orange-500';
    if (streak >= 14) return 'from-purple-400 to-pink-500';
    if (streak >= 7) return 'from-blue-400 to-indigo-500';
    return 'from-green-400 to-emerald-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">Health Streaks & Challenges</h1>
              <p className="text-sm text-white/80">Stay consistent, earn rewards!</p>
            </div>
          </div>

          {/* Coins Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <motion.span 
                className="text-3xl"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                🪙
              </motion.span>
              <div>
                <p className="text-sm text-white/80">Total Coins Earned</p>
                <p className="text-2xl font-bold">{totalCoins.toLocaleString()}</p>
              </div>
            </div>
            <Button 
              size="sm" 
              className="bg-white/20 hover:bg-white/30"
              onClick={() => navigate('/health-wallet')}
            >
              <Gift className="h-4 w-4 mr-1" />
              Redeem
            </Button>
          </motion.div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {/* Active Streaks */}
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Your Streaks
            </h2>
            
            {streaks.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {streaks.map((streak, idx) => (
                  <motion.div
                    key={streak.streak_type}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className="overflow-hidden">
                      <div className={`h-2 bg-gradient-to-r ${getStreakColor(streak.current_streak)}`} />
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          {getStreakIcon(streak.streak_type)}
                          <span className="text-sm font-medium capitalize">
                            {streak.streak_type}
                          </span>
                        </div>
                        <div className="flex items-end justify-between">
                          <div>
                            <p className="text-3xl font-bold">{streak.current_streak}</p>
                            <p className="text-xs text-muted-foreground">day streak</p>
                          </div>
                          <div className="text-right">
                            <Badge variant="outline" className="text-xs">
                              <Trophy className="h-3 w-3 mr-1" />
                              Best: {streak.longest_streak}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="bg-muted/50">
                <CardContent className="p-6 text-center">
                  <Flame className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-medium">No Active Streaks</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Start tracking your health activities to build streaks!
                  </p>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Active Challenges */}
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Active Challenges
            </h2>

            {challenges.length > 0 ? (
              <div className="space-y-3">
                {challenges.map((challenge, idx) => (
                  <motion.div
                    key={challenge.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center">
                              <Medal className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-medium">{challenge.name}</h3>
                              <p className="text-xs text-muted-foreground">{challenge.description}</p>
                            </div>
                          </div>
                          <Badge className="bg-yellow-100 text-yellow-700">
                            🪙 {challenge.reward_points}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">
                              {challenge.current_progress} / {challenge.target_value}
                            </span>
                          </div>
                          <Progress 
                            value={(challenge.current_progress / challenge.target_value) * 100} 
                            className="h-2"
                          />
                        </div>

                        {challenge.end_date && (
                          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Ends: {new Date(challenge.end_date).toLocaleDateString()}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="bg-muted/50">
                <CardContent className="p-6 text-center">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-medium">No Active Challenges</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Check back later for new health challenges!
                  </p>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Achievement Milestones */}
          <section>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Milestones
            </h2>

            <div className="grid grid-cols-3 gap-3">
              {[
                { days: 7, label: 'Week Warrior', icon: '🔥', unlocked: streaks.some(s => s.longest_streak >= 7) },
                { days: 14, label: 'Fortnight Force', icon: '⚡', unlocked: streaks.some(s => s.longest_streak >= 14) },
                { days: 30, label: 'Monthly Master', icon: '🏆', unlocked: streaks.some(s => s.longest_streak >= 30) },
                { days: 60, label: 'Diamond Devotee', icon: '💎', unlocked: streaks.some(s => s.longest_streak >= 60) },
                { days: 90, label: 'Platinum Pro', icon: '👑', unlocked: streaks.some(s => s.longest_streak >= 90) },
                { days: 365, label: 'Year Legend', icon: '🌟', unlocked: streaks.some(s => s.longest_streak >= 365) },
              ].map((milestone, idx) => (
                <motion.div
                  key={milestone.days}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className={`text-center ${milestone.unlocked ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200' : 'opacity-60'}`}>
                    <CardContent className="p-3">
                      <span className="text-2xl">{milestone.icon}</span>
                      <p className="text-xs font-medium mt-1">{milestone.label}</p>
                      <p className="text-[10px] text-muted-foreground">{milestone.days} days</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Tips Section */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Pro Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">• Complete daily activities before midnight to maintain streaks</p>
              <p className="text-sm">• Higher streaks = more coins per activity</p>
              <p className="text-sm">• Join challenges to earn bonus rewards</p>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
