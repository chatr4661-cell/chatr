/**
 * CHATR Sitemap Generator — SINGLE SOURCE OF TRUTH.
 *
 * Routes and metadata come from src/config/seo.ts (PUBLIC_ROUTES).
 * Only INDEXABLE_PUBLIC routes are emitted. Dynamic (:param) routes,
 * authenticated, private, transactional and utility routes are excluded.
 *
 * scripts/generate-sitemap.ts writes the output to public/sitemap.xml on
 * predev/prebuild, so the served file can never drift from this module.
 */

import {
  PRODUCTION_ORIGIN,
  PUBLIC_ROUTES,
  ROBOTS_DISALLOW,
  canonicalPath,
  isIndexable,
} from '@/config/seo';

export interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq:
    | 'always'
    | 'hourly'
    | 'daily'
    | 'weekly'
    | 'monthly'
    | 'yearly'
    | 'never';
  priority: number;
}

/** Today's date (UTC) — never a fabricated historical date. */
const today = () => new Date().toISOString().split('T')[0];

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

export const generateSitemapEntries = (): SitemapEntry[] => {
  const lastmod = today();
  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];

  for (const route of PUBLIC_ROUTES) {
    const path = canonicalPath(route.path);
    if (path.includes(':') || path.includes('*')) continue;
    if (!isIndexable(path)) continue;
    if (seen.has(path)) continue;
    seen.add(path);

    entries.push({
      loc: `${PRODUCTION_ORIGIN}${path === '/' ? '/' : path}`,
      lastmod,
      changefreq: route.changefreq,
      priority: route.priority,
    });
  }

  return entries;
};

const escapeXml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const generateSitemapXML = (): string => {
  const entries = generateSitemapEntries();

  const urls = entries.map((entry) =>
    [
      '  <url>',
      `    <loc>${escapeXml(entry.loc)}</loc>`,
      `    <lastmod>${entry.lastmod}</lastmod>`,
      `    <changefreq>${entry.changefreq}</changefreq>`,
      `    <priority>${entry.priority.toFixed(1)}</priority>`,
      '  </url>',
    ].join('\n'),
  );

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
};

export const generateRobotsTxt = (): string =>
  [
    '# CHATR robots.txt',
    'User-agent: *',
    'Allow: /',
    '',
    '# Private, authenticated, transactional and utility routes',
    ...ROBOTS_DISALLOW.map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${PRODUCTION_ORIGIN}/sitemap.xml`,
    '',
  ].join('\n');

export const getSitemapData = () => ({
  xml: generateSitemapXML(),
  robots: generateRobotsTxt(),
  entries: generateSitemapEntries(),
  totalRoutes: getIndexableRoutes().length,
});
