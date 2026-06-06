import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Always-available STUN servers (no credentials required)
const STUN_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

// Generate HMAC-SHA1 time-limited credentials for a self-hosted coturn server.
// coturn "use-auth-secret" / "static-auth-secret" scheme:
//   username = <expiry-unix-ts>:<optional-label>
//   credential = base64(HMAC_SHA1(static_auth_secret, username))
async function buildCoturnCredentials(
  host: string,
  realm: string | undefined,
  secret: string,
  ttlSeconds = 86400,
) {
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${expiry}:chatr`;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(username));
  const credential = btoa(String.fromCharCode(...new Uint8Array(sig)));

  const urls = [
    `turn:${host}:3478?transport=udp`,
    `turn:${host}:3478?transport=tcp`,
    `turns:${host}:5349?transport=tcp`,
  ];

  return { urls, username, credential, realm };
}

// Fetch short-lived TURN credentials from Cloudflare Calls.
async function fetchCloudflareTurn(appId: string, apiToken: string, ttlSeconds = 86400) {
  const res = await fetch(
    `https://rtc.live.cloudflare.com/v1/turn/keys/${appId}/credentials/generate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ttl: ttlSeconds }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudflare TURN error ${res.status}: ${text}`);
  }

  const data = await res.json();
  // Cloudflare returns { iceServers: { urls: [...], username, credential } }
  return data?.iceServers ?? null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const iceServers: any[] = [...STUN_SERVERS];
  const diagnostics: Record<string, string> = {};

  // 1) Cloudflare TURN (preferred relay)
  // Trim to defend against accidental whitespace/newlines from secret entry.
  const cfAppId = Deno.env.get('CF_TURN_APP_ID')?.trim();
  const cfApiToken = Deno.env.get('CF_TURN_API_TOKEN')?.trim();

  // Safe diagnostics: lengths + prefixes only, never the secret value itself.
  if (cfAppId || cfApiToken) {
    diagnostics.cf_meta = JSON.stringify({
      appIdLen: cfAppId?.length ?? 0,
      appIdPrefix: cfAppId?.slice(0, 4) ?? '',
      tokenLen: cfApiToken?.length ?? 0,
      tokenPrefix: cfApiToken?.slice(0, 5) ?? '',
    });
  }

  if (cfAppId && cfApiToken) {
    try {
      const cf = await fetchCloudflareTurn(cfAppId, cfApiToken);
      if (cf) {
        iceServers.push(cf);
        diagnostics.cloudflare = 'ok';
      } else {
        diagnostics.cloudflare = 'empty-response';
      }
    } catch (e) {
      console.error('[get-turn-credentials] Cloudflare TURN failed:', e);
      diagnostics.cloudflare = `error: ${(e as Error).message}`;
    }
  } else {
    diagnostics.cloudflare = 'not-configured';
  }

  // 2) Self-hosted coturn (HMAC fallback)
  const turnHost = Deno.env.get('TURN_HOST');
  const turnRealm = Deno.env.get('TURN_REALM');
  const coturnSecret =
    Deno.env.get('COTURN_STATIC_AUTH_SECRET') ?? Deno.env.get('TURN_SECRET');

  if (turnHost && coturnSecret) {
    try {
      const coturn = await buildCoturnCredentials(turnHost, turnRealm, coturnSecret);
      iceServers.push(coturn);
      diagnostics.coturn = 'ok';
    } catch (e) {
      console.error('[get-turn-credentials] coturn HMAC failed:', e);
      diagnostics.coturn = `error: ${(e as Error).message}`;
    }
  } else {
    diagnostics.coturn = 'not-configured';
  }

  console.log('[get-turn-credentials] diagnostics:', JSON.stringify(diagnostics));
  console.log('[get-turn-credentials] returning', iceServers.length, 'ICE servers');

  return new Response(
    JSON.stringify({ iceServers, diagnostics }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
