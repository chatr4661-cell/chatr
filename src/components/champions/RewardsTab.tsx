import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Gift, Sparkles, Crown, Coins, Wallet, Check, Clock } from "lucide-react";

interface Reward {
  id: string;
  code: string;
  title: string;
  description: string;
  tier_required: string;
  points_cost: number;
  icon: string;
  stock: number | null;
}

interface Redemption {
  id: string;
  reward_id: string;
  status: string;
  created_at: string;
}

const ICON_MAP: Record<string, any> = { sparkles: Sparkles, crown: Crown, coins: Coins, wallet: Wallet, gift: Gift };
const TIER_ORDER = ["Bronze", "Silver", "Gold", "Platinum"];

export function RewardsTab({ userId, userPoints, userTier }: { userId: string | null; userPoints: number; userTier: string }) {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const load = async () => {
    const { data: r } = await supabase
      .from("champion_rewards")
      .select("*")
      .eq("is_active", true)
      .order("points_cost");
    setRewards((r ?? []) as any);
    if (userId) {
      const { data: rd } = await supabase
        .from("champion_reward_redemptions")
        .select("id, reward_id, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setRedemptions((rd ?? []) as any);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  const userTierIdx = TIER_ORDER.indexOf(userTier);

  const redeem = async (rw: Reward) => {
    if (!userId) return;
    setRedeeming(rw.id);
    try {
      await supabase.from("champion_reward_redemptions").insert({
        user_id: userId,
        reward_id: rw.id,
        points_spent: rw.points_cost,
        status: "pending",
      });
      const { data: champ } = await supabase
        .from("champions")
        .select("points")
        .eq("user_id", userId)
        .maybeSingle();
      await supabase.from("champions").upsert({
        user_id: userId,
        points: Math.max(0, (champ?.points ?? 0) - rw.points_cost),
      }, { onConflict: "user_id" });
      await load();
    } finally {
      setRedeeming(null);
    }
  };

  if (loading) {
    return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-3 rounded-2xl bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Your balance</p>
            <p className="text-xl font-bold">{userPoints.toLocaleString()} <span className="text-xs font-normal text-muted-foreground">pts</span></p>
          </div>
          <Badge variant="secondary">{userTier}</Badge>
        </div>
      </Card>

      <div className="space-y-2">
        {rewards.map((rw) => {
          const Icon = ICON_MAP[rw.icon] ?? Gift;
          const tierIdx = TIER_ORDER.indexOf(rw.tier_required);
          const tierOk = userTierIdx >= tierIdx;
          const canAfford = userPoints >= rw.points_cost;
          const eligible = tierOk && canAfford;
          return (
            <Card key={rw.id} className="p-3 rounded-2xl">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-pink-400/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{rw.title}</p>
                  <p className="text-[11px] text-muted-foreground">{rw.description}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Badge variant="outline" className="text-[10px]">{rw.points_cost} pts</Badge>
                    <Badge variant="secondary" className="text-[10px]">{rw.tier_required}+</Badge>
                  </div>
                </div>
                <Button size="sm" className="h-7 text-[11px] shrink-0" disabled={!eligible || redeeming === rw.id} onClick={() => redeem(rw)}>
                  {redeeming === rw.id ? "..." : !tierOk ? "Locked" : !canAfford ? "Low pts" : "Redeem"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {redemptions.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">My redemptions</h3>
          <div className="space-y-1.5">
            {redemptions.map((r) => {
              const rw = rewards.find((x) => x.id === r.reward_id);
              return (
                <Card key={r.id} className="p-2.5 rounded-xl flex items-center gap-2">
                  {r.status === "fulfilled" ? <Check className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-amber-500" />}
                  <span className="text-xs flex-1 truncate">{rw?.title ?? "Reward"}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{r.status}</Badge>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
