// Smart AI Push Engine
// Sends 4-6 personalized push notifications/day per user, surfacing
// features they haven't tried yet based on engagement history.
//
// Invoked by pg_cron at fixed daily slots. For each active user it:
//   1. Loads engagement history + preferences
//   2. Filters out muted modules, quiet hours, daily-cap, recent dupes
//   3. Asks Lovable AI (Gemini Flash) to pick the BEST feature + craft copy
//   4. Falls back to deterministic ranker if AI is unavailable
//   5. Delivers via existing send-module-notification (FCM v1)
//   6. Logs everything to smart_push_log

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SLOTS = ["morning", "midday", "afternoon", "evening", "night", "late"] as const;
type Slot = typeof SLOTS[number];

interface RunRequest {
  slot?: Slot;
  userId?: string; // optional single-user dry run
  dryRun?: boolean;
  batchSize?: number;
}

function currentSlot(now = new Date()): Slot {
  // IST hours (UTC+5:30)
  const hourIST = (now.getUTCHours() + 5 + Math.floor((now.getUTCMinutes() + 30) / 60)) % 24;
  if (hourIST < 11) return "morning";
  if (hourIST < 14) return "midday";
  if (hourIST < 17) return "afternoon";
  if (hourIST < 20) return "evening";
  if (hourIST < 22) return "night";
  return "late";
}

function inQuietHours(prefs: any, now = new Date()): boolean {
  const hourIST = (now.getUTCHours() + 5 + Math.floor((now.getUTCMinutes() + 30) / 60)) % 24;
  const start = prefs.quiet_hours_start ?? 22;
  const end = prefs.quiet_hours_end ?? 8;
  if (start <= end) return hourIST >= start && hourIST < end;
  return hourIST >= start || hourIST < end;
}

async function pickFeatureWithAI(opts: {
  user: any;
  catalog: any[];
  engagement: Record<string, any>;
  recentSent: any[];
  slot: Slot;
}): Promise<{ feature_key: string; title: string; body: string; reasoning: string } | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;

  const candidates = opts.catalog.map((f) => ({
    key: f.feature_key,
    module: f.module,
    title: f.title,
    desc: f.description,
    priority: f.priority,
    visited: !!opts.engagement[f.feature_key],
    visit_count: opts.engagement[f.feature_key]?.visit_count ?? 0,
    templates: f.notification_templates,
  }));

  const recent = opts.recentSent.map((r) => r.feature_key);

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You pick the single best Chatr feature to push to a user right now. Prefer features the user has NEVER visited. Avoid features pushed in the last 3 days. Match tone to the time slot. Always pick from candidates list. Return JSON only.",
          },
          {
            role: "user",
            content: JSON.stringify({
              slot: opts.slot,
              recently_pushed: recent,
              candidates,
            }),
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "pick_push",
              description: "Pick the best feature and craft notification copy.",
              parameters: {
                type: "object",
                properties: {
                  feature_key: { type: "string" },
                  title: { type: "string", description: "Push title, max 50 chars, with emoji" },
                  body: { type: "string", description: "Push body, max 110 chars, action-oriented" },
                  reasoning: { type: "string", description: "Why this feature, one sentence" },
                },
                required: ["feature_key", "title", "body", "reasoning"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "pick_push" } },
      }),
    });

    if (!res.ok) {
      console.warn("[smart-push] AI gateway error", res.status);
      return null;
    }
    const json = await res.json();
    const call = json?.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return null;
    const args = JSON.parse(call.function.arguments);
    if (!args.feature_key) return null;
    return args;
  } catch (e) {
    console.warn("[smart-push] AI failed, fallback", e);
    return null;
  }
}

function pickFeatureFallback(opts: {
  catalog: any[];
  engagement: Record<string, any>;
  recentSent: any[];
}) {
  const recentKeys = new Set(opts.recentSent.map((r) => r.feature_key));
  const ranked = [...opts.catalog]
    .filter((f) => !recentKeys.has(f.feature_key))
    .sort((a, b) => {
      const aVisited = opts.engagement[a.feature_key]?.visit_count ?? 0;
      const bVisited = opts.engagement[b.feature_key]?.visit_count ?? 0;
      if (aVisited !== bVisited) return aVisited - bVisited; // unvisited first
      return b.priority - a.priority;
    });
  const pick = ranked[0] ?? opts.catalog[0];
  if (!pick) return null;
  const tpls = (pick.notification_templates ?? []) as any[];
  const tpl = tpls[Math.floor(Math.random() * Math.max(1, tpls.length))] ?? {
    title: pick.title,
    body: pick.description,
  };
  return {
    feature_key: pick.feature_key,
    title: tpl.title,
    body: tpl.body,
    reasoning: "fallback ranker",
  };
}

async function processUser(supabase: any, user: any, slot: Slot, catalog: any[], dryRun: boolean) {
  // Preferences (default if missing)
  const { data: prefRow } = await supabase
    .from("smart_push_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  const prefs = prefRow ?? {
    enabled: true,
    max_per_day: 6,
    quiet_hours_start: 22,
    quiet_hours_end: 8,
    muted_modules: [],
  };
  if (!prefs.enabled) return { skipped: "disabled" };
  if (inQuietHours(prefs)) return { skipped: "quiet_hours" };

  // Daily cap
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  const { count: sentToday } = await supabase
    .from("smart_push_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("sent_at", since.toISOString());
  if ((sentToday ?? 0) >= prefs.max_per_day) return { skipped: "daily_cap" };

  // Skip token-invalid users
  const { data: health } = await supabase
    .from("user_push_health")
    .select("has_valid_token")
    .eq("user_id", user.id)
    .maybeSingle();
  if (health && health.has_valid_token === false) return { skipped: "invalid_token" };

  // Engagement
  const { data: engRows } = await supabase
    .from("user_feature_engagement")
    .select("feature_key, visit_count, last_visited_at")
    .eq("user_id", user.id);
  const engagement: Record<string, any> = {};
  for (const r of engRows ?? []) engagement[r.feature_key] = r;

  // Recent pushes (last 3 days)
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
  const { data: recentSent } = await supabase
    .from("smart_push_log")
    .select("feature_key")
    .eq("user_id", user.id)
    .gte("sent_at", threeDaysAgo);

  // Filter catalog by muted modules
  const filtered = catalog.filter((f) => !(prefs.muted_modules ?? []).includes(f.module));
  if (filtered.length === 0) return { skipped: "all_muted" };

  // Pick feature (AI then fallback)
  let pick = await pickFeatureWithAI({
    user,
    catalog: filtered,
    engagement,
    recentSent: recentSent ?? [],
    slot,
  });
  if (!pick) pick = pickFeatureFallback({ catalog: filtered, engagement, recentSent: recentSent ?? [] });
  if (!pick) return { skipped: "no_feature" };

  // Resolve catalog meta
  const meta = catalog.find((c) => c.feature_key === pick!.feature_key);
  if (!meta) return { skipped: "feature_not_in_catalog" };

  if (dryRun) {
    return { dryRun: true, pick };
  }

  // Deliver via send-module-notification
  const { error: deliveryError } = await supabase.functions.invoke("send-module-notification", {
    body: {
      userId: user.id,
      type: `smart_push_${meta.module}`,
      title: pick.title,
      body: pick.body,
      data: {
        feature_key: pick.feature_key,
        click_action: meta.cta_route,
        source: "smart_push_engine",
      },
    },
  });

  // Log
  await supabase.from("smart_push_log").insert({
    user_id: user.id,
    feature_key: pick.feature_key,
    module: meta.module,
    slot,
    title: pick.title,
    body: pick.body,
    cta_route: meta.cta_route,
    delivery_status: deliveryError ? "failed" : "delivered",
    error: deliveryError?.message ?? null,
    ai_reasoning: pick.reasoning,
  });

  return { delivered: !deliveryError, feature: pick.feature_key };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = (await req.json().catch(() => ({}))) as RunRequest;
    const slot: Slot = body.slot ?? currentSlot();
    const dryRun = !!body.dryRun;
    const batchSize = body.batchSize ?? 500;

    // Load active feature catalog once
    const { data: catalog, error: catErr } = await supabase
      .from("feature_catalog")
      .select("*")
      .eq("active", true);
    if (catErr) throw catErr;

    // Single-user mode
    if (body.userId) {
      const { data: user } = await supabase
        .from("profiles")
        .select("id, username, language")
        .eq("id", body.userId)
        .maybeSingle();
      if (!user) {
        return new Response(JSON.stringify({ error: "user not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await processUser(supabase, user, slot, catalog ?? [], dryRun);
      return new Response(JSON.stringify({ slot, result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Bulk: only users with a registered device token
    const { data: tokenRows } = await supabase
      .from("device_tokens")
      .select("user_id")
      .limit(batchSize);
    const userIds = Array.from(new Set((tokenRows ?? []).map((r: any) => r.user_id)));

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ slot, processed: 0, message: "no users with tokens" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: users } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);

    let delivered = 0;
    let skipped = 0;
    let failed = 0;
    const reasons: Record<string, number> = {};

    for (const u of users ?? []) {
      try {
        const r: any = await processUser(supabase, u, slot, catalog ?? [], dryRun);
        if (r?.delivered) delivered++;
        else if (r?.skipped) {
          skipped++;
          reasons[r.skipped] = (reasons[r.skipped] ?? 0) + 1;
        } else if (r?.delivered === false) failed++;
      } catch (e) {
        failed++;
        console.error("[smart-push] user error", u.id, e);
      }
    }

    return new Response(
      JSON.stringify({
        slot,
        total_users: users?.length ?? 0,
        delivered,
        skipped,
        failed,
        skip_reasons: reasons,
        dryRun,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[smart-push] fatal", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
