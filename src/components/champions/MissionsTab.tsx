import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, CheckCircle2, Sparkles, Users, PhoneCall, Flame, MessageSquare, Globe } from "lucide-react";

interface Mission {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  target_value: number;
  points_reward: number;
  period: string;
}

interface Progress {
  mission_id: string;
  progress_value: number;
  completed_at: string | null;
  claimed_at: string | null;
}

const CAT_ICON: Record<string, any> = {
  referrals: Users,
  calls: PhoneCall,
  streak: Flame,
  messages: MessageSquare,
  community: Globe,
};

export function MissionsTab({ userId }: { userId: string | null }) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = async () => {
    const { data: m } = await supabase
      .from("champion_missions")
      .select("*")
      .eq("is_active", true)
      .order("period")
      .order("points_reward", { ascending: false });
    setMissions((m ?? []) as any);

    if (userId) {
      const { data: p } = await supabase
        .from("champion_mission_progress")
        .select("mission_id, progress_value, completed_at, claimed_at")
        .eq("user_id", userId);
      const map: Record<string, Progress> = {};
      (p ?? []).forEach((row: any) => { map[row.mission_id] = row; });
      setProgress(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  const claim = async (m: Mission) => {
    if (!userId) return;
    setClaiming(m.id);
    try {
      const now = new Date().toISOString();
      await supabase.from("champion_mission_progress").upsert({
        user_id: userId,
        mission_id: m.id,
        progress_value: m.target_value,
        completed_at: now,
        claimed_at: now,
      }, { onConflict: "user_id,mission_id" });
      // Increment champion points
      const { data: champ } = await supabase
        .from("champions")
        .select("points")
        .eq("user_id", userId)
        .maybeSingle();
      const newPoints = (champ?.points ?? 0) + m.points_reward;
      await supabase.from("champions").upsert({
        user_id: userId,
        points: newPoints,
      }, { onConflict: "user_id" });
      await load();
    } finally {
      setClaiming(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  const grouped: Record<string, Mission[]> = { daily: [], weekly: [], season: [] };
  missions.forEach((m) => { (grouped[m.period] ??= []).push(m); });

  return (
    <div className="space-y-4">
      {(["daily","weekly","season"] as const).map((period) => grouped[period]?.length ? (
        <div key={period}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{period}</h3>
          <div className="space-y-2">
            {grouped[period].map((m) => {
              const p = progress[m.id];
              const value = Math.min(p?.progress_value ?? 0, m.target_value);
              const pct = Math.round((value / m.target_value) * 100);
              const completed = !!p?.completed_at;
              const claimed = !!p?.claimed_at;
              const Icon = CAT_ICON[m.category] ?? Target;
              return (
                <Card key={m.id} className="p-3 rounded-2xl">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{m.title}</p>
                        <Badge variant="secondary" className="text-[10px] shrink-0">+{m.points_reward}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{m.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <span className="text-[10px] text-muted-foreground">{value}/{m.target_value}</span>
                      </div>
                    </div>
                    {claimed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    ) : completed ? (
                      <Button size="sm" className="h-7 text-[11px] shrink-0" onClick={() => claim(m)} disabled={claiming === m.id}>
                        <Sparkles className="w-3 h-3 mr-1" /> Claim
                      </Button>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null)}
    </div>
  );
}
