import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Coins, Flame, Target, Trophy, Play, Gift, TrendingUp } from 'lucide-react';

interface Challenge {
  id: string;
  challenge_name: string;
  challenge_description: string;
  challenge_type: string;
  target_value: number;
  coin_reward: number;
}

interface ChallengeProgress {
  challenge_id: string;
  current_progress: number;
  completed: boolean;
}

interface RewardsSettings {
  coin_multiplier: number;
  current_streak: number;
  longest_streak: number;
  total_coins_earned: number;
  total_ads_watched: number;
  daily_challenges_enabled: boolean;
  ad_rewards_enabled: boolean;
}

export const RewardsModePanel = () => {
  const [settings, setSettings] = useState<RewardsSettings | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [progress, setProgress] = useState<ChallengeProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load settings
    const { data: settingsData } = await supabase
      .from('rewards_mode_settings' as any)
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (settingsData) {
      setSettings(settingsData as any);
    }

    // Load challenges
    const { data: challengesData } = await supabase
      .from('rewards_daily_challenges' as any)
      .select('*')
      .eq('is_active', true);

    if (challengesData) {
      setChallenges(challengesData as any);
    }

    // Load progress
    const today = new Date().toISOString().split('T')[0];
    const { data: progressData } = await supabase
      .from('user_challenge_progress' as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today);

    if (progressData) {
      setProgress(progressData as any);
    }

    setLoading(false);
  };

  const watchAd = async () => {
    // Simulate ad watching
    toast.info('Loading reward ad...');
    
    setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const coinsEarned = Math.floor(5 * (settings?.coin_multiplier || 1));
      
      await supabase
        .from('rewards_mode_settings' as any)
        .update({
          total_ads_watched: (settings?.total_ads_watched || 0) + 1,
          total_coins_earned: (settings?.total_coins_earned || 0) + coinsEarned
        })
        .eq('user_id', user.id);

      toast.success(`Earned ${coinsEarned} coins!`);
      loadData();
    }, 2000);
  };

  const claimChallengeReward = async (challengeId: string, reward: number) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split('T')[0];
    const coinsEarned = Math.floor(reward * (settings?.coin_multiplier || 1));

    await supabase
      .from('user_challenge_progress' as any)
      .upsert({
        user_id: user.id,
        challenge_id: challengeId,
        date: today,
        completed: true,
        completed_at: new Date().toISOString(),
        coins_awarded: coinsEarned
      }, { onConflict: 'user_id,challenge_id,date' });

    await supabase
      .from('rewards_mode_settings' as any)
      .update({
        total_coins_earned: (settings?.total_coins_earned || 0) + coinsEarned
      })
      .eq('user_id', user.id);

    toast.success(`Claimed ${coinsEarned} coins!`);
    loadData();
  };

  const updateSetting = async (key: string, value: boolean) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('rewards_mode_settings' as any)
      .update({ [key]: value })
      .eq('user_id', user.id);

    setSettings(prev => prev ? { ...prev, [key]: value } : null);
  };

  if (loading) {
    return <div className="animate-pulse h-48 bg-muted rounded-lg" />;
  }

  const getChallengeProgress = (challengeId: string) => {
    return progress.find(p => p.challenge_id === challengeId);
  };

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{settings?.total_coins_earned || 0}</p>
                <p className="text-xs text-muted-foreground">Total Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{settings?.current_streak || 0}</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{settings?.coin_multiplier || 1}x</p>
                <p className="text-xs text-muted-foreground">Multiplier</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Play className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{settings?.total_ads_watched || 0}</p>
                <p className="text-xs text-muted-foreground">Ads Watched</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Watch Ad */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5" />
            Watch & Earn
          </CardTitle>
          <CardDescription>Watch ads to earn coins</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={watchAd} className="w-full gap-2">
            <Play className="h-4 w-4" />
            Watch Ad (+{Math.floor(5 * (settings?.coin_multiplier || 1))} coins)
          </Button>
        </CardContent>
      </Card>

      {/* Daily Challenges */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Daily Challenges
          </CardTitle>
          <CardDescription>Complete challenges to earn bonus coins</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {challenges.map((challenge) => {
            const prog = getChallengeProgress(challenge.id);
            const progressPercent = prog 
              ? Math.min((prog.current_progress / challenge.target_value) * 100, 100) 
              : 0;
            const isCompleted = prog?.completed;

            return (
              <div key={challenge.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{challenge.challenge_name}</h4>
                    <p className="text-sm text-muted-foreground">{challenge.challenge_description}</p>
                  </div>
                  <Badge variant={isCompleted ? 'default' : 'secondary'}>
                    +{Math.floor(challenge.coin_reward * (settings?.coin_multiplier || 1))} coins
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Progress value={progressPercent} />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {prog?.current_progress || 0}/{challenge.target_value}
                    </span>
                    {isCompleted ? (
                      <Badge variant="outline" className="gap-1">
                        <Trophy className="h-3 w-3" /> Completed
                      </Badge>
                    ) : progressPercent >= 100 ? (
                      <Button 
                        size="sm" 
                        onClick={() => claimChallengeReward(challenge.id, challenge.coin_reward)}
                      >
                        Claim Reward
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Rewards Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Daily Challenges</Label>
              <p className="text-sm text-muted-foreground">Show daily challenge notifications</p>
            </div>
            <Switch
              checked={settings?.daily_challenges_enabled ?? true}
              onCheckedChange={(checked) => updateSetting('daily_challenges_enabled', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Ad Rewards</Label>
              <p className="text-sm text-muted-foreground">Enable watch-to-earn feature</p>
            </div>
            <Switch
              checked={settings?.ad_rewards_enabled ?? true}
              onCheckedChange={(checked) => updateSetting('ad_rewards_enabled', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
