// Cloudflare Pages Function: /api/turn-credentials

const DEFAULT_TURN_TOKEN_ID = 'f14d776ea3375f146d24d7107ad4a2f6';
const DEFAULT_TURN_API_TOKEN = 'a448972031b1c8299b0092addd9065c0665990b9203094daa4467a8f5bbadb96';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

const EMERGENCY_ICE_FALLBACK = {
  iceServers: {
    urls: [
      'stun:stun.cloudflare.com:3478',
      'stun:stun.l.google.com:19302',
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:80?transport=tcp',
      'turn:openrelay.metered.ca:443',
      'turns:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelay',
    credential: 'openrelay',
  },
  fallback: true,
};

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const tokenId = env.CLOUDFLARE_TURN_TOKEN_ID || (globalThis as any).process?.env?.CLOUDFLARE_TURN_TOKEN_ID || DEFAULT_TURN_TOKEN_ID;
    const apiToken = env.CLOUDFLARE_TURN_API_TOKEN || (globalThis as any).process?.env?.CLOUDFLARE_TURN_API_TOKEN || DEFAULT_TURN_API_TOKEN;

    if (!tokenId || !apiToken) {
      return new Response(JSON.stringify(EMERGENCY_ICE_FALLBACK), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${tokenId}/credentials/generate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl: 86400 }),
      }
    );

    if (!response.ok) {
      console.warn('[Cloudflare TURN] Primary generation returned status', response.status);
      return new Response(JSON.stringify(EMERGENCY_ICE_FALLBACK), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (error: any) {
    console.warn('[Cloudflare TURN] Exception during generation:', error);
    return new Response(JSON.stringify(EMERGENCY_ICE_FALLBACK), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}
