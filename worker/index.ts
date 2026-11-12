/**
 * CHATR — Cloudflare Full-Stack Edge Worker
 *
 * Provides:
 *  1. Ephemeral TURN credential generation (/api/turn-credentials)
 *  2. FCM v1 Push Notification Dispatcher (/api/fcm-notify)
 *  3. Dynamic SSR SEO Metadata Injection for profile handles (/:handle)
 *  4. Scheduled 10-minute Cron Triggers (email & notification queues)
 *  5. High-performance Static Assets & SPA fallback routing (env.ASSETS)
 */

export interface Env {
  ASSETS: {
    fetch: (request: Request | string) => Promise<Response>;
  };
  CLOUDFLARE_TURN_TOKEN_ID?: string;
  CLOUDFLARE_TURN_API_TOKEN?: string;
  CF_CALLS_KEY_ID?: string;
  CF_CALLS_APP_ID?: string;
  CF_CALLS_APP_SECRET?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  FCM_PRIVATE_KEY?: string;
}

const SUPABASE_DEFAULT_URL = 'https://nuuuqazaoaozgblmvkzn.supabase.co';
const SUPABASE_DEFAULT_ANON = 'sb_publishable_HRiuUoHejwLnOdITsW36Ew_ZSZ513Tw';
const ORIGIN = 'https://chatr.chat';



const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
};

// Reserved top-level routes that must never be treated as a profile handle
const RESERVED = new Set([
  'about', 'account', 'admin', 'ai-agents', 'ai-assistant', 'ai-browser', 'ai-browser-home',
  'ai-clone-settings', 'ai-search', 'allied-healthcare', 'ambassador-program', 'app-statistics',
  'authors', 'auth', 'bluetooth-test', 'bmi-calculator', 'booking', 'business', 'call-history', 'caller-id',
  'calls', 'capture', 'care', 'champions', 'chat', 'chat-ai', 'chatr', 'chatr-games', 'chatr-growth', 'chatr-home',
  'chatr-intelligence', 'chatr-os', 'chatr-plus', 'chatr-plus-subscribe', 'chatr-points', 'chatr-results', 'chatr-studio',
  'chatr-tutors', 'chatr-wallet', 'chatr-world', 'chronic-vitals', 'commercial', 'command-center', 'communities',
  'community', 'connectors', 'contact', 'contacts', 'create-community', 'desktop', 'developer-portal',
  'device-management', 'dhandha', 'direct-chat', 'disclaimer', 'discover', 'doctor-onboarding', 'doctor-portal', 'download', 'earn',
  'ecosystem', 'emergency', 'emergency-services', 'expert-sessions', 'fame-cam', 'fame-leaderboard',
  'food-checkout', 'food-ordering', 'gateway', 'geo', 'geofence-history', 'geofences', 'global-contacts', 'growth', 'health',
  'health-passport', 'health-reminders', 'health-risks', 'health-streaks', 'health-wallet', 'help',
  'home', 'home-services', 'home-solutions', 'identity', 'install', 'jobs', 'join', 'kyc-verification', 'lab-reports',
  'launcher', 'leaderboard', 'local-deals', 'local-healthcare', 'local-jobs', 'lookup', 'marketplace',
  'mcp-console', 'medication-interactions', 'medicine-reminders', 'mental-health', 'mini-apps',
  'native-apps', 'notification-settings', 'notifications', 'nutrition-tracker', 'official-accounts',
  'onboarding', 'order-history', 'order-tracking', 'os-detection', 'prechu-ai', 'privacy', 'privacy-policy', 'profile',
  'provider', 'provider-portal', 'provider-register', 'qr-login', 'qr-payment', 'referrals', 'refund', 'reward-shop',
  'seller', 'search', 'services', 'settings', 'shield', 'shield-sync', 'smart-inbox', 'stealth-mode', 'store', 'stories',
  'studio', 'subscription', 'symptom-checker', 'teleconsultation', 'terms', 'tutors', 'u', 'universal-search',
  'user-subscription', 'vendor', 'voice-assistant', 'wallet', 'web', 'wellness', 'wellness-circles',
  'youth-engagement', 'youth-feed',
  'sitemap.xml', 'robots.txt', 'manifest.json', 'sw.js', 'firebase-messaging-sw.js', 'favicon.ico', 'chatr-logo.png'
]);

const HANDLE_RE = /^[a-z0-9_]{3,30}$/;

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ========================================================================= */
/* 1. TURN CREDENTIAL GENERATION                                             */
/* ========================================================================= */
async function handleTurnCredentials(request: Request, env: Env): Promise<Response> {
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

/* ========================================================================= */
/* 2. FCM V1 PUSH NOTIFICATION DISPATCHER                                    */
/* ========================================================================= */
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

async function handleFcmNotify(request: Request, env: Env): Promise<Response> {
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
    const supabaseUrl = env.VITE_SUPABASE_URL || SUPABASE_DEFAULT_URL;
    const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || SUPABASE_DEFAULT_ANON;
    const type = body.type || 'call';

    const receiverId = body.receiverId || body.recipientId;
    if (!receiverId) {
      return new Response(
        JSON.stringify({ success: false, reason: 'missing_recipient', sent: 0, failed: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    // Query Supabase REST directly for device tokens
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

/* ========================================================================= */
/* 3. DYNAMIC PROFILE SEO METADATA SSR INJECTION (/:handle)                  */
/* ========================================================================= */
async function fetchProfileData(handle: string, supabaseUrl: string, supabaseKey: string) {
  const url = `${supabaseUrl}/rest/v1/profiles?primary_handle=eq.${encodeURIComponent(handle)}&select=id,username,avatar_url,primary_handle,bio`;
  const r = await fetch(url, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
  });
  if (!r.ok) return null;
  const rows: any = await r.json().catch(() => []);
  const profile = Array.isArray(rows) ? rows[0] : null;
  if (!profile?.id) return null;

  const dUrl = `${supabaseUrl}/rest/v1/user_discovery_profiles?user_id=eq.${profile.id}&select=headline,job_title,company,city,country,industry,skills,website`;
  const dr = await fetch(dUrl, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
  });
  const discovery = dr.ok ? (await dr.json().catch(() => []))?.[0] ?? null : null;
  return { profile, discovery };
}

function buildMetaTags(handle: string, profile: any, discovery: any): string {
  const name = profile.username || handle;
  const title = `${name} (@${handle}) · Chatr`;
  const headline =
    discovery?.headline ||
    [discovery?.job_title, discovery?.company].filter(Boolean).join(' at ') ||
    profile.bio ||
    `${name} is on Chatr — message, call, and connect instantly.`;
  const description = String(headline).slice(0, 200);
  const url = `${ORIGIN}/${handle}`;
  const image = profile.avatar_url || `${ORIGIN}/assets/chatrplus-logo512.png`;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    alternateName: `@${handle}`,
    description,
    image,
    url,
    jobTitle: discovery?.job_title || undefined,
    worksFor: discovery?.company ? { '@type': 'Organization', name: discovery.company } : undefined,
    address: discovery?.city || discovery?.country
      ? { '@type': 'PostalAddress', addressLocality: discovery?.city, addressCountry: discovery?.country }
      : undefined,
    knowsAbout: discovery?.skills || undefined,
    sameAs: discovery?.website ? [discovery.website] : undefined,
  };

  return `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <link rel="canonical" href="${escapeHtml(url)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:type" content="profile" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:url" content="${escapeHtml(url)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="profile:username" content="${escapeHtml(handle)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
  `;
}

async function handleProfileSSR(request: Request, env: Env, handle: string): Promise<Response> {
  const supabaseUrl = env.VITE_SUPABASE_URL || SUPABASE_DEFAULT_URL;
  const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || SUPABASE_DEFAULT_ANON;

  const data = await fetchProfileData(handle, supabaseUrl, supabaseKey).catch(() => null);

  // Fetch the SPA shell index.html from static assets
  const shellReq = new Request(new URL('/index.html', request.url), request);
  const shellRes = await env.ASSETS.fetch(shellReq);
  if (!shellRes.ok) {
    return shellRes;
  }

  let html = await shellRes.text();

  if (!data) {
    // Single-segment route matching handle syntax that is not registered.
    html = html
      .replace(/<title>[\s\S]*?<\/title>/i, '<title>Profile Not Found · Chatr</title>')
      .replace(/<\/head>/i, '<meta name="robots" content="noindex, nofollow" />\n</head>');

    return new Response(html, {
      status: 404,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'x-robots-tag': 'noindex, nofollow',
        'cache-control': 'public, max-age=60, s-maxage=300',
        'x-ssr-handle': handle,
      },
    });
  }

  const injection = buildMetaTags(handle, data.profile, data.discovery);
  html = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[^>]*>/i, '')
    .replace(/<link\s+rel="canonical"[^>]*>/i, '');
  html = html.replace(/<\/head>/i, `${injection}\n</head>`);

  return new Response(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
      'x-ssr-handle': handle,
    },
  });
}

/* ========================================================================= */
/* 4. SCHEDULED CRON TRIGGERS (10-minute queue execution)                    */
/* ========================================================================= */
async function processScheduledJobs(env: Env): Promise<void> {
  const supabaseUrl = env.VITE_SUPABASE_URL || SUPABASE_DEFAULT_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || SUPABASE_DEFAULT_ANON;

  console.log('[Cloudflare Cron] Running 10-minute scheduled queue processing...');

  try {
    // Ping digest / notification edge function
    await fetch(`${supabaseUrl}/functions/v1/send-digest-notifications`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'cloudflare-cron', slot: new Date().toISOString() }),
    }).catch((e) => console.warn('[Cloudflare Cron] Digest trigger warning:', e));
  } catch (err) {
    console.error('[Cloudflare Cron] Scheduled job error:', err);
  }
}

/* ========================================================================= */
/* 5. MAIN ROUTER & DISPATCHER                                               */
/* ========================================================================= */
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Canonical www -> apex redirect
    if (url.hostname === 'www.chatr.chat') {
      return Response.redirect('https://chatr.chat' + url.pathname + url.search, 301);
    }
    const path = url.pathname;

    // API Routes
    if (path === '/api/turn-credentials' || path === '/api/turn-credentials/') {
      return handleTurnCredentials(request, env);
    }

    if (path === '/api/fcm-notify' || path === '/api/fcm-notify/') {
      return handleFcmNotify(request, env);
    }

    // Profile handle SEO injection (single-segment paths like /alice, /bob)
    const seg = path.replace(/^\/+|\/+$/g, '');
    if (seg && !seg.includes('/')) {
      const handle = seg.toLowerCase();
      if (!RESERVED.has(handle) && HANDLE_RE.test(handle)) {
        return handleProfileSSR(request, env, handle);
      }
    }

    // Default: Serve static assets from dist/ or SPA fallback /index.html
    return env.ASSETS.fetch(request);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(processScheduledJobs(env));
  },
};
