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
    const tokenId = env.CLOUDFLARE_TURN_TOKEN_ID || (globalThis as any).process?.env?.CLOUDFLARE_TURN_TOKEN_ID;
    const apiToken = env.CLOUDFLARE_TURN_API_TOKEN || (globalThis as any).process?.env?.CLOUDFLARE_TURN_API_TOKEN;

    if (!tokenId || !apiToken) {
      return new Response(
        JSON.stringify({ error: 'TURN credentials are not configured in environment' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
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

    const data = await response.json();
    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Cloudflare TURN credential generation failed' }),
        { status: response.status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal TURN Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}
