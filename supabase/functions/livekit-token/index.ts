// LiveKit token minting edge function
// POST { room: string, identity?: string, name?: string, metadata?: string, ttlSeconds?: number }
// Requires JWT auth. Uses LIVEKIT_API_KEY, LIVEKIT_API_SECRET secrets.
// Optional: LIVEKIT_URL (returned to client for convenience).

import { createClient } from "npm:@supabase/supabase-js@2";
import { AccessToken } from "npm:livekit-server-sdk@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const room = String(body.room ?? "").trim();
    if (!room || room.length > 128) return json({ error: "Invalid room" }, 400);

    const identity = String(body.identity ?? userId);
    const name = body.name ? String(body.name) : undefined;
    const metadata = body.metadata ? String(body.metadata) : undefined;
    const ttl = Math.min(Math.max(Number(body.ttlSeconds ?? 3600), 60), 60 * 60 * 6);

    const apiKey = Deno.env.get("LIVEKIT_API_KEY");
    const apiSecret = Deno.env.get("LIVEKIT_API_SECRET");
    if (!apiKey || !apiSecret) return json({ error: "LiveKit not configured" }, 500);

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name,
      metadata,
      ttl,
    });
    at.addGrant({
      roomJoin: true,
      room,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await at.toJwt();
    return json({
      token: jwt,
      url: Deno.env.get("LIVEKIT_URL") ?? null,
      identity,
      room,
      expiresIn: ttl,
    });
  } catch (e) {
    console.error("livekit-token error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
