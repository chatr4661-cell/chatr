import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const canonicalSignalType = (signalType: string | undefined | null) => {
  const normalized = (signalType ?? "").toLowerCase();
  if (normalized === "ice-candidate" || normalized === "ice_candidate") return "candidate";
  return normalized;
};

const candidateObject = (signalData: any) => {
  if (!signalData || typeof signalData !== "object") return {};
  if (signalData.candidate && typeof signalData.candidate === "object") return signalData.candidate;
  if (signalData.data && typeof signalData.data === "object") return signalData.data;
  return signalData;
};

const candidateTypeFromSdp = (candidate: string | undefined | null) => {
  const match = (candidate ?? "").match(/\styp\s+(\w+)/);
  return match?.[1] ?? "unknown";
};

const candidateProtocolFromSdp = (candidate: string | undefined | null) => {
  const parts = (candidate ?? "").split(/\s+/);
  return parts[2] || "unknown";
};

const candidateLogFields = (signalData: any) => {
  const candidateData = candidateObject(signalData);
  const candidate = candidateData?.candidate ?? "";
  return {
    type: candidateTypeFromSdp(candidate),
    protocol: candidateProtocolFromSdp(candidate),
    sdpMid: candidateData?.sdpMid ?? candidateData?.id ?? "unknown",
    sdpMLineIndex: candidateData?.sdpMLineIndex ?? candidateData?.label ?? -1,
  };
};

const offerLogFields = (signalData: any) => {
  const sdp = signalData?.sdp ?? signalData?.description ?? "";
  return { sdpBytes: String(sdp).length };
};

const normalizeIceServers = (input: any): any[] => {
  if (Array.isArray(input)) return input;
  if (Array.isArray(input?.iceServers)) return input.iceServers;
  if (input?.iceServers?.urls) return [input.iceServers];
  if (input?.urls) return [input];
  return [];
};

const sanitizeIceServers = (servers: any[]): any[] =>
  normalizeIceServers(servers).map((server) => {
    if (!server?.urls) return null;
    const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
    const filteredUrls = urls.filter((url: string) => !String(url).toLowerCase().includes(":53"));
    if (filteredUrls.length === 0) return null;
    return {
      ...server,
      urls: filteredUrls.length === 1 ? filteredUrls[0] : filteredUrls,
    };
  }).filter(Boolean);

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

    // ----------------------------------------------------------------
    // ACTION: send_signal (unified web + Android use this)
    // ----------------------------------------------------------------
    if (action === "send_signal" || action === "send-signal") {
      const callId = signalData.call_id || signalData.callId;
      const toUser = signalData.to_user_id || signalData.to_user || signalData.to;
      const signalType = signalData.signal_type || signalData.type;
      const data = signalData.signal_data || signalData.data;
      const canonicalType = canonicalSignalType(signalType);

      if (canonicalType === "candidate") {
        console.log("[webrtc-signaling] SIGNAL_CANDIDATE_PERSISTENCE_ATTEMPT", {
          callId,
          fromUser: user.id,
          toUser,
          ...candidateLogFields(data),
          timestamp: Date.now(),
        });
      }

      const { error } = await supabaseClient.from("webrtc_signals").insert({
        call_id: callId,
        signal_type: signalType,
        signal_data: data,
        from_user: user.id,
        to_user: toUser,
      });

      if (error) {
        console.error("[webrtc-signaling] insert error", error);
        throw error;
      }

      console.log("[webrtc-signaling] Signal stored", { type: signalType, to: toUser });

      if (canonicalType === "candidate") {
        console.log("[webrtc-signaling] SIGNAL_CANDIDATE_PERSISTED", {
          callId,
          fromUser: user.id,
          toUser,
          ...candidateLogFields(data),
          timestamp: Date.now(),
        });
      }
      if (canonicalType === "offer") {
        console.log("[webrtc-signaling] OFFER_INSERTED", {
          callId,
          fromUser: user.id,
          toUser,
          ...offerLogFields(data),
          timestamp: Date.now(),
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----------------------------------------------------------------
    // ACTION: get_signals - Fetch pending signals (dual-channel reliability)
    // Android polls this + Realtime subscription = guaranteed delivery
    // NOTE: Signals are NOT deleted here; they expire via DB TTL or
    // are cleaned up by the caller after ICE completes. Deleting here
    // caused lost offers when callee fetched before caller sent them.
    // ----------------------------------------------------------------
    if (action === "get_signals" || action === "get-signals") {
      const callId = signalData.call_id || signalData.callId;
      
      const { data, error } = await supabaseClient
        .from("webrtc_signals")
        .select("*")
        .eq("call_id", callId)
        .eq("to_user", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[webrtc-signaling] select error", error);
        throw error;
      }

      console.log("[webrtc-signaling] Signals fetched", { count: data?.length ?? 0 });

      const candidateRows = (data ?? []).filter((row: any) => canonicalSignalType(row.signal_type) === "candidate");
      console.log("[webrtc-signaling] SIGNAL_CANDIDATE_RETRIEVAL", {
        callId,
        userId: user.id,
        count: candidateRows.length,
        candidates: candidateRows.map((row: any) => candidateLogFields(row.signal_data)),
        timestamp: Date.now(),
      });
      const offerRows = (data ?? []).filter((row: any) => canonicalSignalType(row.signal_type) === "offer");
      console.log("[webrtc-signaling] OFFER_RETRIEVED", {
        callId,
        userId: user.id,
        found: offerRows.length > 0,
        count: offerRows.length,
        offers: offerRows.map((row: any) => ({
          id: row.id,
          fromUser: row.from_user,
          toUser: row.to_user,
          ...offerLogFields(row.signal_data),
        })),
        source: "get_signals",
        timestamp: Date.now(),
      });

      return new Response(JSON.stringify({ signals: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----------------------------------------------------------------
    // ACTION: get_buffered_offer - CRITICAL for pre-warm
    // Fetches the OFFER that was stored before callee connected
    // This prevents lost offers when caller sends before callee is ready
    // ----------------------------------------------------------------
    if (action === "get_buffered_offer") {
      const callId = signalData.call_id || signalData.callId;

      const { data, error } = await supabaseClient
        .from("webrtc_signals")
        .select("*")
        .eq("call_id", callId)
        .eq("to_user", user.id)
        .eq("signal_type", "offer")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("[webrtc-signaling] buffered offer error", error);
        throw error;
      }

      const offer = data && data.length > 0 ? data[0] : null;
      console.log("[webrtc-signaling] Buffered offer", { found: !!offer });

      console.log("[webrtc-signaling] OFFER_RETRIEVED", {
        callId,
        userId: user.id,
        found: !!offer,
        count: offer ? 1 : 0,
        source: "get_buffered_offer",
        fromUser: offer?.from_user,
        toUser: offer?.to_user,
        ...(offer ? offerLogFields(offer.signal_data) : { sdpBytes: 0 }),
        timestamp: Date.now(),
      });

      return new Response(JSON.stringify({ offer }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ----------------------------------------------------------------
    // ACTION: get_ice_servers - STUN + TURN with dynamic credentials
    // TURN is critical: 30-50% of calls fail without it (symmetric NAT)
    // ----------------------------------------------------------------
    if (action === "get_ice_servers") {
      const meteredApiKey = Deno.env.get("METERED_API_KEY");
      const cfTurnKeyId =
        Deno.env.get("CF_TURN_KEY_ID") ||
        Deno.env.get("TURN_KEY_ID") ||
        Deno.env.get("CF_TURN_APP_ID");
      const cfApiToken =
        Deno.env.get("CF_TURN_API_TOKEN") ||
        Deno.env.get("TURN_KEY_API_TOKEN") ||
        Deno.env.get("CLOUDFLARE_TURN_API_TOKEN");
      // Legacy static TURN env vars (fallback)
      const cfTurnUrl = Deno.env.get("TURN_URLS");
      const cfTurnUser = Deno.env.get("TURN_USERNAME");
      const cfTurnCred = Deno.env.get("TURN_CREDENTIAL");
      
      const iceServers: any[] = [
        // Google STUN (free, unlimited)
        { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] },
        // Cloudflare STUN
        { urls: "stun:stun.cloudflare.com:3478" },
      ];

      // 1. Fetch Cloudflare TURN credentials from CF directly or fallback to chatr.chat API
      if (cfTurnKeyId && cfApiToken) {
        try {
          const cfGenRes = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${cfTurnKeyId}/credentials/generate-ice-servers`, {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${cfApiToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ttl: 86400 }),
            signal: AbortSignal.timeout(4000),
          });
          if (cfGenRes.ok) {
            const cfGenData = await cfGenRes.json();
            iceServers.push(...sanitizeIceServers(cfGenData));
            console.log("[webrtc-signaling] Cloudflare TURN credentials generated from CF API");
          } else {
            console.warn("[webrtc-signaling] Cloudflare TURN generation failed", cfGenRes.status);
          }
        } catch (e) {
          console.warn("[webrtc-signaling] Cloudflare TURN generation error", e);
        }
      } else {
        try {
          const cfRes = await fetch("https://chatr.chat/api/turn-credentials", {
            method: "GET",
            signal: AbortSignal.timeout(4000),
          });
          if (cfRes.ok) {
            const cfData = await cfRes.json();
            if (cfData && cfData.iceServers) {
              if (Array.isArray(cfData.iceServers)) {
                iceServers.push(...sanitizeIceServers(cfData.iceServers));
              } else {
                iceServers.push(...sanitizeIceServers(cfData.iceServers));
              }
              console.log("[webrtc-signaling] Cloudflare TURN credentials fetched from API");
            }
          } else {
            console.warn("[webrtc-signaling] Cloudflare TURN fetch failed", cfRes.status);
          }
        } catch (e) {
          console.warn("[webrtc-signaling] Cloudflare TURN API error", e);
        }
      }

      // 2. Try Metered.ca for dynamic TURN credentials
      if (meteredApiKey) {
        try {
          const turnRes = await fetch(
            `https://chatr.metered.live/api/v1/turn/credentials?apiKey=${meteredApiKey}`,
            { signal: AbortSignal.timeout(3000) }
          );
          if (turnRes.ok) {
            const turnServers = await turnRes.json();
            iceServers.push(...turnServers);
            console.log("[webrtc-signaling] Metered TURN credentials fetched", { count: turnServers.length });
          }
        } catch (e) {
          console.warn("[webrtc-signaling] Metered TURN fetch failed", e);
        }
      }

      // 3. Legacy static TURN env vars
      if (cfTurnUrl && cfTurnUser && cfTurnCred) {
        const cfUrls = cfTurnUrl.split(",").map((u: string) => u.trim()).filter(Boolean);
        iceServers.push({ urls: cfUrls, username: cfTurnUser, credential: cfTurnCred });
        console.log("[webrtc-signaling] Static TURN added from env");
      }

      // 4. Open Relay fallback - only if no TURN was added at all
      const hasTurn = iceServers.some((s: any) => {
        const u = Array.isArray(s.urls) ? s.urls.join(",") : (s.urls || "");
        return u.includes("turn:");
      });
      if (!hasTurn) {
        iceServers.push(
          { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
          { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
          { urls: "turns:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" }
        );
        console.log("[webrtc-signaling] Using Open Relay fallback TURN");
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
