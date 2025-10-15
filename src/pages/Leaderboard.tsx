import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Trophy, Medal, Award, Coins, Users } from 'lucide-react';

export default function Leaderboard() {
  const [leaderboards, setLeaderboards] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('referrals');

  useEffect(() => {
    loadLeaderboards();
  }, [activeTab]);

  const loadLeaderboards = async () => {
    const { data } = await supabase
      .from('chatr_leaderboards')
      .select(`
        *,
        profiles:user_id (username, avatar_url)
      `)
      .eq('leaderboard_type', activeTab)
      .eq('period', 'monthly')
      .order('rank')
      .limit(100);

    setLeaderboards(data || []);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-orange-600" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="glass-card border-b relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10" />
        <div className="max-w-4xl mx-auto px-4 py-6 relative">
          <div className="text-center">
            <Trophy className="h-12 w-12 mx-auto mb-2 text-primary animate-pulse" />
            <h1 className="text-3xl font-bold">Leaderboards</h1>
            <p className="text-muted-foreground">Top performers this month</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="glass-card mb-6 w-full grid grid-cols-3">
            <TabsTrigger value="referrals">
              <Users className="h-4 w-4 mr-2" />
              Referrals
            </TabsTrigger>
            <TabsTrigger value="coins">
              <Coins className="h-4 w-4 mr-2" />
              Coins
            </TabsTrigger>
            <TabsTrigger value="creators">
              <Award className="h-4 w-4 mr-2" />
              Creators
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Top 100 - {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {leaderboards.length > 0 ? (
                    leaderboards.map((entry, i) => (
                      <div
                        key={entry.id}
                        className={`flex items-center gap-4 p-4 rounded-lg transition-all ${
                          entry.rank <= 3
                            ? 'glass-card shadow-glow'
                            : 'hover:bg-accent/5'
                        }`}
                      >
                        <div className="w-12 text-center">
                          {getRankIcon(entry.rank) || (
                            <span className="font-bold text-lg">#{entry.rank}</span>
                          )}
                        </div>

                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-hero text-white">
                            {entry.profiles?.username?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1">
                          <p className="font-semibold">
                            {entry.profiles?.username || 'Anonymous'}
                          </p>
                          {entry.city && (
                            <p className="text-xs text-muted-foreground">{entry.city}</p>
                          )}
                        </div>

                        <div className="text-right">
                          <p className="font-bold text-lg bg-gradient-hero bg-clip-text text-transparent">
                            {entry.score.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {activeTab === 'coins' ? 'coins' : activeTab === 'referrals' ? 'users' : 'posts'}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Trophy className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No leaderboard data yet</p>
                      <p className="text-sm">Be the first to climb the ranks!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
