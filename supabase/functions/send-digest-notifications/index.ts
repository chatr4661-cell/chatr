// 3-hourly digest notifications across all Chatr modules.
// Honors per-user notification_preferences.digest_enabled and digest_categories.
// Writes a row to public.notifications with delivery_status = delivered | failed.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WINDOW_HOURS = 3;
const BATCH_SIZE = 50;
const MAX_USERS_PER_RUN = 5000;
const MAX_RETRIES = 5;
const RETRY_BASE_MINUTES = 2; // exponential: 2, 4, 8, 16, 32 min
const MAX_RETRY_BATCH = 500;

function nextRetryAt(attempt: number): string {
  // attempt is the upcoming attempt number (1..MAX_RETRIES)
  const minutes = RETRY_BASE_MINUTES * Math.pow(2, Math.max(0, attempt - 1));
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

async function attemptPush(
  supabase: ReturnType<typeof createClient>,
  notif: { id: string; user_id: string; title: string; description: string; metadata: any; retry_count: number; max_retries: number },
): Promise<void> {
  const nextAttempt = (notif.retry_count ?? 0) + 1;
  const maxR = notif.max_retries ?? MAX_RETRIES;
  const meta = notif.metadata ?? {};
  const { error: invokeErr } = await supabase.functions.invoke("send-module-notification", {
    body: {
      userId: notif.user_id,
      type: "digest_update",
      title: notif.title,
      body: notif.description,
      data: {
        route: meta.route ?? "/home",
        action: meta.action ?? "open_digest",
        notification_id: notif.id,
        window_hours: String(meta.window_hours ?? WINDOW_HOURS),
      },
      skipInAppInsert: true,
    },
  });

  const nowIso = new Date().toISOString();
  if (!invokeErr) {
    await supabase.from("notifications").update({
      delivery_status: "delivered",
      delivery_error: null,
      retry_count: nextAttempt,
      last_attempt_at: nowIso,
      next_retry_at: null,
    }).eq("id", notif.id);
    return;
  }

  const exhausted = nextAttempt >= maxR;
  await supabase.from("notifications").update({
    delivery_status: exhausted ? "failed_permanent" : "failed",
    delivery_error: invokeErr.message ?? "push failed",
    retry_count: nextAttempt,
    last_attempt_at: nowIso,
    next_retry_at: exhausted ? null : nextRetryAt(nextAttempt),
  }).eq("id", notif.id);
}

async function processRetryQueue(supabase: ReturnType<typeof createClient>): Promise<{ retried: number; recovered: number; stillFailing: number }> {
  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabase
    .from("notifications")
    .select("id, user_id, title, description, metadata, retry_count, max_retries")
    .eq("type", "digest_update")
    .eq("delivery_status", "failed")
    .lte("next_retry_at", nowIso)
    .order("next_retry_at", { ascending: true })
    .limit(MAX_RETRY_BATCH);

  if (error || !due?.length) return { retried: 0, recovered: 0, stillFailing: 0 };

  let recovered = 0, stillFailing = 0;
  for (let i = 0; i < due.length; i += BATCH_SIZE) {
    const slice = due.slice(i, i + BATCH_SIZE);
    await Promise.all(slice.map(async (n: any) => {
      const before = n.retry_count ?? 0;
      await attemptPush(supabase, n);
      const { data: after } = await supabase.from("notifications").select("delivery_status").eq("id", n.id).maybeSingle();
      if (after?.delivery_status === "delivered") recovered++;
      else stillFailing++;
      void before;
    }));
  }
  return { retried: due.length, recovered, stillFailing };
}

type CategoryKey =
  | "wallet" | "earnings" | "referrals" | "missions"
  | "chats" | "calls" | "bookings" | "food" | "jobs" | "wellness";

const DEFAULT_CATEGORIES: Record<CategoryKey, boolean> = {
  wallet: true, earnings: true, referrals: true, missions: true,
  chats: true, calls: true, bookings: true, food: true, jobs: true, wellness: true,
};

interface DigestSummary {
  walletBalance?: number;
  pendingEarningsCoins?: number;
  pendingReferralRewards?: number;
  activeMissions?: number;
  unreadChats?: number;
  missedCalls?: number;
  upcomingBookings?: number;
  pendingFoodOrders?: number;
  newJobs?: number;
  healthReminders?: number;
}

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function buildDigestText(s: DigestSummary, cats: Record<CategoryKey, boolean>): { title: string; body: string } | null {
  const parts: string[] = [];
  if (cats.wallet     && (s.walletBalance ?? 0) > 0)            parts.push(`Wallet ${fmtINR(s.walletBalance!)}`);
  if (cats.earnings   && (s.pendingEarningsCoins ?? 0) > 0)     parts.push(`${s.pendingEarningsCoins} coins pending`);
  if (cats.referrals  && (s.pendingReferralRewards ?? 0) > 0)   parts.push(`${s.pendingReferralRewards} referral reward${s.pendingReferralRewards! > 1 ? "s" : ""}`);
  if (cats.missions   && (s.activeMissions ?? 0) > 0)           parts.push(`${s.activeMissions} mission${s.activeMissions! > 1 ? "s" : ""} live`);
  if (cats.chats      && (s.unreadChats ?? 0) > 0)              parts.push(`${s.unreadChats} unread chat${s.unreadChats! > 1 ? "s" : ""}`);
  if (cats.calls      && (s.missedCalls ?? 0) > 0)              parts.push(`${s.missedCalls} missed call${s.missedCalls! > 1 ? "s" : ""}`);
  if (cats.bookings   && (s.upcomingBookings ?? 0) > 0)         parts.push(`${s.upcomingBookings} booking${s.upcomingBookings! > 1 ? "s" : ""} soon`);
  if (cats.food       && (s.pendingFoodOrders ?? 0) > 0)        parts.push(`${s.pendingFoodOrders} food order${s.pendingFoodOrders! > 1 ? "s" : ""}`);
  if (cats.jobs       && (s.newJobs ?? 0) > 0)                  parts.push(`${s.newJobs} new job${s.newJobs! > 1 ? "s" : ""}`);
  if (cats.wellness   && (s.healthReminders ?? 0) > 0)          parts.push(`${s.healthReminders} health reminder${s.healthReminders! > 1 ? "s" : ""}`);

  if (parts.length === 0) return null;
  const headline = parts.slice(0, 3).join(" · ");
  const extra = parts.length > 3 ? ` and ${parts.length - 3} more update${parts.length - 3 > 1 ? "s" : ""}` : "";
  return { title: "Your Chatr update", body: `${headline}${extra}. Tap to open.` };
}

async function safeCount(
  supabase: ReturnType<typeof createClient>,
  table: string,
  build: (q: any) => any,
): Promise<number> {
  try {
    const q = build(supabase.from(table).select("*", { count: "exact", head: true }));
    const { count, error } = await q;
    if (error) return 0;
    return count ?? 0;
  } catch { return 0; }
}

async function buildSummaryForUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  sinceIso: string,
): Promise<DigestSummary> {
  const summary: DigestSummary = {};
  try {
    const { data: w } = await supabase.from("chatr_wallet").select("balance").eq("user_id", userId).maybeSingle();
    if (w?.balance != null) summary.walletBalance = Number(w.balance);
  } catch { /* noop */ }

  try {
    const { data: events } = await supabase.from("earning_events").select("reward_coins").eq("user_id", userId).eq("status", "pending");
    if (events?.length) summary.pendingEarningsCoins = events.reduce((acc: number, e: any) => acc + (Number(e.reward_coins) || 0), 0);
  } catch { /* noop */ }

  summary.pendingReferralRewards = await safeCount(supabase, "referral_rewards", (q) => q.eq("referrer_id", userId).eq("status", "pending"));
  summary.activeMissions         = await safeCount(supabase, "micro_task_assignments", (q) => q.eq("user_id", userId).in("status", ["assigned", "in_progress"]));
  summary.unreadChats            = await safeCount(supabase, "messages", (q) => q.gte("created_at", sinceIso).is("read_at", null).neq("sender_id", userId));
  summary.missedCalls            = await safeCount(supabase, "calls", (q) => q.eq("receiver_id", userId).eq("missed", true).gte("created_at", sinceIso));

  try {
    const next24 = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    summary.upcomingBookings = await safeCount(supabase, "service_bookings", (q) =>
      q.eq("customer_id", userId).gte("scheduled_at", new Date().toISOString()).lte("scheduled_at", next24));
  } catch { /* noop */ }

  summary.pendingFoodOrders = await safeCount(supabase, "food_orders", (q) => q.eq("user_id", userId).in("status", ["placed", "preparing", "out_for_delivery"]));
  summary.newJobs           = await safeCount(supabase, "chatr_jobs", (q) => q.gte("created_at", sinceIso).eq("is_active", true));
  summary.healthReminders   = await safeCount(supabase, "medication_reminders", (q) => q.eq("user_id", userId).eq("is_active", true));
  return summary;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const startedAt = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const sinceIso = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000).toISOString();

    const { data: tokenRows, error: tokenErr } = await supabase.from("device_tokens").select("user_id").limit(MAX_USERS_PER_RUN);
    if (tokenErr) throw tokenErr;

    const allUserIds = Array.from(new Set((tokenRows ?? []).map((r: any) => r.user_id).filter(Boolean)));

    // Exclude users flagged with invalid push tokens (prevents pointless retries)
    const { data: invalidUsers } = await supabase
      .from("user_push_health")
      .select("user_id")
      .eq("has_valid_token", false);
    const invalidSet = new Set((invalidUsers ?? []).map((r: any) => r.user_id));
    const userIds = allUserIds.filter((id) => !invalidSet.has(id));
    const skippedInvalidToken = allUserIds.length - userIds.length;

    console.log(`[digest] eligible: ${userIds.length}, skipped invalid-token: ${skippedInvalidToken}`);

    let sent = 0, skippedNoContent = 0, skippedDisabled = 0, failed = 0;

    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(async (userId) => {
        try {
          // Load digest preferences
          const { data: pref } = await supabase
            .from("notification_preferences")
            .select("digest_enabled, digest_categories")
            .eq("user_id", userId)
            .maybeSingle();

          if (pref && pref.digest_enabled === false) {
            skippedDisabled++;
            return;
          }
          const cats = { ...DEFAULT_CATEGORIES, ...((pref?.digest_categories as Record<CategoryKey, boolean>) ?? {}) };

          const summary = await buildSummaryForUser(supabase, userId, sinceIso);
          const text = buildDigestText(summary, cats);
          if (!text) { skippedNoContent++; return; }

          // Insert in-app notification with pending status, then attempt push
          const { data: notifRow, error: notifErr } = await supabase
            .from("notifications")
            .insert({
              user_id: userId,
              type: "digest_update",
              title: text.title,
              description: text.body,
              delivery_status: "pending",
              retry_count: 0,
              max_retries: MAX_RETRIES,
              metadata: {
                route: "/home",
                action: "open_digest",
                window_hours: WINDOW_HOURS,
                categories: cats,
                summary,
              },
            })
            .select("id, user_id, title, description, metadata, retry_count, max_retries")
            .single();

          if (notifErr || !notifRow) {
            failed++;
            console.error(`[digest] notif insert failed for ${userId}:`, notifErr?.message);
            return;
          }

          await attemptPush(supabase, notifRow as any);

          const { data: after } = await supabase
            .from("notifications")
            .select("delivery_status")
            .eq("id", (notifRow as any).id)
            .maybeSingle();

          if (after?.delivery_status === "delivered") sent++;
          else failed++;
        } catch (e) {
          failed++;
          console.error(`[digest] user ${userId} failed:`, e);
        }
      }));
    }

    // Process retry queue for previously failed digests whose backoff window has elapsed
    const retryStats = await processRetryQueue(supabase);
    console.log(`[digest] retries — attempted: ${retryStats.retried}, recovered: ${retryStats.recovered}, still_failing: ${retryStats.stillFailing}`);

    const ms = Date.now() - startedAt;
    console.log(`[digest] done in ${ms}ms — sent: ${sent}, skipped_empty: ${skippedNoContent}, skipped_off: ${skippedDisabled}, failed: ${failed}`);

    return new Response(JSON.stringify({
      success: true, eligible: userIds.length,
      sent, skipped_no_content: skippedNoContent, skipped_disabled: skippedDisabled, failed,
      retries: retryStats,
      duration_ms: ms,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[digest] error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
