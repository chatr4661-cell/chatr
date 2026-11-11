// Cloudflare Pages Middleware — Server-Side SEO injection for /:handle pages.
// Intercepts single-segment profile paths, looks up the handle in Supabase,
// and injects og:/twitter:/JSON-LD into the SPA shell before serving.

const SUPABASE_URL = 'https://nuuuqazaoaozgblmvkzn.supabase.co';
const SUPABASE_ANON = 'sb_publishable_HRiuUoHejwLnOdITsW36Ew_ZSZ513Tw';
const ORIGIN = 'https://chatr.chat';

const RESERVED = new Set([
  'about','account','admin','ai-agents','ai-assistant','ai-browser','ai-browser-home',
  'ai-clone-settings','ai-search','allied-healthcare','ambassador-program','app-statistics',
  'authors','auth','bluetooth-test','bmi-calculator','booking','business','call-history','caller-id',
  'calls','capture','care','champions','chat','chat-ai','chatr','chatr-games','chatr-growth','chatr-home',
  'chatr-intelligence','chatr-os','chatr-plus','chatr-plus-subscribe','chatr-points','chatr-results','chatr-studio',
  'chatr-tutors','chatr-wallet','chatr-world','chronic-vitals','commercial','command-center','communities',
  'community','connectors','contact','contacts','create-community','desktop','developer-portal',
  'device-management','dhandha','direct-chat','disclaimer','discover','doctor-onboarding','doctor-portal','download','earn',
  'ecosystem','emergency','emergency-services','expert-sessions','fame-cam','fame-leaderboard',
  'food-checkout','food-ordering','gateway','geo','geofence-history','geofences','global-contacts','growth','health',
  'health-passport','health-reminders','health-risks','health-streaks','health-wallet','help',
  'home','home-services','home-solutions','identity','install','jobs','join','kyc-verification','lab-reports',
  'launcher','leaderboard','local-deals','local-healthcare','local-jobs','lookup','marketplace',
  'mcp-console','medication-interactions','medicine-reminders','mental-health','mini-apps',
  'native-apps','notification-settings','notifications','nutrition-tracker','official-accounts',
  'onboarding','order-history','order-tracking','os-detection','prechu-ai','privacy','privacy-policy','profile',
  'provider','provider-portal','provider-register','qr-login','qr-payment','referrals','refund','reward-shop',
  'seller','search','services','settings','shield','shield-sync','smart-inbox','stealth-mode','store','stories',
  'studio','subscription','symptom-checker','teleconsultation','terms','tutors','u','universal-search',
  'user-subscription','vendor','voice-assistant','wallet','web','wellness','wellness-circles',
  'youth-engagement','youth-feed',
  'sitemap.xml','robots.txt','manifest.json','sw.js','firebase-messaging-sw.js','favicon.ico','chatr-logo.png'
]);

const HANDLE_RE = /^[a-z0-9_]{3,30}$/;

function esc(s: string) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function fetchProfile(handle: string, supabaseUrl: string, supabaseKey: string) {
  const url = `${supabaseUrl}/rest/v1/profiles?primary_handle=eq.${encodeURIComponent(handle)}&select=id,username,avatar_url,primary_handle,bio`;
  const r = await fetch(url, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
  });
  if (!r.ok) return null;
  const rows = await r.json().catch(() => []);
  const profile = Array.isArray(rows) ? rows[0] : null;
  if (!profile?.id) return null;

  const dUrl = `${supabaseUrl}/rest/v1/user_discovery_profiles?user_id=eq.${profile.id}&select=headline,job_title,company,city,country,industry,skills,website`;
  const dr = await fetch(dUrl, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
  });
  const discovery = dr.ok ? (await dr.json().catch(() => []))?.[0] ?? null : null;
  return { profile, discovery };
}

function buildMeta(handle: string, profile: any, discovery: any) {
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
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(description)}" />
    <link rel="canonical" href="${esc(url)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:type" content="profile" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(description)}" />
    <meta property="og:url" content="${esc(url)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="profile:username" content="${esc(handle)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(title)}" />
    <meta name="twitter:description" content="${esc(description)}" />
    <meta name="twitter:image" content="${esc(image)}" />
    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>
  `;
}

export async function onRequest(context: any): Promise<Response> {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Canonical www -> apex redirect
  if (url.hostname === 'www.chatr.chat') {
    return Response.redirect('https://chatr.chat' + url.pathname + url.search, 301);
  }
  const seg = url.pathname.replace(/^\/+|\/+$/g, '');

  if (!seg || seg.includes('/') || RESERVED.has(seg.toLowerCase()) || !HANDLE_RE.test(seg.toLowerCase())) {
    return next();
  }

  const handle = seg.toLowerCase();
  const supabaseUrl = env.VITE_SUPABASE_URL || SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || SUPABASE_ANON;

  const data = await fetchProfile(handle, supabaseUrl, supabaseKey).catch(() => null);

  const response = await next();
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  let html = await response.text();

  if (!data) {
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

  const injection = buildMeta(handle, data.profile, data.discovery);
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
