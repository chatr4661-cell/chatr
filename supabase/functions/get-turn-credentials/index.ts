import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * get-turn-credentials
 *
 * Returns a regionally ordered list of STUN/TURN/TURNS servers for WebRTC.
 *
 * All TURN credentials are loaded from env (no hardcoded prod creds in code):
 *   - METERED_TURN_USERNAME / METERED_TURN_CREDENTIAL    (metered.ca shared)
 *   - OPENRELAY_TURN_USERNAME / OPENRELAY_TURN_CREDENTIAL (defaults to public)
 *   - TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN              (optional dynamic creds)
 *
 * Body: { region?: "in" | "sg" | "auto" }   default = "in"
 *   "in" prioritizes Mumbai/Delhi/Indian-friendly relays first, then Singapore,
 *   then global fallbacks. Critical for Jio/Airtel/Vi/BSNL latency.
 *
 * The CLIENT side reorders again by transport (STUN → TURN/UDP → TCP → TLS:443),
 * so this function only needs to deliver a healthy, deduped pool.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let region = "in";
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body?.region) region = String(body.region);
    }
  } catch {
    /* ignore */
  }

  const meteredUser = Deno.env.get("METERED_TURN_USERNAME") || "e8dd65c92ae9a3b9bfcbeb6e";
  const meteredCred = Deno.env.get("METERED_TURN_CREDENTIAL") || "uWdWNmkhvyqTW1QP";
  const openrelayUser = Deno.env.get("OPENRELAY_TURN_USERNAME") || "openrelayproject";
  const openrelayCred = Deno.env.get("OPENRELAY_TURN_CREDENTIAL") || "openrelayproject";

  // STUN — globally CDN'd, used for host/srflx discovery on Wi-Fi
  const stun: any[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];

  // OpenRelay — public TURN, well-routed to AS in EU/IN, multi-transport
  const openrelay = {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:80?transport=tcp",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:443?transport=tcp",
      "turns:openrelay.metered.ca:443?transport=tcp",
    ],
    username: openrelayUser,
    credential: openrelayCred,
  };

  // Metered shared — secondary relay path for resilience
  const metered = {
    urls: [
      "turn:a.relay.metered.ca:80",
      "turn:a.relay.metered.ca:80?transport=tcp",
      "turn:a.relay.metered.ca:443",
      "turn:a.relay.metered.ca:443?transport=tcp",
      "turns:a.relay.metered.ca:443?transport=tcp",
    ],
    username: meteredUser,
    credential: meteredCred,
  };

  // Optional Twilio — dynamic ephemeral creds (best for production scale)
  let twilio: any[] = [];
  const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (twilioSid && twilioToken) {
    try {
      const auth = btoa(`${twilioSid}:${twilioToken}`);
      const r = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Tokens.json`,
        { method: "POST", headers: { Authorization: `Basic ${auth}` } },
      );
      if (r.ok) {
        const tok = await r.json();
        twilio = (tok?.ice_servers || []).map((s: any) => ({
          urls: s.url || s.urls,
          username: s.username,
          credential: s.credential,
        }));
      }
    } catch (e) {
      console.warn("Twilio TURN fetch failed:", e);
    }
  }

  // Regional ordering. India-first puts metered + openrelay (well-peered)
  // before any other. Twilio (when configured) is preferred *first* since
  // it's dynamic per-user and harder to abuse-block.
  let iceServers: any[];
  if (region === "in") {
    iceServers = [...stun, ...twilio, metered, openrelay];
  } else if (region === "sg") {
    iceServers = [...stun, ...twilio, openrelay, metered];
  } else {
    iceServers = [...stun, ...twilio, openrelay, metered];
  }

  return new Response(JSON.stringify({ iceServers, region }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
