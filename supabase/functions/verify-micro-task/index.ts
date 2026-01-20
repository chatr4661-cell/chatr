import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fraud rules
const FRAUD_RULES = {
  MAX_TASKS_PER_HOUR: 3,
  MAX_GPS_DISTANCE_PHOTO: 2, // km
  MAX_GPS_DISTANCE_RATE: 5, // km
  MIN_AUDIO_PERCENT: 70,
  RISK_SCORE_THRESHOLD: 30,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { submissionId } = await req.json();

    if (!submissionId) {
      return new Response(
        JSON.stringify({ error: "submissionId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get submission with task details
    const { data: submission, error: subError } = await supabase
      .from("micro_task_submissions")
      .select(`
        *,
        task:micro_tasks (*)
      `)
      .eq("id", submissionId)
      .single();

    if (subError || !submission) {
      console.error("Submission not found:", subError);
      return new Response(
        JSON.stringify({ error: "Submission not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const task = submission.task;
    const userId = submission.user_id;
    let fraudFlags: string[] = [];
    let shouldReject = false;
    let rejectReason = "";

    // Check user's fraud score
    const { data: userScore } = await supabase
      .from("micro_task_user_scores")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (userScore?.is_soft_blocked) {
      await updateSubmissionStatus(supabase, submissionId, "manual_review", "User is soft-blocked");
      return new Response(
        JSON.stringify({ status: "manual_review", reason: "Account under review" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // FRAUD CHECK 1: Rate limiting (>3 tasks/hour from same device)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentSubmissions } = await supabase
      .from("micro_task_submissions")
      .select("id")
      .eq("device_hash", submission.device_hash)
      .gte("created_at", oneHourAgo);

    if (recentSubmissions && recentSubmissions.length > FRAUD_RULES.MAX_TASKS_PER_HOUR) {
      fraudFlags.push("rate_limit");
      await insertFraudFlag(supabase, userId, submissionId, "rate_limit", {
        device_hash: submission.device_hash,
        count: recentSubmissions.length,
      });
    }

    // FRAUD CHECK 2: GPS mismatch for geo tasks
    if (task.geo_required && submission.gps_distance_km !== null) {
      const maxDistance = task.task_type === "photo_verify" 
        ? FRAUD_RULES.MAX_GPS_DISTANCE_PHOTO 
        : FRAUD_RULES.MAX_GPS_DISTANCE_RATE;

      if (submission.gps_distance_km > maxDistance) {
        fraudFlags.push("gps_mismatch");
        shouldReject = true;
        rejectReason = `Location too far (${submission.gps_distance_km.toFixed(1)}km from task area)`;
        await insertFraudFlag(supabase, userId, submissionId, "gps_mismatch", {
          distance: submission.gps_distance_km,
          max_allowed: maxDistance,
        });
      }
    }

    // FRAUD CHECK 3: Photo hash duplicate
    if (task.task_type === "photo_verify" && submission.media_hash) {
      const { data: duplicates } = await supabase
        .from("micro_task_submissions")
        .select("id")
        .eq("media_hash", submission.media_hash)
        .neq("id", submissionId);

      if (duplicates && duplicates.length > 0) {
        fraudFlags.push("photo_duplicate");
        shouldReject = true;
        rejectReason = "Duplicate photo detected";
        await insertFraudFlag(supabase, userId, submissionId, "photo_duplicate", {
          duplicate_count: duplicates.length,
        });
      }
    }

    // FRAUD CHECK 4: Audio listened less than 70%
    if (task.task_type === "audio_listen") {
      if ((submission.audio_listened_percent || 0) < FRAUD_RULES.MIN_AUDIO_PERCENT) {
        fraudFlags.push("audio_incomplete");
        shouldReject = true;
        rejectReason = "Audio not fully listened";
        await insertFraudFlag(supabase, userId, submissionId, "audio_incomplete", {
          listened_percent: submission.audio_listened_percent,
        });
      }
    }

    // Determine final status
    let finalStatus: string;
    let coinsAwarded = 0;
    let rupeesAwarded = 0;

    if (shouldReject) {
      finalStatus = "auto_rejected";
    } else if (fraudFlags.length > 0) {
      // Has flags but not critical - send to manual review
      finalStatus = "manual_review";
    } else {
      // Verify answer for audio tasks
      if (task.task_type === "audio_listen") {
        const isCorrect = submission.selected_option_index === task.correct_option_index;
        if (!isCorrect) {
          finalStatus = "auto_rejected";
          rejectReason = "Incorrect answer";
        } else {
          finalStatus = "auto_approved";
          coinsAwarded = task.reward_coins;
          rupeesAwarded = task.reward_rupees;
        }
      } else if (task.task_type === "rate_service" && submission.rating) {
        // Rate tasks auto-approve if valid rating
        finalStatus = "auto_approved";
        coinsAwarded = task.reward_coins;
        rupeesAwarded = task.reward_rupees;
      } else if (task.task_type === "photo_verify") {
        // Photo tasks go to manual review
        finalStatus = "manual_review";
      } else {
        finalStatus = "manual_review";
      }
    }

    // Update submission status
    await updateSubmissionStatus(supabase, submissionId, finalStatus, rejectReason);

    // If approved, update assignment and award coins
    if (finalStatus === "auto_approved") {
      // Update assignment to completed
      await supabase
        .from("micro_task_assignments")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", submission.assignment_id);

      // Create verification record
      await supabase.from("micro_task_verifications").insert({
        submission_id: submissionId,
        verification_type: "auto",
        result: "approved",
        coins_awarded: coinsAwarded,
        rupees_awarded: rupeesAwarded,
      });

      // Update user's score
      await supabase
        .from("micro_task_user_scores")
        .upsert({
          user_id: userId,
          tasks_completed: (userScore?.tasks_completed || 0) + 1,
          total_earned_coins: (userScore?.total_earned_coins || 0) + coinsAwarded,
          total_earned_rupees: Number(userScore?.total_earned_rupees || 0) + rupeesAwarded,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      // Also credit to chatr_coin_balances for unified wallet
      await supabase.rpc("add_coins_to_balance", {
        p_user_id: userId,
        p_amount: coinsAwarded,
      }).catch(() => {
        // RPC might not exist, insert directly
        supabase.from("chatr_coin_transactions").insert({
          user_id: userId,
          amount: coinsAwarded,
          transaction_type: "earn",
          source: "micro_task",
          description: `Earned from: ${task.title}`,
          reference_id: submissionId,
        });
      });
    } else if (finalStatus === "auto_rejected") {
      // Update assignment to rejected
      await supabase
        .from("micro_task_assignments")
        .update({ status: "rejected" })
        .eq("id", submission.assignment_id);

      // Create verification record
      await supabase.from("micro_task_verifications").insert({
        submission_id: submissionId,
        verification_type: "auto",
        result: "rejected",
        reason: rejectReason,
      });
    }

    return new Response(
      JSON.stringify({
        status: finalStatus,
        reason: rejectReason || null,
        coins_awarded: coinsAwarded,
        rupees_awarded: rupeesAwarded,
        fraud_flags: fraudFlags,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Verification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function updateSubmissionStatus(supabase: any, submissionId: string, status: string, reason?: string) {
  await supabase
    .from("micro_task_submissions")
    .update({ 
      status,
      rejection_reason: reason || null,
    })
    .eq("id", submissionId);
}

async function insertFraudFlag(
  supabase: any, 
  userId: string, 
  submissionId: string, 
  flagType: string, 
  details: any
) {
  await supabase.from("micro_task_fraud_flags").insert({
    user_id: userId,
    submission_id: submissionId,
    flag_type: flagType,
    details,
    risk_score_delta: 10,
  });
}
