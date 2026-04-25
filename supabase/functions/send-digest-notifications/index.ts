// 3-hourly digest notifications across all Chatr modules.
// - Targets: all users with at least one device_token
// - Respects: notification_preferences.push_enabled (handled in send-module-notification)
// - Content: wallet balance, pending earnings, referral rewards, active missions,
//            unread chats, missed calls, upcoming bookings, food orders, marketplace,
//            jobs, healthcare reminders.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WINDOW_HOURS = 3;
const BATCH_SIZE = 50; // users per batch
const MAX_USERS_PER_RUN = 5000; // safety cap

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

function buildDigestText(s: DigestSummary): { title: string; body: string } | null {
  const parts: string[] = [];

  if ((s.walletBalance ?? 0) > 0) parts.push(`Wallet ${fmtINR(s.walletBalance!)}`);
  if ((s.pendingEarningsCoins ?? 0) > 0) parts.push(`${s.pendingEarningsCoins} coins pending`);
  if ((s.pendingReferralRewards ?? 0) > 0) parts.push(`${s.pendingReferralRewards} referral reward${s.pendingReferralRewards! > 1 ? "s" : ""}`);
  if ((s.activeMissions ?? 0) > 0) parts.push(`${s.activeMissions} mission${s.activeMissions! > 1 ? "s" : ""} live`);
  if ((s.unreadChats ?? 0) > 0) parts.push(`${s.unreadChats} unread chat${s.unreadChats! > 1 ? "s" : ""}`);
  if ((s.missedCalls ?? 0) > 0) parts.push(`${s.missedCalls} missed call${s.missedCalls! > 1 ? "s" : ""}`);
  if ((s.upcomingBookings ?? 0) > 0) parts.push(`${s.upcomingBookings} booking${s.upcomingBookings! > 1 ? "s" : ""} soon`);
  if ((s.pendingFoodOrders ?? 0) > 0) parts.push(`${s.pendingFoodOrders} food order${s.pendingFoodOrders! > 1 ? "s" : ""}`);
  if ((s.newJobs ?? 0) > 0) parts.push(`${s.newJobs} new job${s.newJobs! > 1 ? "s" : ""}`);
  if ((s.healthReminders ?? 0) > 0) parts.push(`${s.healthReminders} health reminder${s.healthReminders! > 1 ? "s" : ""}`);

  if (parts.length === 0) return null;

  // Keep it short for notification surfaces
  const headline = parts.slice(0, 3).join(" · ");
  const extra = parts.length > 3 ? ` and ${parts.length - 3} more update${parts.length - 3 > 1 ? "s" : ""}` : "";
  return {
    title: "Your Chatr update",
    body: `${headline}${extra}. Tap to open.`,
  };
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
  } catch (_e) {
    return 0;
  }
}

async function buildSummaryForUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  sinceIso: string,
): Promise<DigestSummary> {
  const summary: DigestSummary = {};

  // Wallet balance
  try {
    const { data: w } = await supabase
      .from("chatr_wallet")
      .select("balance")
      .eq("user_id", userId)
      .maybeSingle();
    if (w?.balance != null) summary.walletBalance = Number(w.balance);
  } catch (_e) { /* noop */ }

  // Pending earning events (coins) — sum of reward_coins where status='pending'
  try {
    const { data: events } = await supabase
      .from("earning_events")
      .select("reward_coins")
      .eq("user_id", userId)
      .eq("status", "pending");
    if (events?.length) {
      summary.pendingEarningsCoins = events.reduce(
        (acc: number, e: any) => acc + (Number(e.reward_coins) || 0),
        0,
      );
    }
  } catch (_e) { /* noop */ }

  // Pending referral rewards (count)
  summary.pendingReferralRewards = await safeCount(supabase, "referral_rewards", (q) =>
    q.eq("referrer_id", userId).eq("status", "pending"),
  );

  // Active missions assigned to user (in last window)
  summary.activeMissions = await safeCount(supabase, "micro_task_assignments", (q) =>
    q.eq("user_id", userId).in("status", ["assigned", "in_progress"]),
  );

  // Unread chats — messages not read and not authored by user, in window
  summary.unreadChats = await safeCount(supabase, "messages", (q) =>
    q.gte("created_at", sinceIso).is("read_at", null).neq("sender_id", userId),
  );

  // Missed calls in window
  summary.missedCalls = await safeCount(supabase, "calls", (q) =>
    q.eq("receiver_id", userId).eq("missed", true).gte("created_at", sinceIso),
  );

  // Upcoming service bookings (next 24h)
  try {
    const next24 = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    summary.upcomingBookings = await safeCount(supabase, "service_bookings", (q) =>
      q.eq("customer_id", userId).gte("scheduled_at", new Date().toISOString()).lte("scheduled_at", next24),
    );
  } catch (_e) { /* noop */ }

  // Pending food orders
  summary.pendingFoodOrders = await safeCount(supabase, "food_orders", (q) =>
    q.eq("user_id", userId).in("status", ["placed", "preparing", "out_for_delivery"]),
  );

  // New jobs in window (broad recommendation, not personalized)
  summary.newJobs = await safeCount(supabase, "chatr_jobs", (q) =>
    q.gte("created_at", sinceIso).eq("is_active", true),
  );

  // Health reminders due
  summary.healthReminders = await safeCount(supabase, "medication_reminders", (q) =>
    q.eq("user_id", userId).eq("is_active", true),
  );

  return summary;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startedAt = Date.now();

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const sinceIso = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000).toISOString();

    // Eligible users: distinct user_id from device_tokens
    const { data: tokenRows, error: tokenErr } = await supabase
      .from("device_tokens")
      .select("user_id")
      .limit(MAX_USERS_PER_RUN);

    if (tokenErr) throw tokenErr;

    const userIds = Array.from(new Set((tokenRows ?? []).map((r: any) => r.user_id).filter(Boolean)));
    console.log(`[digest] eligible users: ${userIds.length}`);

    let sent = 0;
    let skippedNoContent = 0;
    let failed = 0;

    for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
      const batch = userIds.slice(i, i + BATCH_SIZE);

      await Promise.all(
        batch.map(async (userId) => {
          try {
            const summary = await buildSummaryForUser(supabase, userId, sinceIso);
            const text = buildDigestText(summary);

            if (!text) {
              skippedNoContent++;
              return;
            }

            const { error: invokeErr } = await supabase.functions.invoke(
              "send-module-notification",
              {
                body: {
                  userId,
                  type: "digest_update",
                  title: text.title,
                  body: text.body,
                  data: {
                    route: "/home",
                    action: "open_digest",
                    window_hours: String(WINDOW_HOURS),
                  },
                },
              },
            );

            if (invokeErr) {
              failed++;
              console.error(`[digest] invoke failed for ${userId}:`, invokeErr.message);
            } else {
              sent++;
            }
          } catch (e) {
            failed++;
            console.error(`[digest] user ${userId} failed:`, e);
          }
        }),
      );
    }

    const ms = Date.now() - startedAt;
    console.log(`[digest] done in ${ms}ms — sent: ${sent}, skipped: ${skippedNoContent}, failed: ${failed}`);

    return new Response(
      JSON.stringify({
        success: true,
        eligible: userIds.length,
        sent,
        skipped_no_content: skippedNoContent,
        failed,
        duration_ms: ms,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("[digest] error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
