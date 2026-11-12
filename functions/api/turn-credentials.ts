// Cloudflare Pages Function: /api/turn-credentials

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    // Strictly load from canonical server-side environment variables; zero hardcoded fallback.
    const tokenId = env.CLOUDFLARE_TURN_TOKEN_ID;
    const apiToken = env.CLOUDFLARE_TURN_API_TOKEN;

    if (!tokenId || !apiToken) {
      console.warn('[Cloudflare TURN] TURN token ID or API token not set in environment.');
      return new Response(JSON.stringify({ error: 'TURN credentials are not configured on server' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    // Explicitly request 1-hour (3600s) short-lived transient credentials
    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${tokenId}/credentials/generate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl: 3600 }),
      }
    );

    if (!response.ok) {
      console.warn('[Cloudflare TURN] Cloudflare Calls generation failed with status', response.status);
      return new Response(JSON.stringify({ error: 'Cloudflare TURN credential generation failed' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (error: any) {
    console.warn('[Cloudflare TURN] Exception during generation:', error?.message);
    return new Response(JSON.stringify({ error: error?.message || 'Internal TURN Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }
}
