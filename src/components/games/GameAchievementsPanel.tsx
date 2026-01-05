import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Crown, Star, Flame, Target, Gift, Lock, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: string;
  coin_reward: number;
  xp_reward: number;
  requirement_type: string;
  requirement_value: number;
  unlocked?: boolean;
  progress?: number;
}

interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  game_type: string;
  target_value: number;
  coin_reward: number;
  xp_reward: number;
  expires_at: string;
  current_progress?: number;
  completed?: boolean;
}

interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  avatar_url?: string;
  score: number;
  level: number;
  streak_days: number;
}

const rarityColors = {
  common: 'from-gray-400 to-gray-500',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-amber-400 to-orange-500'
};

const rarityBorders = {
  common: 'border-gray-500/30',
  rare: 'border-blue-500/30',
  epic: 'border-purple-500/30',
  legendary: 'border-amber-500/30'
};

export function GameAchievementsPanel() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('achievements');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Load achievements
      const { data: achievementData } = await supabase
        .from('game_achievements')
        .select('*')
        .order('rarity', { ascending: true });

      // Load user achievements if logged in
      let userAchievements: string[] = [];
      if (user) {
        const { data: userAch } = await supabase
          .from('game_user_achievements')
          .select('achievement_id')
          .eq('user_id', user.id);
        userAchievements = (userAch || []).map(a => a.achievement_id);
      }

      // Map achievements with unlock status
      const mappedAchievements = (achievementData || []).map(ach => ({
        ...ach,
        unlocked: userAchievements.includes(ach.id),
        progress: userAchievements.includes(ach.id) ? 100 : Math.floor(Math.random() * 70) // Simulated progress
      }));
      setAchievements(mappedAchievements);

      // Load daily challenges
      const { data: challengeData } = await supabase
        .from('game_daily_challenges')
        .select('*')
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString());

      setChallenges((challengeData || []).map(ch => ({
        ...ch,
        current_progress: Math.floor(Math.random() * ch.target_value), // Simulated
        completed: false
      })));

      // Load leaderboard
      const { data: leaderboardData } = await supabase
        .from('game_leaderboards')
        .select('*')
        .order('total_score', { ascending: false })
        .limit(20);

      setLeaderboard((leaderboardData || []).map((entry, idx) => ({
        ...entry,
        rank: idx + 1,
        username: `Player${idx + 1}`,
        streak_days: Math.floor(Math.random() * 30) + 1
      })));

    } catch (error) {
      console.error('Error loading game data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full bg-white/5 border border-white/10">
          <TabsTrigger value="achievements" className="flex-1 gap-1 text-xs">
            <Trophy className="w-3 h-3" /> Achievements
          </TabsTrigger>
          <TabsTrigger value="challenges" className="flex-1 gap-1 text-xs">
            <Target className="w-3 h-3" /> Daily
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex-1 gap-1 text-xs">
            <Crown className="w-3 h-3" /> Top 20
          </TabsTrigger>
        </TabsList>

        <TabsContent value="achievements" className="mt-3">
          <div className="grid gap-2">
            {achievements.map((ach, idx) => (
              <motion.div
                key={ach.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className={`bg-white/5 border ${ach.unlocked ? rarityBorders[ach.rarity] : 'border-white/10'} overflow-hidden`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                      ach.unlocked 
                        ? `bg-gradient-to-br ${rarityColors[ach.rarity]}` 
                        : 'bg-white/10 grayscale'
                    }`}>
                      {ach.unlocked ? ach.icon : <Lock className="w-5 h-5 text-white/30" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-semibold text-sm ${ach.unlocked ? 'text-white' : 'text-white/50'}`}>
                          {ach.name}
                        </p>
                        {ach.unlocked && (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                      </div>
                      <p className="text-[10px] text-white/40 line-clamp-1">{ach.description}</p>
                      {!ach.unlocked && (
                        <Progress value={ach.progress} className="h-1 mt-1.5 bg-white/10" />
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
                        <Star className="w-3 h-3 fill-current" /> {ach.coin_reward}
                      </div>
                      <p className="text-[9px] text-white/30">+{ach.xp_reward} XP</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="challenges" className="mt-3">
          <div className="space-y-2">
            {challenges.length === 0 ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-6 text-center">
                  <Gift className="w-10 h-10 mx-auto text-white/30 mb-2" />
                  <p className="text-white/50 text-sm">No active challenges</p>
                  <p className="text-white/30 text-xs">Check back tomorrow!</p>
                </CardContent>
              </Card>
            ) : (
              challenges.map((challenge, idx) => (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-purple-500/30">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-semibold text-sm text-white">{challenge.title}</p>
                          <p className="text-[10px] text-white/50">{challenge.description}</p>
                        </div>
                        <Badge className="bg-white/10 text-white/70 text-[9px] px-1.5">
                          {getTimeRemaining(challenge.expires_at)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1">
                          <Progress 
                            value={(challenge.current_progress! / challenge.target_value) * 100} 
                            className="h-2 bg-white/10" 
                          />
                          <p className="text-[9px] text-white/40 mt-1">
                            {challenge.current_progress}/{challenge.target_value}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="flex items-center gap-0.5 text-amber-400 font-bold">
                            <Star className="w-3 h-3 fill-current" /> {challenge.coin_reward}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="mt-3">
          <div className="space-y-1.5">
            {leaderboard.slice(0, 3).map((entry, idx) => (
              <motion.div
                key={entry.user_id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className={`border ${
                  idx === 0 ? 'bg-amber-500/20 border-amber-500/30' :
                  idx === 1 ? 'bg-gray-400/20 border-gray-400/30' :
                  'bg-amber-700/20 border-amber-700/30'
                }`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg ${
                      idx === 0 ? 'text-amber-400' :
                      idx === 1 ? 'text-gray-300' :
                      'text-amber-600'
                    }`}>
                      {idx === 0 ? <Crown className="w-5 h-5 fill-current" /> :
                       idx === 1 ? <Medal className="w-5 h-5" /> :
                       <Medal className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-white">{entry.username}</p>
                      <p className="text-[10px] text-white/40">
                        {entry.level} levels • {entry.streak_days} day streak
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-white">{entry.score.toLocaleString()}</p>
                      <p className="text-[9px] text-white/40">points</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            
            <ScrollArea className="h-[200px]">
              {leaderboard.slice(3).map((entry) => (
                <div
                  key={entry.user_id}
                  className="flex items-center gap-3 py-2 px-3 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <span className="w-6 text-center font-medium text-white/50 text-sm">{entry.rank}</span>
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center text-white text-xs font-bold">
                    {entry.username.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white/80">{entry.username}</p>
                  </div>
                  <span className="text-sm font-medium text-white/60">{entry.score.toLocaleString()}</span>
                </div>
              ))}
              <ScrollBar />
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}