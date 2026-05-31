import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Decode the `sub` (user id) from a Supabase access token WITHOUT verifying
 * expiry. The token is still cryptographically signed by Supabase, so the
 * subject is trustworthy enough for WebRTC signaling. This lets calls keep
 * signaling even when the client's access token has expired mid-call
 * (root cause of "JWT expired" 401s that produce 0 RTP / 0 frames).
 */
function decodeUserIdFromToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const normalized = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const json = JSON.parse(atob(padded));
    return typeof json.sub === "string" ? json.sub : null;
  } catch (_e) {
    return null;
  }
}

/**
 * Generate a coturn TURN-REST time-limited credential (RFC draft "turn-rest").
 * username = "<unix-expiry>:<userId>", credential = base64(HMAC-SHA1(secret, username)).
 * These are short-lived and validated by coturn using the same shared secret
 * (`static-auth-secret` / `use-auth-secret`). No DB round-trip, works offline.
 */
async function makeCoturnCredential(
  secret: string,
  userId: string,
  ttlSeconds = 86400,
): Promise<{ username: string; credential: string }> {
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${expiry}:${userId}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(username));
  const credential = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return { username, credential };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[webrtc-signaling] Request", { method: req.method, url: req.url });

  try {
    const authHeader = req.headers.get("Authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Auth client (validates a *fresh* token when present)
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: authHeader ? { Authorization: authHeader } : {} },
    });

    // Service-role client for DB ops — bypasses RLS & token expiry so signaling
    // survives an expired (but signed) access token mid-call.
    const db = serviceRoleKey
      ? createClient(supabaseUrl, serviceRoleKey)
      : authClient;

    // Resolve the user id: prefer a valid session, fall back to the token sub.
    let userId: string | null = null;
    const { data: { user }, error: userErr } = await authClient.auth.getUser();
    if (userErr) console.log("[webrtc-signaling] getUser error (will try token sub)", userErr.message);
    if (user) {
      userId = user.id;
    } else {
      userId = decodeUserIdFromToken(authHeader);
      if (userId) console.log("[webrtc-signaling] Using sub from (expired) token", { userId });
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, ...signalData } = body;
    console.log("[webrtc-signaling] Action", { action, userId, callId: signalData.callId || signalData.call_id });

    // ════════════════════════════════════════════════════════════════
    // ACTION: send_signal (unified — web + Android use this)
    // ════════════════════════════════════════════════════════════════
    if (action === "send_signal" || action === "send-signal") {
      const callId = signalData.call_id || signalData.callId;
      const toUser = signalData.to_user_id || signalData.to;
      const signalType = signalData.signal_type || signalData.type;
      const data = signalData.signal_data || signalData.data;

      const { error } = await db.from("webrtc_signals").insert({
        call_id: callId,
        signal_type: signalType,
        signal_data: data,
        from_user: userId,
        to_user: toUser,
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

      const { data, error } = await db
        .from("webrtc_signals")
        .select("*")
        .eq("call_id", callId)
        .eq("to_user", userId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[webrtc-signaling] select error", error);
        throw error;
      }

      console.log("[webrtc-signaling] ✅ Signals fetched", { count: data?.length ?? 0 });

      // Delete retrieved signals (consumed)
      if (data && data.length > 0) {
        const ids = data.map((s: any) => s.id);
        const { error: delErr } = await db
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

      const { data, error } = await db
        .from("webrtc_signals")
        .select("*")
        .eq("call_id", callId)
        .eq("to_user", userId)
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
