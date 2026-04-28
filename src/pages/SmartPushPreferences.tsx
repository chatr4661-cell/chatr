import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Bell, Sparkles, Clock, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FeatureRow {
  feature_key: string;
  module: string;
  title: string;
  emoji: string | null;
}

interface Prefs {
  enabled: boolean;
  max_per_day: number;
  quiet_hours_start: number;
  quiet_hours_end: number;
  muted_modules: string[];
}

const DEFAULTS: Prefs = {
  enabled: true,
  max_per_day: 6,
  quiet_hours_start: 22,
  quiet_hours_end: 8,
  muted_modules: [],
};

export default function SmartPushPreferences() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [modules, setModules] = useState<{ module: string; title: string; emoji: string | null }[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (!uid) {
        setLoading(false);
        return;
      }

      const [{ data: prefRow }, { data: catalog }] = await Promise.all([
        supabase.from("smart_push_preferences").select("*").eq("user_id", uid).maybeSingle(),
        supabase.from("feature_catalog").select("module, title, emoji").eq("active", true),
      ]);

      if (prefRow) setPrefs({ ...DEFAULTS, ...prefRow });

      // unique modules
      const seen = new Set<string>();
      const list: { module: string; title: string; emoji: string | null }[] = [];
      for (const f of (catalog ?? []) as FeatureRow[]) {
        if (!seen.has(f.module)) {
          seen.add(f.module);
          list.push({ module: f.module, title: f.title, emoji: f.emoji });
        }
      }
      setModules(list);
      setLoading(false);
    })();
  }, []);

  const toggleModule = (m: string) => {
    setPrefs((p) => ({
      ...p,
      muted_modules: p.muted_modules.includes(m)
        ? p.muted_modules.filter((x) => x !== m)
        : [...p.muted_modules, m],
    }));
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    await supabase.from("smart_push_preferences").upsert({ user_id: userId, ...prefs });
    setSaving(false);
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!userId) {
    return <div className="p-6 text-sm">Sign in to manage notifications.</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border/40 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-base font-semibold">Smart Notifications</h1>
          <p className="text-xs text-muted-foreground">Personalized features delivered to you</p>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4 max-w-xl mx-auto">
        <Card className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Smart push enabled</p>
                <p className="text-xs text-muted-foreground">AI-picked tips, deals & earnings</p>
              </div>
            </div>
            <Switch
              checked={prefs.enabled}
              onCheckedChange={(v) => setPrefs((p) => ({ ...p, enabled: v }))}
            />
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-medium">Max per day: {prefs.max_per_day}</p>
          </div>
          <Slider
            value={[prefs.max_per_day]}
            min={1}
            max={6}
            step={1}
            onValueChange={(v) => setPrefs((p) => ({ ...p, max_per_day: v[0] }))}
          />
          <p className="text-xs text-muted-foreground">
            Spread across morning, midday, afternoon, evening, night & late slots.
          </p>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-medium">
              Quiet hours: {prefs.quiet_hours_start}:00 – {prefs.quiet_hours_end}:00
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Start</p>
              <Slider
                value={[prefs.quiet_hours_start]}
                min={18}
                max={23}
                step={1}
                onValueChange={(v) => setPrefs((p) => ({ ...p, quiet_hours_start: v[0] }))}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">End</p>
              <Slider
                value={[prefs.quiet_hours_end]}
                min={5}
                max={11}
                step={1}
                onValueChange={(v) => setPrefs((p) => ({ ...p, quiet_hours_end: v[0] }))}
              />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-sm font-medium mb-3">Mute by category</p>
          <div className="space-y-2">
            {modules.map((m) => {
              const muted = prefs.muted_modules.includes(m.module);
              return (
                <div
                  key={m.module}
                  className="flex items-center justify-between gap-3 py-1.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{m.emoji ?? "🔔"}</span>
                    <span className="text-sm capitalize">{m.module.replace("_", " ")}</span>
                  </div>
                  <Switch checked={!muted} onCheckedChange={() => toggleModule(m.module)} />
                </div>
              );
            })}
          </div>
        </Card>

        <Button className="w-full" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </div>
  );
}
