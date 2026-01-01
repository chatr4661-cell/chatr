import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignalMessage {
  type: "offer" | "answer" | "ice-candidate";
  callId: string;
  data: any;
  from: string;
  to: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Cloud logs are based on console output; log every invocation
  console.log("[webrtc-signaling] Request", { method: req.method, url: req.url });

  try {
    const authHeader = req.headers.get("Authorization");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: authHeader ? { Authorization: authHeader } : {},
        },
      },
    );

    const {
      data: { user },
      error: userErr,
    } = await supabaseClient.auth.getUser();

    if (userErr) console.log("[webrtc-signaling] getUser error", userErr);

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, ...signalData } = (await req.json()) as SignalMessage & { action: string };
    console.log("[webrtc-signaling] Action", { action, userId: user.id, callId: signalData.callId });

    if (action === "send-signal") {
      const { error } = await supabaseClient.from("webrtc_signals").insert({
        call_id: signalData.callId,
        signal_type: signalData.type,
        signal_data: signalData.data,
        from_user: user.id,
        to_user: signalData.to,
      });

      if (error) {
        console.error("[webrtc-signaling] insert error", error);
        throw error;
      }

      console.log("[webrtc-signaling] ✅ Signal stored", { type: signalData.type, to: signalData.to });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get-signals") {
      const { data, error } = await supabaseClient
        .from("webrtc_signals")
        .select("*")
        .eq("call_id", signalData.callId)
        .eq("to_user", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[webrtc-signaling] select error", error);
        throw error;
      }

      console.log("[webrtc-signaling] ✅ Signals fetched", { count: data?.length ?? 0 });

      // Delete retrieved signals
      const { error: delErr } = await supabaseClient
        .from("webrtc_signals")
        .delete()
        .eq("call_id", signalData.callId)
        .eq("to_user", user.id);

      if (delErr) console.error("[webrtc-signaling] delete error", delErr);

      return new Response(JSON.stringify({ signals: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[webrtc-signaling] Error", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
