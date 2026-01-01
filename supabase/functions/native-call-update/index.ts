import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Edge function to update call status from native apps
 * This bypasses RLS since native apps may not have full JWT auth context
 * 
 * Required body:
 * - callId: string - The call ID to update
 * - status: 'active' | 'ended' | 'rejected'
 * - userId: string - The user making the update (for verification)
 */
serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { callId, status, userId, additionalFields } = await req.json();

    console.log("📞 [native-call-update] Request:", { callId, status, userId });

    if (!callId || !status) {
      return new Response(
        JSON.stringify({ error: "Missing callId or status" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for bypassing RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the call exists and the user is a participant
    const { data: call, error: fetchError } = await supabase
      .from("calls")
      .select("id, caller_id, receiver_id, status")
      .eq("id", callId)
      .single();

    if (fetchError || !call) {
      console.error("❌ [native-call-update] Call not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "Call not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user is part of this call (optional but recommended)
    if (userId && userId !== call.caller_id && userId !== call.receiver_id) {
      console.error("❌ [native-call-update] User not authorized:", { userId, callerId: call.caller_id, receiverId: call.receiver_id });
      return new Response(
        JSON.stringify({ error: "User not authorized for this call" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build update object
    const updateData: Record<string, any> = { status };

    if (status === "active") {
      updateData.started_at = new Date().toISOString();
      updateData.webrtc_state = "connecting";
    } else if (status === "ended" || status === "rejected") {
      updateData.ended_at = new Date().toISOString();
      updateData.webrtc_state = "ended";
      if (status === "rejected") {
        updateData.missed = false;
      }
    }

    // Merge any additional fields
    if (additionalFields) {
      Object.assign(updateData, additionalFields);
    }

    console.log("📝 [native-call-update] Updating call:", { callId, updateData });

    // Update the call
    const { error: updateError } = await supabase
      .from("calls")
      .update(updateData)
      .eq("id", callId);

    if (updateError) {
      console.error("❌ [native-call-update] Update failed:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update call", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ [native-call-update] Call updated successfully:", { callId, status });

    return new Response(
      JSON.stringify({ success: true, callId, status }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("❌ [native-call-update] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Internal server error", details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
