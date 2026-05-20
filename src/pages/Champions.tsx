import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, Crown, ArrowLeft, Flame, Users, PhoneCall, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";
import { MissionsTab } from "@/components/champions/MissionsTab";
import { RewardsTab } from "@/components/champions/RewardsTab";

interface Champion {
  user_id: string;
  points: number;
  tier: string;
  rank: number | null;
  streak_days: number;
  referral_count: number;
  calls_made: number;
  previous_rank: number | null;
  profiles?: { username: string | null; avatar_url: string | null } | null;
}

interface TierReward {
  tier: string;
  min_points: number;
  perks: string[];
  badge_color: string;
  badge_icon: string;
}

const TIER_ICON: Record<string, any> = { Bronze: Medal, Silver: Award, Gold: Trophy, Platinum: Crown };

export default function Champions() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [top, setTop] = useState<Champion[]>([]);
  const [me, setMe] = useState<Champion | null>(null);
  const [tiers, setTiers] = useState<TierReward[]>([]);
  const [recomputing, setRecomputing] = useState(false);

  const load = async () => {
    setError(null);
    try {
      const [{ data: leaders, error: e1 }, { data: tierData, error: e2 }] = await Promise.all([
        supabase
          .from("champions")
          .select("user_id, points, tier, rank, streak_days, referral_count, calls_made, previous_rank, profiles!inner(username, avatar_url)")
          .order("rank", { ascending: true, nullsFirst: false })
          .limit(10),
        supabase.from("champion_tier_rewards").select("tier, min_points, perks, badge_color, badge_icon").order("min_points"),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      setTop((leaders ?? []) as any);
      setTiers((tierData ?? []) as any);

      if (user?.id) {
        const { data: myRow } = await supabase
          .from("champions")
          .select("user_id, points, tier, rank, streak_days, referral_count, calls_made, previous_rank, profiles!inner(username, avatar_url)")
          .eq("user_id", user.id)
          .maybeSingle();
        setMe((myRow as any) ?? null);
      }
    } catch (e: any) {
      console.error("[Champions]", e);
      setError(e.message ?? "Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    load();
    if (!user?.id) return;
    const ch = supabase
      .channel("champions-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "champions" }, () => load())
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "champion_notifications", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const triggerRecompute = async () => {
    setRecomputing(true);
    try {
      await supabase.functions.invoke("champions-recompute");
      await load();
    } catch (e) {
      console.error("[Champions] recompute", e);
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-9 w-9">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-base font-semibold">Champions</h1>
            <p className="text-xs text-muted-foreground">Top Chatr members this season</p>
          </div>
          <Button variant="ghost" size="icon" onClick={triggerRecompute} disabled={recomputing} className="h-9 w-9">
            <RefreshCw className={`w-4 h-4 ${recomputing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* My rank card */}
        {loading ? (
          <Skeleton className="h-28 w-full rounded-2xl" />
        ) : me ? (
          <MyRankCard me={me} />
        ) : (
          <Card className="p-5 rounded-2xl text-center">
            <Trophy className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">You're not ranked yet</p>
            <p className="text-xs text-muted-foreground mt-1">Refer friends, keep your streak, make calls to climb the leaderboard.</p>
            <Button size="sm" className="mt-3" onClick={triggerRecompute} disabled={recomputing}>
              {recomputing ? "Calculating…" : "Calculate my rank"}
            </Button>
          </Card>
        )}

        <Tabs defaultValue="leaderboard" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-9">
            <TabsTrigger value="leaderboard" className="text-xs">Leaders</TabsTrigger>
            <TabsTrigger value="missions" className="text-xs">Missions</TabsTrigger>
            <TabsTrigger value="rewards" className="text-xs">Rewards</TabsTrigger>
          </TabsList>

          <TabsContent value="leaderboard" className="space-y-4 mt-3">
            {/* Tier perks */}
            {!loading && tiers.length > 0 && (
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Tier rewards</h2>
                <div className="grid grid-cols-2 gap-2">
                  {tiers.map((t) => {
                    const Icon = TIER_ICON[t.tier] ?? Medal;
                    return (
                      <Card key={t.tier} className="p-3 rounded-2xl">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className="w-4 h-4" style={{ color: t.badge_color }} />
                          <span className="text-sm font-semibold">{t.tier}</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground">{t.min_points}+ pts</p>
                        <ul className="text-[11px] mt-1 space-y-0.5 text-foreground/80">
                          {(t.perks as string[]).slice(0, 2).map((p) => (
                            <li key={p}>• {p}</li>
                          ))}
                        </ul>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Leaderboard */}
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Top 10</h2>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full rounded-xl" />
                  ))}
                </div>
              ) : error ? (
                <Card className="p-4 rounded-2xl text-center">
                  <p className="text-sm text-destructive">{error}</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={load}>Retry</Button>
                </Card>
              ) : top.length === 0 ? (
                <Card className="p-6 rounded-2xl text-center">
                  <Trophy className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">No champions yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Be the first to climb the ladder.</p>
                  <Button size="sm" className="mt-3" onClick={triggerRecompute} disabled={recomputing}>
                    Run first calculation
                  </Button>
                </Card>
              ) : (
                <div className="space-y-2">
                  {top.map((c) => (
                    <LeaderRow key={c.user_id} c={c} highlight={c.user_id === user?.id} />
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="missions" className="mt-3">
            <MissionsTab userId={user?.id ?? null} />
          </TabsContent>

          <TabsContent value="rewards" className="mt-3">
            <RewardsTab userId={user?.id ?? null} userPoints={me?.points ?? 0} userTier={me?.tier ?? "Bronze"} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function MyRankCard({ me }: { me: Champion }) {
  const Icon = TIER_ICON[me.tier] ?? Medal;
  const climbed = me.previous_rank && me.rank && me.rank < me.previous_rank;
  return (
    <Card className="p-4 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">#{me.rank ?? "—"}</span>
            <Badge variant="secondary" className="text-[10px]">{me.tier}</Badge>
            {climbed && (
              <Badge className="text-[10px] bg-green-500/15 text-green-600 border-green-500/30">
                ▲ {me.previous_rank! - me.rank!}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{me.points} points</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-3">
        <Stat icon={Flame} label="Streak" value={`${me.streak_days}d`} />
        <Stat icon={Users} label="Referrals" value={`${me.referral_count}`} />
        <Stat icon={PhoneCall} label="Calls" value={`${me.calls_made}`} />
      </div>
    </Card>
  );
}

function Stat({ icon: I, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="text-center bg-background/60 rounded-xl py-2">
      <I className="w-3.5 h-3.5 mx-auto text-muted-foreground" />
      <p className="text-sm font-semibold mt-0.5">{value}</p>
      <p className="text-[9px] text-muted-foreground uppercase">{label}</p>
    </div>
  );
}

function LeaderRow({ c, highlight }: { c: Champion; highlight: boolean }) {
  const Icon = TIER_ICON[c.tier] ?? Medal;
  const name = c.profiles?.username ?? `User ${c.user_id.slice(0, 6)}`;
  return (
    <Card className={`p-3 rounded-xl flex items-center gap-3 ${highlight ? "ring-2 ring-primary/40 bg-primary/5" : ""}`}>
      <span className="w-7 text-center text-sm font-bold text-muted-foreground">{c.rank ?? "—"}</span>
      <div className="w-9 h-9 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xs font-semibold">
        {c.profiles?.avatar_url ? (
          <img src={c.profiles.avatar_url} alt={name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          name[0]?.toUpperCase()
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        <p className="text-[11px] text-muted-foreground">{c.points} pts · {c.referral_count} refs</p>
      </div>
      <Icon className="w-4 h-4" />
    </Card>
  );
}
