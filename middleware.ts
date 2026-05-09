// Vercel Edge Middleware — Server-Side SEO injection for /:handle pages.
// For crawlers AND users, intercepts single-segment paths, looks up the
// handle in Supabase, and injects og:/twitter:/JSON-LD into the SPA shell
// before serving. The SPA then hydrates normally on the client.

import type { NextRequest } from 'next/server';

export const config = {
  // Only run on root-level single-segment paths. Static assets, api/, _next,
  // dotfiles, and anything containing a "." (extensions) are skipped.
  matcher: ['/((?!api/|assets/|_next/|.*\\..*).*)'],
};

const SUPABASE_URL = 'https://sbayuqgomlflmxgicplz.supabase.co';
const SUPABASE_ANON =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYXl1cWdvbWxmbG14Z2ljcGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTc2MDAsImV4cCI6MjA3NDk5MzYwMH0.gVSObpMtsv5W2nuLBHKT8G1_hXIprWXdn5l7Bnnj7jw';
const ORIGIN = 'https://chatr.chat';

// Reserved top-level routes that must never be treated as a handle.
const RESERVED = new Set([
  'about','account','admin','ai-agents','ai-assistant','ai-browser','ai-browser-home',
  'ai-clone-settings','ai-search','allied-healthcare','ambassador-program','app-statistics',
  'auth','bluetooth-test','bmi-calculator','booking','business','call-history','caller-id',
  'calls','capture','care','chat','chat-ai','chatr-games','chatr-growth','chatr-home',
  'chatr-os','chatr-plus','chatr-plus-subscribe','chatr-points','chatr-results','chatr-studio',
  'chatr-tutors','chatr-wallet','chatr-world','chronic-vitals','command-center','communities',
  'community','contact','contacts','create-community','desktop','developer-portal',
  'device-management','dhandha','disclaimer','discover','doctor-onboarding','download','earn',
  'emergency','emergency-services','expert-sessions','fame-cam','fame-leaderboard',
  'food-ordering','geo','geofence-history','geofences','global-contacts','growth','health',
  'health-passport','health-reminders','health-risks','health-streaks','health-wallet','help',
  'home','home-services','identity','install','jobs','join','kyc-verification','lab-reports',
  'launcher','leaderboard','local-deals','local-healthcare','local-jobs','marketplace',
  'mcp-console','medication-interactions','medicine-reminders','mental-health','mini-apps',
  'native-apps','notification-settings','notifications','nutrition-tracker','official-accounts',
  'onboarding','order-history','os-detection','prechu-ai','privacy','privacy-policy','profile',
  'qr-login','referrals','refund','seller','settings','sitemap.xml','robots.txt','stories',
  'symptom-checker','terms','u','user-subscription','wellness',
]);

const HANDLE_RE = /^[a-z0-9_]{3,30}$/;

function esc(s: string) {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function fetchProfile(handle: string) {
  const url = `${SUPABASE_URL}/rest/v1/profiles?primary_handle=eq.${encodeURIComponent(handle)}&select=id,username,avatar_url,primary_handle,bio`;
  const r = await fetch(url, {
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
    cf: { cacheTtl: 60 } as any,
  });
  if (!r.ok) return null;
  const rows = await r.json();
  const profile = Array.isArray(rows) ? rows[0] : null;
  if (!profile?.id) return null;

  const dUrl = `${SUPABASE_URL}/rest/v1/user_discovery_profiles?user_id=eq.${profile.id}&select=headline,job_title,company,city,country,industry,skills,website`;
  const dr = await fetch(dUrl, {
    headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` },
  });
  const discovery = dr.ok ? (await dr.json())?.[0] ?? null : null;
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

export default async function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const seg = url.pathname.replace(/^\/+|\/+$/g, '');
  if (!seg || seg.includes('/')) return;

  const handle = seg.toLowerCase();
  if (RESERVED.has(handle) || !HANDLE_RE.test(handle)) return;

  const data = await fetchProfile(handle).catch(() => null);
  if (!data) return; // pass through to SPA → handled by PublicProfile fallback

  // Fetch the SPA shell from the same origin
  const shellRes = await fetch(`${url.origin}/index.html`, {
    headers: { 'x-ssr-bypass': '1' },
  });
  if (!shellRes.ok) return;
  let html = await shellRes.text();

  const injection = buildMeta(handle, data.profile, data.discovery);

  // Strip default <title> + description so crawlers see the per-handle ones
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
