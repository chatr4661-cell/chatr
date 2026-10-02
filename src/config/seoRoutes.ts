/**
 * CHATR — Per-route SEO metadata that sits alongside PUBLIC_ROUTES.
 *
 * Kept separate from src/config/seo.ts so route copy (title/description) and
 * route *organisation* (cluster, sitemap section, intent, real lastmod) can
 * evolve without rewriting the whole config.
 *
 * lastModified truth rule
 * -----------------------
 * `lastModified` is the date the PAGE CONTENT actually changed, recorded by
 * hand when the content is edited. It is deliberately NOT derived from the
 * sitemap generation time, the build time or `new Date()`. A route with no
 * known content-change timestamp simply omits <lastmod>.
 */

import type { SeoDomainId } from './seoDomains';
import {
  CITY_USE_CASE_ROUTES,
  DIRECTORY_ROUTES,
  LANGUAGE_CITY_ROUTES,
  LANGUAGE_PAIR_ROUTES,

} from './seoPrograms';

/** Sitemap partition a URL belongs to. Each partition is capped at 50,000 URLs. */
export type SitemapSection = 'pages' | 'guides' | 'use-cases' | 'articles';

export interface RouteMeta {
  domain: SeoDomainId;
  section: SitemapSection;
  /** Topic cluster id — see src/config/seoClusters.ts */
  cluster: string;
  /** The single search intent this page answers. */
  primaryIntent: string;
  relatedIntents?: string[];
  schemaType?: 'WebPage' | 'WebSite' | 'SoftwareApplication' | 'Article' | 'CollectionPage';
  language?: string;
  /** ISO date (YYYY-MM-DD) of the last real content change. Omit when unknown. */
  lastModified?: string;
}

const page = (
  cluster: string,
  primaryIntent: string,
  extra: Partial<RouteMeta> = {},
): RouteMeta => ({
  domain: 'chatr.chat',
  section: 'pages',
  cluster,
  primaryIntent,
  schemaType: 'WebPage',
  language: 'en-IN',
  ...extra,
});

export const ROUTE_META: Record<string, RouteMeta> = {
  '/': page('ai-workspace', 'what is chatr plus', { schemaType: 'WebSite' }),
  '/about': page('ai-workspace', 'who builds chatr'),
  '/help': page('ai-workspace', 'chatr help and support'),
  '/contact': page('ai-workspace', 'contact chatr support'),
  '/download': page('ai-workspace', 'download chatr app', {
    schemaType: 'SoftwareApplication',
  }),

  '/ai-assistant': page('ai-assistant', 'ai assistant for messaging'),
  '/ai-agents': page('ai-agents', 'ai agents that reply automatically'),
  '/ai-browser': page('ai-productivity', 'ai browser search assistant'),

  '/health': page('ai-productivity', 'health records app india'),
  '/care': page('ai-productivity', 'book doctor consultation online'),
  '/local-healthcare': page('ai-productivity', 'clinics and labs near me'),

  '/jobs': page('recruitment-communication', 'apply for jobs on chat'),
  '/local-jobs': page('recruitment-communication', 'local jobs near me'),

  '/marketplace': page('business-communication', 'buy from local sellers online'),
  '/home-services': page('business-communication', 'book home services'),
  '/communities': page('ai-messaging', 'community groups app'),
  '/chatr-wallet': page('business-communication', 'chat app wallet payments'),
  '/chatr-studio': page('business-communication', 'create content for business account'),
  '/chatr-games': page('ai-messaging', 'games inside chat app'),
  '/tutors': page('ai-productivity', 'find tutors online'),
  '/official-accounts': page('business-communication', 'verified business account chat'),

  '/chatr/whatsapp-candidate-screening': page(
    'whatsapp-candidate-screening',
    'whatsapp candidate screening ai',
    {
      section: 'use-cases',
      relatedIntents: [
        'screen job applicants on whatsapp',
        'automated candidate screening questions',
        'recruitment chatbot whatsapp',
      ],
      lastModified: '2026-08-10',
    },
  ),
  '/chatr/universal-inbox-ai': page('universal-inbox', 'universal inbox with ai', {
    section: 'use-cases',
    relatedIntents: [
      'one inbox for gmail outlook whatsapp slack',
      'ai email summary and reply',
      'shared team inbox with ai',
    ],
    lastModified: '2026-08-10',
  }),

  '/chatr/ai-messaging-assistant': page('ai-assistant', 'ai messaging assistant', {
    section: 'use-cases',
    relatedIntents: [
      'ai that summarises long chat threads',
      'ai drafted replies in messaging app',
      'translate chat and calls between languages',
    ],
    lastModified: '2026-08-10',
  }),
  '/chatr/ai-agents': page('ai-agents', 'ai agents for messaging', {
    section: 'use-cases',
    relatedIntents: [
      'automate routine customer replies',
      'ai agent with human handoff',
      'whatsapp business ai agent',
    ],
    lastModified: '2026-08-10',
  }),
  '/chatr/business-messaging': page('business-communication', 'business messaging shared inbox', {
    section: 'use-cases',
    relatedIntents: [
      'shared team inbox for whatsapp and email',
      'verified business account messaging',
      'small business customer messaging app',
    ],
    lastModified: '2026-08-10',
  }),

  '/chatr/live-call-translation': page('calling-intelligence', 'live call translation between languages', {
    section: 'use-cases',
    relatedIntents: [
      'real time voice translation phone call',
      'talk to someone who speaks another language on a call',
      'hindi punjabi call translation app',
    ],
    lastModified: '2026-08-19',
  }),
  '/chatr/ai-call-answering': page('calling-intelligence', 'ai answers my phone call', {
    section: 'use-cases',
    relatedIntents: [
      'ai call screening when busy',
      'ai assistant takes a message from caller',
      'alternative to declining a call',
    ],
    lastModified: '2026-08-19',
  }),
  '/chatr/spam-call-protection': page('calling-intelligence', 'spam and scam call protection', {
    section: 'use-cases',
    relatedIntents: [
      'who called me from this number',
      'report a spam caller',
      'community caller id app',
    ],
    lastModified: '2026-08-19',
  }),
  '/chatr/calls-on-slow-networks': page('calling-intelligence', 'calls that work on slow networks', {
    section: 'use-cases',
    relatedIntents: [
      'voice call on 2g network',
      'video call weak signal',
      'call reconnects after signal drop',
    ],
    lastModified: '2026-08-19',
  }),

  '/terms': page('ai-workspace', 'chatr terms of service'),
  '/privacy': page('ai-workspace', 'chatr privacy policy'),
  '/refund': page('ai-workspace', 'chatr refund policy'),
  '/disclaimer': page('ai-workspace', 'chatr disclaimer'),
};

/**
 * Programmatic metadata. These pages are generated from real city / language
 * data and have no known content-change timestamp, so they deliberately omit
 * `lastModified` (and therefore <lastmod> in the sitemap).
 */
for (const route of DIRECTORY_ROUTES) {
  ROUTE_META[route.path] = page(
    route.path === '/chatr/locations' ? 'city-pages' : 'language-pairs',
    route.path === '/chatr/locations'
      ? 'chatr calling and messaging by city'
      : 'call translation language pairs',
    { section: 'guides', schemaType: 'CollectionPage' },
  );
}

for (const route of CITY_USE_CASE_ROUTES) {
  ROUTE_META[route.path] = page('city-pages', route.title.replace(' — Chatr', '').toLowerCase(), {
    section: 'use-cases',
  });
}

for (const route of LANGUAGE_CITY_ROUTES) {
  ROUTE_META[route.path] = page('language-cities', route.title.replace(' — Chatr', '').toLowerCase(), {
    section: 'use-cases',
  });
}

for (const route of LANGUAGE_PAIR_ROUTES) {
  ROUTE_META[route.path] = page('language-pairs', route.title.replace(' — Chatr', '').toLowerCase(), {
    section: 'use-cases',
  });
}

export const getRouteMeta = (path: string): RouteMeta | undefined => ROUTE_META[path];

/** Maximum URLs per sitemap file, per the sitemap protocol. */
export const SITEMAP_MAX_URLS = 50_000;
