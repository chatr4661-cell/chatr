/**
 * CHATR Sitemap + robots.txt generator — SINGLE SOURCE OF TRUTH.
 *
 * Design goals
 * ------------
 *  - Only the owned domain (chatr.chat) is ever emitted.
 *  - Only INDEXABLE_PUBLIC canonical URLs are emitted.
 *  - Partitioned by section, hard-capped at 50,000 URLs per file, so the
 *    architecture scales to millions of URLs without one giant file.
 *  - A sitemap index is emitted whenever more than one partition exists;
 *    below that, /sitemap.xml stays a plain urlset (valid either way).
 *  - <lastmod> comes ONLY from a recorded content-change date. It is never
 *    derived from build time, so regeneration cannot fake freshness.
 */

import {
  PUBLIC_ROUTES,
  ROBOTS_DISALLOW,
  canonicalPath,
  isIndexable,
} from '@/config/seo';
import { OWNED_DOMAIN } from '@/config/seoDomains';
import { ROUTE_META, SITEMAP_MAX_URLS, type SitemapSection } from '@/config/seoRoutes';

const ORIGIN = OWNED_DOMAIN.origin;

export interface SitemapEntry {
  loc: string;
  /** Present only when a real content-change date is recorded. */
  lastmod?: string;
  changefreq:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never';
  priority: number;
  section: SitemapSection;
}

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Canonical, de-duplicated, indexable-only path list. */
export const getIndexableRoutes = (): string[] => {
  const seen = new Set<string>();
  for (const route of PUBLIC_ROUTES) {
    const path = canonicalPath(route.path);
    if (path.includes(':') || path.includes('*')) continue;
    if (!isIndexable(path)) continue;
    seen.add(path);
  }
  return Array.from(seen);
};

export const getNoindexRoutes = (): string[] =>
  ROBOTS_DISALLOW.slice();

export const generateSitemapEntries = (): SitemapEntry[] => {
  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];

  for (const route of PUBLIC_ROUTES) {
    const path = canonicalPath(route.path);
    if (path.includes(':') || path.includes('*')) continue;
    if (!isIndexable(path)) continue;
    if (seen.has(path)) continue;
    seen.add(path);

    const meta = ROUTE_META[path];
    entries.push({
      loc: `${ORIGIN}${path === '/' ? '/' : path}`,
      lastmod: meta?.lastModified,
      changefreq: route.changefreq,
      priority: route.priority,
      section: meta?.section ?? 'pages',
    });
  }

  return entries;
};

export interface SitemapFile {
  /** Path relative to the web root, e.g. /sitemaps/pages-1.xml */
  path: string;
  xml: string;
  urlCount: number;
}

const urlsetXml = (entries: SitemapEntry[]): string => {
  const urls = entries.map((entry) =>
    [
      '  <url>',
      `    <loc>${escapeXml(entry.loc)}</loc>`,
      entry.lastmod ? `    <lastmod>${entry.lastmod}</lastmod>` : null,
      `    <changefreq>${entry.changefreq}</changefreq>`,
      `    <priority>${entry.priority.toFixed(1)}</priority>`,
      '  </url>',
    ]
      .filter(Boolean)
      .join('\n'),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
};

const SECTION_ORDER: SitemapSection[] = ['pages', 'guides', 'use-cases', 'articles'];

/**
 * Deterministic partitioning: group by section, sort by URL, chunk at
 * SITEMAP_MAX_URLS. Same input always produces the same file names.
 */
export const buildSitemapPartitions = (
  entries: SitemapEntry[] = generateSitemapEntries(),
): SitemapFile[] => {
  const files: SitemapFile[] = [];

  for (const section of SECTION_ORDER) {
    const sectionEntries = entries
      .filter((e) => e.section === section)
      .sort((a, b) => a.loc.localeCompare(b.loc));
    if (sectionEntries.length === 0) continue;

    for (let i = 0; i < sectionEntries.length; i += SITEMAP_MAX_URLS) {
      const chunk = sectionEntries.slice(i, i + SITEMAP_MAX_URLS);
      const index = Math.floor(i / SITEMAP_MAX_URLS) + 1;
      files.push({
        path: `/sitemaps/${section}-${index}.xml`,
        xml: urlsetXml(chunk),
        urlCount: chunk.length,
      });
    }
  }

  return files;
};

export const generateSitemapIndexXML = (files: SitemapFile[]): string => {
  const items = files.map((file) =>
    ['  <sitemap>', `    <loc>${escapeXml(`${ORIGIN}${file.path}`)}</loc>`, '  </sitemap>'].join(
      '\n',
    ),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...items,
    '</sitemapindex>',
    '',
  ].join('\n');
};

/**
 * Root /sitemap.xml. One partition → plain urlset. More than one → index.
 * Both are valid sitemap-protocol documents and both are accepted by Google.
 */
export const generateSitemapXML = (): string => {
  const entries = generateSitemapEntries();
  // Below the protocol cap the root sitemap is ONE flat urlset — the single
  // production source of truth. Partitioning + an index only kick in above it.
  if (entries.length <= SITEMAP_MAX_URLS) return urlsetXml(entries);
  return generateSitemapIndexXML(buildSitemapPartitions(entries));
};

/** True when the URL count forces partitioning (and therefore an index). */
export const needsPartitioning = (
  entries: SitemapEntry[] = generateSitemapEntries(),
): boolean => entries.length > SITEMAP_MAX_URLS;

// ── robots.txt ─────────────────────────────────────────────────────────────

/**
 * Crawler policy. Search/retrieval crawlers are allowed because they can send
 * real visitors; training-only crawlers are opt-out and configurable here.
 * Nothing is blanket-blocked.
 */
export interface CrawlerPolicy {
  userAgent: string;
  allow: boolean;
  note: string;
}

export const CRAWLER_POLICY: CrawlerPolicy[] = [
  { userAgent: 'Googlebot', allow: true, note: 'search' },
  { userAgent: 'Bingbot', allow: true, note: 'search' },
  { userAgent: 'DuckDuckBot', allow: true, note: 'search' },
  { userAgent: 'OAI-SearchBot', allow: true, note: 'AI search/retrieval' },
  { userAgent: 'PerplexityBot', allow: true, note: 'AI search/retrieval' },
  { userAgent: 'ChatGPT-User', allow: true, note: 'user-initiated retrieval' },
  { userAgent: 'Google-Extended', allow: false, note: 'model training only' },
  { userAgent: 'GPTBot', allow: false, note: 'model training only' },
  { userAgent: 'CCBot', allow: false, note: 'bulk crawl corpus' },
];

/** Query strings and action URLs that must never be crawled as separate URLs. */
export const ROBOTS_DISALLOW_PATTERNS = [
  '/*?utm_source=',
  '/*?ref=',
  '/*?session=',
  '/*?token=',
  '/api/',
];

export const generateRobotsTxt = (): string => {
  const lines: string[] = [
    '# CHATR robots.txt — generated from src/config/seo.ts. Do not edit by hand.',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    '# Private, authenticated, transactional and utility routes',
    ...ROBOTS_DISALLOW.map((path) => `Disallow: ${path}`),
    '',
    '# Action / duplicate-parameter URLs',
    ...ROBOTS_DISALLOW_PATTERNS.map((pattern) => `Disallow: ${pattern}`),
    '',
  ];

  for (const policy of CRAWLER_POLICY) {
    lines.push(`# ${policy.userAgent} — ${policy.note}`);
    lines.push(`User-agent: ${policy.userAgent}`);
    lines.push(policy.allow ? 'Allow: /' : 'Disallow: /');
    if (policy.allow) {
      for (const path of ROBOTS_DISALLOW) lines.push(`Disallow: ${path}`);
    }
    lines.push('');
  }

  lines.push(`Sitemap: ${ORIGIN}/sitemap.xml`, '');
  return lines.join('\n');
};

export const getSitemapData = () => {
  const entries = generateSitemapEntries();
  const files = buildSitemapPartitions(entries);
  return {
    origin: ORIGIN,
    xml: generateSitemapXML(),
    robots: generateRobotsTxt(),
    entries,
    files,
    indexableCount: entries.length,
    noindexPrefixCount: ROBOTS_DISALLOW.length,
    partitionCount: files.length,
    usesIndex: entries.length > SITEMAP_MAX_URLS,
  };
};
