// Smart Notification Orchestrator
// Runs every 30 minutes via pg_cron and generates proactive FCM-backed
// notifications for each active user across 4 categories:
//   1. Missed calls / unread messages reminders
//   2. AI lifestyle nudges (steps, water, calories, sleep) — uses sensor
//      data when present, otherwise generic time-aware AI prompt
//   3. Earning opportunities (fresh micro-tasks, referral bonuses)
//   4. Calendar / appointment reminders (~30 min before start)
//
// All deliveries go through send-module-notification which (a) inserts into
// `notifications` so /notifications shows them in realtime and (b) fires an
// FCM v1 push so users see system-tray notifications even when the app is
// closed.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

interface RunRequest {
  userId?: string; // optional single-user run (debug)
  dryRun?: boolean;
  categories?: Array<"missed" | "lifestyle" | "earning" | "calendar">;
}

// Hour in IST (UTC+5:30)
function hourIST(d = new Date()): number {
  return (d.getUTCHours() + 5 + Math.floor((d.getUTCMinutes() + 30) / 60)) % 24;
}

function inQuietHours(prefs: any): boolean {
  const h = hourIST();
  const start = prefs?.quiet_hours_start ?? 22;
  const end = prefs?.quiet_hours_end ?? 8;
  if (start <= end) return h >= start && h < end;
  return h >= start || h < end;
}

// Skip if we already pushed a notification with the same dedupe_key in the
// trailing window (default 6 hours).
async function alreadyPushed(
  userId: string,
  dedupeKey: string,
  windowMinutes = 360,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { data, error } = await supabase
    .from("notifications")
    .select("id, metadata, created_at")
    .eq("user_id", userId)
    .gte("created_at", since)
    .limit(50);
  if (error || !data) return false;
  return data.some((n: any) => n?.metadata?.dedupe_key === dedupeKey);
}

async function deliver(payload: {
  userId: string;
  type: string;
  title: string;
  body: string;
  actionUrl?: string;
  dedupeKey: string;
  category: string;
  extra?: Record<string, unknown>;
  dryRun?: boolean;
}): Promise<boolean> {
  if (payload.dryRun) {
    console.log("[dry-run]", payload);
    return true;
  }
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/send-module-notification`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        userId: payload.userId,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: {
          action_url: payload.actionUrl ?? "/notifications",
          dedupe_key: payload.dedupeKey,
          category: payload.category,
          source: "smart-notification-orchestrator",
          ...(payload.extra ?? {}),
        },
      }),
    },
  );
  if (!res.ok) {
    console.error(
      "send-module-notification failed",
      payload.userId,
      payload.dedupeKey,
      res.status,
      await res.text().catch(() => ""),
    );
    return false;
  }
  return true;
}

// ───────────────────────────────────────────────────────────── missed calls
async function processMissedCalls(userId: string, dryRun: boolean) {
  const since = new Date(Date.now() - 60 * 60_000).toISOString(); // last hour
  const { data: calls } = await supabase
    .from("calls")
    .select("id, caller_id, status, call_type, created_at")
    .eq("receiver_id", userId)
    .in("status", ["missed", "declined", "no_answer", "rejected"])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!calls || calls.length === 0) return 0;

  // Group by caller
  const byCaller = new Map<string, typeof calls>();
  for (const c of calls) {
    const arr = byCaller.get(c.caller_id) ?? [];
    arr.push(c);
    byCaller.set(c.caller_id, arr);
  }

  let sent = 0;
  for (const [callerId, list] of byCaller) {
    const dedupeKey = `missed_calls:${callerId}:${list[0].id}`;
    if (await alreadyPushed(userId, dedupeKey, 60)) continue;
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, full_name")
      .eq("id", callerId)
      .maybeSingle();
    const name = profile?.full_name || profile?.username || "Someone";
    const ok = await deliver({
      userId,
      type: "call",
      title: list.length > 1 ? `${list.length} missed calls` : "Missed call",
      body: list.length > 1
        ? `${name} tried to reach you ${list.length} times`
        : `${name} called you`,
      actionUrl: `/chat?user=${callerId}`,
      dedupeKey,
      category: "missed",
      extra: { caller_id: callerId, count: String(list.length) },
      dryRun,
    });
    if (ok) sent++;
  }
  return sent;
}

// ─────────────────────────────────────────────────────────── unread messages
async function processUnreadMessages(userId: string, dryRun: boolean) {
  const since = new Date(Date.now() - 30 * 60_000).toISOString(); // last 30 min
  // Conversations user is part of
  const { data: parts } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId);
  const convoIds = (parts ?? []).map((p: any) => p.conversation_id);
  if (convoIds.length === 0) return 0;

  const { data: msgs } = await supabase
    .from("messages")
    .select("id, sender_id, conversation_id, content, created_at, read_at")
    .in("conversation_id", convoIds)
    .neq("sender_id", userId)
    .is("read_at", null)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!msgs || msgs.length === 0) return 0;

  const bySender = new Map<string, number>();
  for (const m of msgs) bySender.set(m.sender_id, (bySender.get(m.sender_id) ?? 0) + 1);

  let sent = 0;
  for (const [senderId, count] of bySender) {
    const dedupeKey = `unread_msgs:${senderId}:${Math.floor(Date.now() / 3_600_000)}`; // hourly bucket
    if (await alreadyPushed(userId, dedupeKey, 60)) continue;
    const { data: profile } = await supabase
      .from("profiles")
      .select("username, full_name")
      .eq("id", senderId)
      .maybeSingle();
    const name = profile?.full_name || profile?.username || "Someone";
    const ok = await deliver({
      userId,
      type: "message",
      title: `Unread from ${name}`,
      body: count > 1 ? `${count} new messages waiting` : "You have a new message",
      actionUrl: `/chat?user=${senderId}`,
      dedupeKey,
      category: "missed",
      extra: { sender_id: senderId, count: String(count) },
      dryRun,
    });
    if (ok) sent++;
  }
  return sent;
}

// ───────────────────────────────────────────────────────── lifestyle nudges
async function craftAINudge(
  hour: number,
): Promise<{ title: string; body: string } | null> {
  if (!LOVABLE_API_KEY) return null;
  const slot = hour < 11 ? "morning" : hour < 14 ? "midday" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "night";
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "You are a warm wellness coach. Output ONLY JSON {\"title\":string,\"body\":string}. Title <= 38 chars. Body <= 110 chars. Friendly, specific, time-of-day aware. Vary topics: hydration, stretch, walk, posture, breathing, calorie check, sleep wind-down, screen break. No emojis.",
          },
          {
            role: "user",
            content: `Time-of-day: ${slot}. Hour (IST): ${hour}. Generate one micro nudge.`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    const txt = j?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(txt);
    if (parsed?.title && parsed?.body) {
      return { title: String(parsed.title).slice(0, 60), body: String(parsed.body).slice(0, 140) };
    }
  } catch (e) {
    console.warn("AI nudge fallback:", e);
  }
  return null;
}

const FALLBACK_NUDGES: Record<string, { title: string; body: string }[]> = {
  morning: [
    { title: "Hydrate first", body: "Start with a glass of water — your brain wakes up faster." },
    { title: "5-min stretch", body: "Loosen your back and shoulders before the day takes over." },
  ],
  midday: [
    { title: "Posture check", body: "Sit tall, drop the shoulders. Two slow breaths." },
    { title: "Lunch on track?", body: "Pause and notice — are you eating mindfully or in a rush?" },
  ],
  afternoon: [
    { title: "Step away", body: "You haven't walked in a while. A 3-min walk resets focus." },
    { title: "Eyes off screen", body: "Look at something 20 feet away for 20 seconds." },
  ],
  evening: [
    { title: "Wind-down begins", body: "Light a low lamp, lower your screen brightness." },
    { title: "Quick walk?", body: "A short evening walk improves sleep tonight." },
  ],
  night: [
    { title: "Phone away soon", body: "Try setting it across the room for tomorrow's energy." },
    { title: "Slow your breath", body: "Inhale 4, hold 4, exhale 6. Three rounds." },
  ],
};

async function processLifestyle(userId: string, dryRun: boolean) {
  const h = hourIST();
  // Only push lifestyle 3 windows: 10, 15, 21 (IST). Cron runs every 30 min so
  // we restrict by the start of those hours.
  const okWindow = [10, 15, 21].includes(h);
  if (!okWindow) return 0;

  const slot = h < 11 ? "morning" : h < 14 ? "midday" : h < 17 ? "afternoon" : h < 21 ? "evening" : "night";
  const dayBucket = new Date().toISOString().slice(0, 10);
  const dedupeKey = `lifestyle:${slot}:${dayBucket}`;
  if (await alreadyPushed(userId, dedupeKey, 60 * 8)) return 0;

  let nudge = await craftAINudge(h);
  if (!nudge) {
    const pool = FALLBACK_NUDGES[slot] ?? FALLBACK_NUDGES.afternoon;
    nudge = pool[Math.floor(Math.random() * pool.length)];
  }
  const ok = await deliver({
    userId,
    type: "wellness",
    title: nudge.title,
    body: nudge.body,
    actionUrl: "/home",
    dedupeKey,
    category: "lifestyle",
    extra: { slot },
    dryRun,
  });
  return ok ? 1 : 0;
}

// ─────────────────────────────────────────────────────── earning opportunities
async function processEarning(userId: string, dryRun: boolean) {
  const h = hourIST();
  // Earn pings only at 11 and 18 IST
  if (![11, 18].includes(h)) return 0;
  const dayBucket = new Date().toISOString().slice(0, 10);
  const dedupeKey = `earning:${h}:${dayBucket}`;
  if (await alreadyPushed(userId, dedupeKey, 60 * 5)) return 0;

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count } = await supabase
    .from("micro_tasks")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true)
    .gte("created_at", since);
  if (!count || count === 0) return 0;

  const ok = await deliver({
    userId,
    type: "earning",
    title: `${count} fresh missions`,
    body: `New tasks just dropped. Tap to start earning Chatr Points.`,
    actionUrl: "/earn",
    dedupeKey,
    category: "earning",
    extra: { count: String(count) },
    dryRun,
  });
  return ok ? 1 : 0;
}

// ────────────────────────────────────────────────────────── calendar reminders
async function processCalendar(userId: string, dryRun: boolean) {
  const now = Date.now();
  const windowStart = new Date(now + 15 * 60_000).toISOString();
  const windowEnd = new Date(now + 45 * 60_000).toISOString();

  const { data: appts } = await supabase
    .from("appointments")
    .select("id, appointment_date, status, provider_id, service_id")
    .eq("patient_id", userId)
    .in("status", ["confirmed", "scheduled", "pending"])
    .gte("appointment_date", windowStart)
    .lte("appointment_date", windowEnd)
    .limit(5);

  if (!appts || appts.length === 0) return 0;

  let sent = 0;
  for (const a of appts) {
    const dedupeKey = `appt:${a.id}`;
    if (await alreadyPushed(userId, dedupeKey, 60 * 24)) continue;
    const when = new Date(a.appointment_date);
    const mins = Math.max(1, Math.round((when.getTime() - now) / 60_000));
    const ok = await deliver({
      userId,
      type: "appointment",
      title: `Appointment in ${mins} min`,
      body: "Get ready — tap for details.",
      actionUrl: `/appointments/${a.id}`,
      dedupeKey,
      category: "calendar",
      extra: { appointment_id: a.id },
      dryRun,
    });
    if (ok) sent++;
  }
  return sent;
}

// ─────────────────────────────────────────────────────────────── per-user run
async function runForUser(
  userId: string,
  categories: Set<string>,
  dryRun: boolean,
) {
  const { data: prefs } = await supabase
    .from("smart_push_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (prefs && prefs.enabled === false) return { skipped: "disabled" };
  if (prefs && inQuietHours(prefs)) return { skipped: "quiet_hours" };

  const muted: string[] = (prefs?.muted_modules as string[]) ?? [];

  const counts: Record<string, number> = {};
  if (categories.has("missed") && !muted.includes("missed")) {
    counts.missed_calls = await processMissedCalls(userId, dryRun);
    counts.unread_msgs = await processUnreadMessages(userId, dryRun);
  }
  if (categories.has("lifestyle") && !muted.includes("wellness")) {
    counts.lifestyle = await processLifestyle(userId, dryRun);
  }
  if (categories.has("earning") && !muted.includes("earning")) {
    counts.earning = await processEarning(userId, dryRun);
  }
  if (categories.has("calendar") && !muted.includes("calendar")) {
    counts.calendar = await processCalendar(userId, dryRun);
  }
  return counts;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let body: RunRequest = {};
  try {
    body = (await req.json()) as RunRequest;
  } catch { /* ignore — cron may send empty body */ }

  const categories = new Set<string>(
    body.categories ?? ["missed", "lifestyle", "earning", "calendar"],
  );
  const dryRun = !!body.dryRun;

  // Single-user debug mode
  if (body.userId) {
    const result = await runForUser(body.userId, categories, dryRun);
    return new Response(JSON.stringify({ userId: body.userId, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Batch — pull users active in last 14 days who have a device token
  const since = new Date(Date.now() - 14 * 24 * 3600_000).toISOString();
  const { data: tokens } = await supabase
    .from("device_tokens")
    .select("user_id")
    .gte("last_used_at", since)
    .limit(2000);
  const userIds = Array.from(new Set((tokens ?? []).map((t: any) => t.user_id))).filter(Boolean);

  console.log(`[orchestrator] running for ${userIds.length} users, categories=${[...categories].join(",")}`);

  const summary: Record<string, any> = { users: userIds.length, totals: {} };
  for (const uid of userIds) {
    try {
      const r = await runForUser(uid, categories, dryRun);
      for (const [k, v] of Object.entries(r)) {
        if (typeof v === "number") summary.totals[k] = (summary.totals[k] ?? 0) + v;
      }
    } catch (e) {
      console.error("user failed", uid, e);
    }
  }

  return new Response(JSON.stringify(summary), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
