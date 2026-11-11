// Cloudflare Pages Function: /api/fcm-notify

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

const PROJECT_ID = 'chatr-91067';
const CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@chatr-91067.iam.gserviceaccount.com';
const FALLBACK_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC6OhPbeJ5azy2h
xbvnC/1zb2I9COzsgo8l0vihxehGIXPb2HTDDX3h6eNqdBGe+3C8FJxMWj9gtUc7
oyv0X6pTMfDqlNx62ZC1SBV3M2XN5qKJQi8FMdhRwrmzmdz4FwBK9FIBWGf3cQkL
iaq0EbgqFcKpSiVE2njntyNioFAhax4v8Heu/icfpirjqXK8PfvPMs9957GAwNzC
NP6h57/2QxyHYRogx6V4sxETzgio8lc0KPUr9jmJO6NAr0xzpq/IGbd2mCXhfawO
DNonqvfZaJdqMpgwSadvLIly7rXlLPROsQfsbi9m/l0M+k+GqvLd+PCFSwHeUg9f
j39u5YOZAgMBAAECggEACd/3hUKa9F9vti1+iRdlLABYL2Va7tr+Io19L/2HE2Tw
Yv7SM4pHxmQjx4AlHmQ14PtKIxsBU6xOfSvqB5jPttP7SEJ22IV95hGkSxWszHjH
iKC7o+ULPqFP6I/8Rs7YGKFmUc+cH7kHjOw9Yt6yVc+hQAnVpRYypWgxgP2APO1S
f/GdMqDNlu2byHNORSsKjyWPh6fynMp6qahjFTEnICUyz8Xwam2K7qgs7HKVsykg
bIAoSAdmbYceJBTe/wq/QQmvFu1XFRfYPym/9z+6hTNlOH2LIhjUpF28TI4cu76y
LkGpVvEl+F+i3BryiDFfPdsfxZoL8kJkkiE7D6mW0wKBgQDlgoCRtijZyW80aQA9
oDJp895wxl28GfNnyaDtibwNiPL2g+a4wvQRx9E5oJWPIuFDHi8rDNa3La7Un1p+
rC4ABHIbUCj+IAk5xprFbvLg3fQUsJBtiTiLLJwn+3B9FLPdH95b/8JURgT1UN0I
8MNBiALnisEJfVKuZJsp02MDIwKBgQDPuKmnaYEsG96JTW+iRYIa+8uCzzMQBr+M
wUB836CX0vW9T/k37VrDcsYy5ZLNZfxibpoHM32SLSyZjUGra620NltFU75hwopp
GEmkL23W8pKF2iAD23uG9lqOTsM2h2oOVZICvnWYcpZ60iq1poxaL1h97jzmd8jK
+7ryeUsYEwKBgEU4ZPqNjCiTXlzaRl5P0KSwDqjIy0COOyFUaJr77aHPaif7hDy5
X891Cp9s1W7EQFhz5BoB10iMGKy8GxkVaRJMRPYD6TksBFxOkCN34Pz9ND6BOi4v
MsSXAcn1ReoTsmPA1tm8e6nbLGeoqeGma9153hZjfPEVwTgj08B7puMtAoGBAJAe
USckHkkaNPYSUefGThSmqnZhh84QwInJ8xIwnd14sqLcf8770UNVuInLmmUD423v
ytJAOVlYGl+XD/79QJGOPRkGl0qAjUOJZF6TwaOmvV49DoVenH/xILcnkm2c2kqD
uEBLII/awOkKNDPAEBTqUH1e88X7Scb7jKN64E0dAoGAPrppoxcwhyiqbo5SGnp8
tu+xuMR1Ji4xhM0RO1u0PPa0xRNALX5TcAjRTz0KpbYMDJ2+CKj8zQSDrM1QdrOa
W9fQ/TEZtfgF9I0VJfFsxsaBxZToWxR8mJttZUhO5ftaUcWkvt51r3PS/FvzdtWS
9wXkWq+BiiFGLZM4nMB5/+Q=
-----END PRIVATE KEY-----`;

let cachedOAuth2Token: { token: string; exp: number } | null = null;

function base64UrlEncode(str: string | Uint8Array): string {
  let binary = '';
  if (typeof str === 'string') {
    const bytes = new TextEncoder().encode(str);
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  } else {
    for (let i = 0; i < str.length; i++) binary += String.fromCharCode(str[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function getOAuth2AccessToken(rawPrivateKey?: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cachedOAuth2Token && cachedOAuth2Token.exp > now + 60) {
    return cachedOAuth2Token.token;
  }

  const keyPem = (rawPrivateKey || FALLBACK_PRIVATE_KEY)
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/[\r\n\s]/g, '');

  const binaryDer = Uint8Array.from(atob(keyPem), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const header = base64UrlEncode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: CLIENT_EMAIL,
      sub: CLIENT_EMAIL,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    })
  );

  const unsignedToken = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signature));
  const jwt = `${unsignedToken}.${signatureB64}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=' + jwt,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OAuth2 token error: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as { access_token: string };
  cachedOAuth2Token = {
    token: data.access_token,
    exp: now + 3000,
  };
  return data.access_token;
}

function isUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str).trim());
}

export async function onRequest(context: any): Promise<Response> {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    });
  }

  try {
    const body: any = await request.json().catch(() => ({}));
    const supabaseUrl = env.VITE_SUPABASE_URL || 'https://nuuuqazaoaozgblmvkzn.supabase.co';
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_HRiuUoHejwLnOdITsW36Ew_ZSZ513Tw';
    const type = body.type || 'call';

    const receiverId = body.receiverId || body.recipientId;
    if (!receiverId) {
      return new Response(
        JSON.stringify({ success: false, reason: 'missing_recipient', sent: 0, failed: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const queryUrl = isUUID(receiverId)
      ? `${supabaseUrl}/rest/v1/device_tokens?user_id=eq.${receiverId}&select=device_token,platform`
      : `${supabaseUrl}/rest/v1/device_tokens?select=device_token,platform&limit=5`;

    const tokenRes = await fetch(queryUrl, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    });

    const dbTokens: Array<{ device_token: string; platform?: string }> = tokenRes.ok
      ? await tokenRes.json().catch(() => [])
      : [];

    if (!Array.isArray(dbTokens) || dbTokens.length === 0) {
      return new Response(
        JSON.stringify({ success: false, sent: 0, failed: 0, reason: 'no_tokens' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    const accessToken = await getOAuth2AccessToken(env.FCM_PRIVATE_KEY);
    const endpoint = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
    let sent = 0;
    let failed = 0;

    await Promise.allSettled(
      dbTokens.map(async (t) => {
        if (!t.device_token) return;
        const payload = {
          message: {
            token: t.device_token,
            android: { priority: 'HIGH', ttl: '30s' },
            data: {
              type,
              caller_name: body.callerName || body.senderName || 'Chatr+',
              call_id: body.callId || ('call_' + Date.now()),
              call_type: body.callType || 'audio',
              conversation_id: body.conversationId || '',
              timestamp: Date.now().toString(),
            },
          },
        };

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) sent++;
        else failed++;
      })
    );

    return new Response(
      JSON.stringify({ success: sent > 0, sent, failed }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || 'FCM dispatch error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}
