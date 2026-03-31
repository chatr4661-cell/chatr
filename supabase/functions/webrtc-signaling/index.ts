import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    const body = await req.json();
    const { action, ...signalData } = body;
    console.log("[webrtc-signaling] Action", { action, userId: user.id, callId: signalData.callId || signalData.call_id });

    // ════════════════════════════════════════════════════════════════
    // ACTION: send_signal (unified — web + Android use this)
    // ════════════════════════════════════════════════════════════════
    if (action === "send_signal" || action === "send-signal") {
      const callId = signalData.call_id || signalData.callId;
      const toUser = signalData.to_user_id || signalData.to;
      const signalType = signalData.signal_type || signalData.type;
      const data = signalData.signal_data || signalData.data;

      const { error } = await supabaseClient.from("webrtc_signals").insert({
        call_id: callId,
        signal_type: signalType,
        signal_data: data,
        from_user_id: user.id,
        to_user_id: toUser,
      });

      if (error) {
        console.error("[webrtc-signaling] insert error", error);
        throw error;
      }

      console.log("[webrtc-signaling] ✅ Signal stored", { type: signalType, to: toUser });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ════════════════════════════════════════════════════════════════
    // ACTION: get_signals — Fetch pending signals (dual-channel reliability)
    // Android polls this + Realtime subscription = guaranteed delivery
    // ════════════════════════════════════════════════════════════════
    if (action === "get_signals" || action === "get-signals") {
      const callId = signalData.call_id || signalData.callId;
      
      const { data, error } = await supabaseClient
        .from("webrtc_signals")
        .select("*")
        .eq("call_id", callId)
        .eq("to_user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[webrtc-signaling] select error", error);
        throw error;
      }

      console.log("[webrtc-signaling] ✅ Signals fetched", { count: data?.length ?? 0 });

      // Delete retrieved signals (consumed)
      if (data && data.length > 0) {
        const ids = data.map((s: any) => s.id);
        const { error: delErr } = await supabaseClient
          .from("webrtc_signals")
          .delete()
          .in("id", ids);

        if (delErr) console.error("[webrtc-signaling] delete error", delErr);
      }

      return new Response(JSON.stringify({ signals: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ════════════════════════════════════════════════════════════════
    // ACTION: get_buffered_offer — CRITICAL for pre-warm
    // Fetches the OFFER that was stored before callee connected
    // This prevents lost offers when caller sends before callee is ready
    // ════════════════════════════════════════════════════════════════
    if (action === "get_buffered_offer") {
      const callId = signalData.call_id || signalData.callId;

      const { data, error } = await supabaseClient
        .from("webrtc_signals")
        .select("*")
        .eq("call_id", callId)
        .eq("to_user_id", user.id)
        .eq("signal_type", "offer")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("[webrtc-signaling] buffered offer error", error);
        throw error;
      }

      const offer = data && data.length > 0 ? data[0] : null;
      console.log("[webrtc-signaling] ✅ Buffered offer", { found: !!offer });

      return new Response(JSON.stringify({ offer }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ════════════════════════════════════════════════════════════════
    // ACTION: get_ice_servers — STUN + TURN with dynamic credentials
    // TURN is critical: 30-50% of calls fail without it
    // ════════════════════════════════════════════════════════════════
    if (action === "get_ice_servers") {
      const meteredApiKey = Deno.env.get("METERED_API_KEY");
      
      const iceServers: any[] = [
        // Google STUN (free, unlimited)
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
      ];

      // Try Metered.ca for TURN credentials
      if (meteredApiKey) {
        try {
          const turnRes = await fetch(
            `https://chatr.metered.live/api/v1/turn/credentials?apiKey=${meteredApiKey}`,
            { signal: AbortSignal.timeout(3000) }
          );
          
          if (turnRes.ok) {
            const turnServers = await turnRes.json();
            iceServers.push(...turnServers);
            console.log("[webrtc-signaling] ✅ Dynamic TURN credentials fetched", { count: turnServers.length });
          }
        } catch (e) {
          console.warn("[webrtc-signaling] ⚠️ TURN fetch failed, using fallback", e);
        }
      }

      // Fallback TURN servers (always include)
      if (iceServers.length <= 1) {
        iceServers.push(
          { urls: "turn:a.relay.metered.ca:80", username: "chatr", credential: "chatr2026" },
          { urls: "turn:a.relay.metered.ca:80?transport=tcp", username: "chatr", credential: "chatr2026" },
          { urls: "turn:a.relay.metered.ca:443", username: "chatr", credential: "chatr2026" },
          { urls: "turns:a.relay.metered.ca:443", username: "chatr", credential: "chatr2026" }
        );
      }

      return new Response(JSON.stringify({ iceServers }), {
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
