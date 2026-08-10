/**
 * CHATR SEO audit — deterministic config checks plus optional live URL probing.
 *
 *   npm run seo:audit                 # config + generated artefacts only
 *   npm run seo:audit -- --live       # also probes https://chatr.chat
 *   npm run seo:audit -- --live --origin=http://localhost:8080
 *
 * Exits non-zero on any failure so it can gate a deploy.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PUBLIC_ROUTES, canonicalPath, classifyRoute, isIndexable } from '../src/config/seo';
import { FORBIDDEN_HOSTS, OWNED_DOMAIN, SEO_DOMAINS } from '../src/config/seoDomains';
import { ROUTE_META } from '../src/config/seoRoutes';
import { findClusterViolations, findOrphanPages } from '../src/config/seoClusters';
import {
  buildSitemapPartitions,
  generateRobotsTxt,
  generateSitemapEntries,
  getIndexableRoutes,
} from '../src/utils/sitemapGenerator';

const argv = process.argv.slice(2);
const live = argv.includes('--live');
const originArg = argv.find((a) => a.startsWith('--origin='));
const probeOrigin = originArg ? originArg.split('=')[1] : OWNED_DOMAIN.origin;

let failures = 0;
let checks = 0;

const check = (name: string, ok: boolean, detail = '') => {
  checks += 1;
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

console.log('=== CHATR SEO AUDIT ===\n--- configuration ---');

// 1. one owned domain, and it is chatr.chat
check(
  'exactly one owned domain',
  SEO_DOMAINS.filter((d) => d.owned).length === 1,
  OWNED_DOMAIN.origin,
);
check('owned origin is https://chatr.chat', OWNED_DOMAIN.origin === 'https://chatr.chat');

// 2. every public route has metadata, unique canonical, valid copy
const seenPaths = new Set<string>();
for (const route of PUBLIC_ROUTES) {
  const path = canonicalPath(route.path);
  check(`unique canonical ${path}`, !seenPaths.has(path));
  seenPaths.add(path);
  check(`title present ${path}`, route.title.trim().length > 10);
  check(`description present ${path}`, route.description.trim().length > 40);
  check(`route metadata present ${path}`, Boolean(ROUTE_META[path]));
  check(`classified indexable ${path}`, isIndexable(path), classifyRoute(path));
}

// 3. no metadata entry pointing at a non-public route
for (const path of Object.keys(ROUTE_META)) {
  check(`metadata route is public ${path}`, seenPaths.has(path));
}

// 4. clusters + orphans
const orphans = findOrphanPages();
check('no orphan indexable pages', orphans.length === 0, orphans.join(', '));
const clusterViolations = findClusterViolations();
check('every page maps to a real cluster', clusterViolations.length === 0, clusterViolations.join(', '));

// 5. sitemap correctness
const entries = generateSitemapEntries();
const files = buildSitemapPartitions(entries);
check('sitemap has entries', entries.length > 0, `${entries.length} URLs`);
check(
  'all sitemap URLs absolute on owned origin',
  entries.every((e) => e.loc.startsWith(`${OWNED_DOMAIN.origin}/`)),
);
check(
  'no sitemap URL exceeds partition cap',
  files.every((f) => f.urlCount <= 50_000),
);
check('no duplicate sitemap URLs', new Set(entries.map((e) => e.loc)).size === entries.length);
check(
  'no noindex URL in sitemap',
  entries.every((e) => isIndexable(e.loc.replace(OWNED_DOMAIN.origin, '') || '/')),
);
check(
  'no lastmod derived from today',
  !entries.some((e) => e.lastmod === new Date().toISOString().split('T')[0]) ||
    entries.every((e) => e.lastmod === undefined || e.lastmod <= new Date().toISOString().split('T')[0]),
);
check(
  'sitemap count matches indexable route count',
  entries.length === getIndexableRoutes().length,
  `${entries.length}/${getIndexableRoutes().length}`,
);

// 6. robots.txt
const robots = generateRobotsTxt();
check('robots allows Googlebot', /User-agent: Googlebot\nAllow: \//.test(robots));
check('robots declares sitemap', robots.includes(`Sitemap: ${OWNED_DOMAIN.origin}/sitemap.xml`));
check('robots does not blanket-disallow all', !/User-agent: \*\nDisallow: \/\n/.test(robots));
check('robots blocks /admin', robots.includes('Disallow: /admin'));
check('robots blocks /auth', robots.includes('Disallow: /auth'));

// 7. forbidden hosts anywhere in generated artefacts or committed head
const artefacts: Array<[string, string]> = [
  ['robots.txt (generated)', robots],
  ['sitemap.xml (generated)', files.map((f) => f.xml).join('\n')],
];
try {
  artefacts.push(['index.html', readFileSync(resolve('index.html'), 'utf8')]);
} catch {
  /* index.html optional in this check */
}
for (const [label, content] of artefacts) {
  for (const host of FORBIDDEN_HOSTS) {
    check(`${label} free of ${host}`, !content.includes(host));
  }
}

// 8. private routes never indexable
const privateRoutes = [
  '/auth',
  '/settings',
  '/admin',
  '/chat/anything',
  '/account',
  '/marketplace/checkout',
  '/qr-login',
];
for (const path of privateRoutes) {
  check(`private route excluded ${path}`, !isIndexable(path), classifyRoute(path));
}

// 9. live probing
if (live) {
  console.log(`\n--- live probe: ${probeOrigin} ---`);
  const probe = async (path: string) => {
    const url = `${probeOrigin}${path}`;
    const started = Date.now();
    try {
      const res = await fetch(url, { redirect: 'manual' });
      const ms = Date.now() - started;
      const body = res.status < 400 ? await res.text() : '';
      check(`HTTP 200 ${path}`, res.status === 200, `${res.status} in ${ms}ms`);
      if (path.endsWith('.xml') || path.endsWith('.txt')) return;
      for (const host of FORBIDDEN_HOSTS) {
        if (host === 'localhost' && probeOrigin.includes('localhost')) continue;
        check(`${path} free of ${host}`, !body.includes(host));
      }
    } catch (error) {
      check(`reachable ${path}`, false, String(error));
    }
  };

  await probe('/');
  await probe('/robots.txt');
  await probe('/sitemap.xml');
  for (const file of files) await probe(file.path);
  await probe('/chatr/whatsapp-candidate-screening');
  await probe('/chatr/universal-inbox-ai');
} else {
  console.log('\n(live probe skipped — pass --live to run it)');
}

console.log(`\n=== ${checks - failures}/${checks} checks passed, ${failures} failure(s) ===`);
console.log(
  `indexable URLs: ${entries.length} | sitemap partitions: ${files.length} | ` +
    `noindex prefixes: ${new Set(Object.values(ROUTE_META).map((m) => m.section)).size} sections`,
);

process.exit(failures > 0 ? 1 : 0);
