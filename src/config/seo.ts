/**
 * CHATR — Single source of truth for all SEO configuration.
 *
 * Every canonical URL, OpenGraph URL, sitemap entry, JSON-LD URL and
 * breadcrumb URL in the application MUST derive from PRODUCTION_ORIGIN.
 *
 * Truth rules enforced here:
 *  - no fabricated ratings, reviews, user counts or awards
 *  - no telephone number until a verified public support line exists
 *  - only social profiles that genuinely belong to CHATR / Talentxcel
 */

export const PRODUCTION_ORIGIN = 'https://chatr.chat';

export const SITE_NAME = 'Chatr+';
export const ORGANIZATION_NAME = 'Talentxcel Services Pvt Ltd';

export const DEFAULT_TITLE = 'Chatr+ — The AI Superapp for India';
export const DEFAULT_DESCRIPTION =
  'Chatr+ brings messaging, calling, AI assistants, a universal inbox, healthcare access, jobs and local services together in one app built for India.';

/** Real asset committed in /public. */
export const DEFAULT_OG_IMAGE = '/chatr-logo.png';

/**
 * Verified accounts only. Leave an entry out rather than guessing.
 * Set TWITTER_HANDLE to null to drop twitter:site/creator entirely.
 */
export const TWITTER_HANDLE: string | null = '@ChatrAppOfficial';

export const SOCIAL_PROFILES: string[] = [
  'https://twitter.com/ChatrAppOfficial',
  'https://www.instagram.com/chatrplus/',
  'https://www.facebook.com/chatrplus',
  'https://linkedin.com/company/talentxcel',
];

/** No verified public customer-service phone line exists yet. */
export const SUPPORT_TELEPHONE: string | null = null;

/** Absolute URL helper — always produces a chatr.chat URL. */
export const absoluteUrl = (pathOrUrl: string): string => {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const path = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${PRODUCTION_ORIGIN}${path}`;
};

/** Strip query/hash and normalise trailing slash so canonicals never duplicate. */
export const canonicalPath = (path: string): string => {
  const clean = path.split('?')[0].split('#')[0].toLowerCase();
  if (clean === '' || clean === '/') return '/';
  return clean.replace(/\/+$/, '');
};

export const canonicalUrlFor = (path: string): string => absoluteUrl(canonicalPath(path));

// ── Indexability classification ────────────────────────────────────────────

export type IndexabilityClass =
  | 'INDEXABLE_PUBLIC'
  | 'NOINDEX_PRIVATE'
  | 'NOINDEX_AUTH'
  | 'NOINDEX_TRANSACTIONAL'
  | 'NOINDEX_UTILITY';

export type ChangeFreq =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

export interface PublicRoute {
  path: string;
  title: string;
  description: string;
  changefreq: ChangeFreq;
  priority: number;
}

/**
 * INDEXABLE_PUBLIC routes only. A route belongs here when a visitor arriving
 * from Google can read and understand it without signing in.
 * Everything not listed is treated as non-indexable.
 */
export const PUBLIC_ROUTES: PublicRoute[] = [
  {
    path: '/',
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    changefreq: 'weekly',
    priority: 1.0,
  },
  {
    path: '/about',
    title: 'About Chatr+ — Who we are and what we build',
    description:
      'Chatr+ is built by Talentxcel Services Pvt Ltd in Noida, India. Learn what the platform does, who it serves and how the ecosystem fits together.',
    changefreq: 'monthly',
    priority: 0.7,
  },
  {
    path: '/help',
    title: 'Chatr+ Help Centre — Guides and answers',
    description:
      'Answers to common Chatr+ questions: signing in with your phone number, messaging and calls, AI features, healthcare booking, payments and account settings.',
    changefreq: 'monthly',
    priority: 0.7,
  },
  {
    path: '/contact',
    title: 'Contact Chatr+ — Support and business enquiries',
    description:
      'Reach the Chatr+ team for product support, partnership and business enquiries, or provider onboarding questions.',
    changefreq: 'monthly',
    priority: 0.6,
  },
  {
    path: '/download',
    title: 'Download Chatr+ — Android and web app',
    description:
      'Get Chatr+ on Android or open it in your browser. One account for messaging, calls, AI assistants, healthcare and local services.',
    changefreq: 'monthly',
    priority: 0.8,
  },
  {
    path: '/ai-assistant',
    title: 'Chatr+ AI Assistant — Ask, draft and summarise',
    description:
      'The Chatr+ AI assistant answers questions, drafts replies and summarises long threads in plain language, on the same app you already chat in.',
    changefreq: 'monthly',
    priority: 0.8,
  },
  {
    path: '/ai-agents',
    title: 'Chatr+ AI Agents — Automate replies and routine work',
    description:
      'Build AI agents in Chatr+ that answer routine questions, screen enquiries and hand off to a human when a conversation needs one.',
    changefreq: 'monthly',
    priority: 0.8,
  },
  {
    path: '/ai-browser',
    title: 'Chatr+ AI Browser — Search the web conversationally',
    description:
      'Ask a question and get a readable answer with the sources behind it, then carry the result straight into a Chatr+ conversation.',
    changefreq: 'monthly',
    priority: 0.7,
  },
  {
    path: '/health',
    title: 'Chatr+ Health Hub — Track health in one place',
    description:
      'Keep vitals, lab reports, medicine reminders and health records together in Chatr+, and move from a record to a consultation without switching apps.',
    changefreq: 'monthly',
    priority: 0.8,
  },
  {
    path: '/care',
    title: 'Chatr+ Care Access — Book doctors and consultations',
    description:
      'Find verified doctors and clinics, book an appointment or a teleconsultation, and keep prescriptions and follow-ups in your Chatr+ health record.',
    changefreq: 'weekly',
    priority: 0.8,
  },
  {
    path: '/local-healthcare',
    title: 'Local Healthcare on Chatr+ — Clinics and labs near you',
    description:
      'Discover clinics, diagnostic labs and pharmacies near you, compare availability and book directly from Chatr+.',
    changefreq: 'weekly',
    priority: 0.6,
  },
  {
    path: '/jobs',
    title: 'Jobs on Chatr+ — Apply and get screened faster',
    description:
      'Browse openings, apply in a few taps and let AI screening move your application forward without long forms or email chains.',
    changefreq: 'daily',
    priority: 0.8,
  },
  {
    path: '/local-jobs',
    title: 'Local Jobs on Chatr+ — Work near you',
    description:
      'Find nearby roles across retail, delivery, healthcare support, field work and services, with applications handled inside Chatr+.',
    changefreq: 'daily',
    priority: 0.7,
  },
  {
    path: '/marketplace',
    title: 'Chatr+ Marketplace — Buy from local sellers',
    description:
      'Browse products and offers from local sellers, chat with them directly and pay inside Chatr+.',
    changefreq: 'weekly',
    priority: 0.7,
  },
  {
    path: '/home-services',
    title: 'Home Services on Chatr+ — Book trusted local help',
    description:
      'Book cleaning, repairs, appliance service and other home help from local providers, with pricing and updates in your Chatr+ chat.',
    changefreq: 'weekly',
    priority: 0.7,
  },
  {
    path: '/communities',
    title: 'Chatr+ Communities — Groups built around interests',
    description:
      'Join and run communities for neighbourhoods, professions, health topics and campuses, with moderation and group tools built in.',
    changefreq: 'weekly',
    priority: 0.7,
  },
  {
    path: '/chatr-wallet',
    title: 'Chatr Wallet — Pay, earn and redeem',
    description:
      'Pay for services, collect Chatr Points and redeem rewards from the wallet built into Chatr+.',
    changefreq: 'monthly',
    priority: 0.7,
  },
  {
    path: '/chatr-studio',
    title: 'Chatr Studio — Create and publish content',
    description:
      'Create posts, media and campaigns for your Chatr+ audience, and publish to communities and official accounts from one place.',
    changefreq: 'monthly',
    priority: 0.6,
  },
  {
    path: '/chatr-games',
    title: 'Chatr Games — Play and earn rewards',
    description:
      'Casual games inside Chatr+ with levels, leaderboards and Chatr Points you can redeem in the wallet.',
    changefreq: 'monthly',
    priority: 0.6,
  },
  {
    path: '/tutors',
    title: 'Chatr Tutors — Learn from verified teachers',
    description:
      'Find tutors by subject and level, message them directly and schedule sessions inside Chatr+.',
    changefreq: 'monthly',
    priority: 0.6,
  },
  {
    path: '/official-accounts',
    title: 'Official Accounts on Chatr+ — Verified business presence',
    description:
      'Verified accounts let businesses and institutions reach people on Chatr+ with a clear identity and a shared team inbox.',
    changefreq: 'monthly',
    priority: 0.6,
  },
  {
    path: '/chatr/whatsapp-candidate-screening',
    title: 'WhatsApp Candidate Screening with AI — Chatr+',
    description:
      'Screen job applicants over WhatsApp with an AI agent that asks your qualifying questions, records answers and hands qualified candidates to your recruiters.',
    changefreq: 'monthly',
    priority: 0.7,
  },
  {
    path: '/chatr/universal-inbox-ai',
    title: 'Universal Inbox with AI — Chatr+',
    description:
      'Bring Gmail, Outlook, WhatsApp, Slack and Teams into one Chatr+ inbox, with AI summaries and replies across every channel.',
    changefreq: 'monthly',
    priority: 0.7,
  },
  {
    path: '/terms',
    title: 'Terms of Service — Chatr+',
    description: 'The terms that govern your use of Chatr+ and its services.',
    changefreq: 'yearly',
    priority: 0.3,
  },
  {
    path: '/privacy',
    title: 'Privacy Policy — Chatr+',
    description: 'How Chatr+ collects, uses, stores and protects your data.',
    changefreq: 'yearly',
    priority: 0.3,
  },
  {
    path: '/refund',
    title: 'Refund Policy — Chatr+',
    description: 'How refunds are handled for paid services and purchases on Chatr+.',
    changefreq: 'yearly',
    priority: 0.3,
  },
  {
    path: '/disclaimer',
    title: 'Disclaimer — Chatr+',
    description:
      'Limitations that apply to information published on Chatr+, including health-related content.',
    changefreq: 'yearly',
    priority: 0.3,
  },
];

const PUBLIC_PATHS = new Set(PUBLIC_ROUTES.map((r) => r.path));

/**
 * Prefixes that must never be indexed. Used for robots.txt generation and for
 * defaulting <meta name="robots"> to noindex on non-public surfaces.
 */
export const NOINDEX_PREFIXES: Array<{ prefix: string; reason: IndexabilityClass }> = [
  { prefix: '/auth', reason: 'NOINDEX_AUTH' },
  { prefix: '/onboarding', reason: 'NOINDEX_AUTH' },
  { prefix: '/qr-login', reason: 'NOINDEX_AUTH' },
  { prefix: '/kyc-verification', reason: 'NOINDEX_AUTH' },
  { prefix: '/account', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/settings', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/chat', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/calls', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/call-history', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/contacts', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/global-contacts', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/smart-inbox', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/notifications', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/notification-settings', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/device-management', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/geofences', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/geofence-history', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/health-passport', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/health-wallet', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/lab-reports', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/admin', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/business', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/seller', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/vendor', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/provider', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/provider-portal', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/provider-register', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/doctor-portal', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/doctor-onboarding', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/developer-portal', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/mcp-console', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/connectors', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/command-center', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/desktop', reason: 'NOINDEX_PRIVATE' },
  { prefix: '/booking', reason: 'NOINDEX_TRANSACTIONAL' },
  { prefix: '/marketplace/checkout', reason: 'NOINDEX_TRANSACTIONAL' },
  { prefix: '/marketplace/order-success', reason: 'NOINDEX_TRANSACTIONAL' },
  { prefix: '/order-history', reason: 'NOINDEX_TRANSACTIONAL' },
  { prefix: '/order-tracking', reason: 'NOINDEX_TRANSACTIONAL' },
  { prefix: '/food-checkout', reason: 'NOINDEX_TRANSACTIONAL' },
  { prefix: '/qr-payment', reason: 'NOINDEX_TRANSACTIONAL' },
  { prefix: '/subscription', reason: 'NOINDEX_TRANSACTIONAL' },
  { prefix: '/apply', reason: 'NOINDEX_TRANSACTIONAL' },
  { prefix: '/join', reason: 'NOINDEX_UTILITY' },
  { prefix: '/os-detection', reason: 'NOINDEX_UTILITY' },
  { prefix: '/bluetooth-test', reason: 'NOINDEX_UTILITY' },
  { prefix: '/capture', reason: 'NOINDEX_UTILITY' },
  { prefix: '/launcher', reason: 'NOINDEX_UTILITY' },
  { prefix: '/stealth-mode', reason: 'NOINDEX_UTILITY' },
];

export const classifyRoute = (path: string): IndexabilityClass => {
  const p = canonicalPath(path);
  if (PUBLIC_PATHS.has(p)) return 'INDEXABLE_PUBLIC';
  const match = NOINDEX_PREFIXES.find((n) => p === n.prefix || p.startsWith(`${n.prefix}/`));
  return match ? match.reason : 'NOINDEX_UTILITY';
};

export const isIndexable = (path: string): boolean =>
  classifyRoute(path) === 'INDEXABLE_PUBLIC';

/** Robots.txt disallow list, derived from the classification above. */
export const ROBOTS_DISALLOW: string[] = Array.from(
  new Set(NOINDEX_PREFIXES.map((n) => n.prefix)),
).sort();
