import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Coins, History, IndianRupee, Sparkles, Target, Wallet } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ReferralSystem } from '@/components/ReferralSystem';

interface Mission {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  reward_coins: number;
  reward_rupees: number;
  current_completions: number | null;
  max_completions: number | null;
}

interface EarningEvent {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected' | 'cancelled';
  reward_coins: number;
  reward_rupees: number;
  occurred_at: string;
}

export default function Earn() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [lifetimeEarned, setLifetimeEarned] = useState(0);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [recentEvents, setRecentEvents] = useState<EarningEvent[]>([]);

  useEffect(() => {
    const loadEarnData = async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;

      if (!user) {
        navigate('/auth');
        return;
      }

      const [pointsRes, missionsRes, eventsRes] = await Promise.all([
        supabase
          .from('user_points')
          .select('balance, lifetime_earned')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('micro_tasks')
          .select('id, title, description, task_type, reward_coins, reward_rupees, current_completions, max_completions')
          .eq('is_active', true)
          .order('reward_rupees', { ascending: false })
          .limit(12),
        supabase
          .from('earning_events')
          .select('id, title, description, event_type, status, reward_coins, reward_rupees, occurred_at')
          .order('occurred_at', { ascending: false })
          .limit(6),
      ]);

      if (pointsRes.data) {
        setBalance(pointsRes.data.balance || 0);
        setLifetimeEarned(pointsRes.data.lifetime_earned || 0);
      }

      setMissions((missionsRes.data || []) as Mission[]);
      setRecentEvents((eventsRes.data || []) as EarningEvent[]);
      setLoading(false);
    };

    loadEarnData();
  }, [navigate]);

  const pendingValue = useMemo(
    () => recentEvents
      .filter((event) => event.status === 'pending' || event.status === 'approved')
      .reduce((sum, event) => sum + Number(event.reward_rupees || 0), 0),
    [recentEvents]
  );

  const statusVariant = (status: EarningEvent['status']) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'approved':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'destructive';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Earn</h1>
              <p className="text-xs text-muted-foreground">Live missions, rewards, and referral earnings</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/earn/history')}>
            <History className="mr-2 h-4 w-4" />
            Full History
          </Button>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 p-4 pb-10">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Available to Earn</CardTitle>
                <CardDescription>Powered by CHATR missions and verified referrals</CardDescription>
              </div>
              <Badge variant="secondary">Live production ledger</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-24 w-full" />)
            ) : (
              <>
                <div className="rounded-lg border bg-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <Wallet className="h-4 w-4" />
                    <span className="text-sm">Current Balance</span>
                  </div>
                  <div className="text-2xl font-semibold">{balance} Coins</div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <Coins className="h-4 w-4" />
                    <span className="text-sm">Lifetime Earned</span>
                  </div>
                  <div className="text-2xl font-semibold">{lifetimeEarned} Coins</div>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <IndianRupee className="h-4 w-4" />
                    <span className="text-sm">Awaiting Payout</span>
                  </div>
                  <div className="text-2xl font-semibold">₹{pendingValue.toFixed(2)}</div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <section className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Available Missions
                </CardTitle>
                <CardDescription>Claim tasks, complete verification, and move rewards from pending to approved and paid.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 w-full" />)
                ) : missions.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No missions are live right now.
                  </div>
                ) : (
                  missions.map((mission) => (
                    <div key={mission.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{mission.title}</h3>
                            <Badge variant="outline">{mission.task_type.replace('_', ' ')}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{mission.description || 'Complete the mission instructions to unlock this reward.'}</p>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {mission.current_completions || 0} / {mission.max_completions || 0} completed
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">₹{Number(mission.reward_rupees || 0).toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">{mission.reward_coins || 0} coins</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Reward Calculation Rules
                </CardTitle>
                <CardDescription>Live payout logic shown exactly the way the system calculates it.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <div className="text-sm font-medium">Mission Rewards</div>
                  <p className="mt-1 text-sm text-muted-foreground">Each task publishes its own coin + rupee reward. Submission starts as pending, then moves to approved after review.</p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm font-medium">Referral Rewards</div>
                  <p className="mt-1 text-sm text-muted-foreground">Invite a friend, and once they complete signup verification, the referrer earns 50 coins and the new user gets 25 coins.</p>
                </div>
                <div className="rounded-lg border p-4">
                  <div className="text-sm font-medium">Payout Status</div>
                  <p className="mt-1 text-sm text-muted-foreground">Pending = under review, Approved = accepted and queued, Paid = fully settled into your reward ledger.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Reward Activity</CardTitle>
                <CardDescription>Your newest earning events from the live ledger</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />)
                ) : recentEvents.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                    No earning events yet.
                  </div>
                ) : (
                  recentEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{event.title}</p>
                          <Badge variant={statusVariant(event.status)}>{event.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{event.description || event.event_type}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDistanceToNow(new Date(event.occurred_at), { addSuffix: true })}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">₹{Number(event.reward_rupees || 0).toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">{event.reward_coins || 0} coins</div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-6">
            <ReferralSystem />
          </aside>
        </div>
      </main>
    </div>
  );
}
