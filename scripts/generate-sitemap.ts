/**
 * Runs on `predev` and `prebuild`. Writes the ONE production sitemap
 * (public/sitemap.xml) plus public/robots.txt.
 *
 * Partitioned /sitemaps/*.xml files are emitted ONLY when the URL count
 * exceeds the 50,000-URL protocol cap; below that the root sitemap is a
 * single flat <urlset> and no partition files exist.
 */

import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildSitemapPartitions,
  generateRobotsTxt,
  generateSitemapEntries,
  generateSitemapXML,
  needsPartitioning,
} from '../src/utils/sitemapGenerator';

const entries = generateSitemapEntries();
const partitioned = needsPartitioning(entries);

if (partitioned) {
  const files = buildSitemapPartitions(entries);
  mkdirSync(resolve('public/sitemaps'), { recursive: true });
  for (const file of files) writeFileSync(resolve(`public${file.path}`), file.xml);
  console.log(`[seo] partitions: ${files.map((f) => `${f.path}=${f.urlCount}`).join(', ')}`);
} else if (existsSync(resolve('public/sitemaps'))) {
  // Remove stale partition files so there is exactly one source of truth.
  rmSync(resolve('public/sitemaps'), { recursive: true, force: true });
  console.log('[seo] removed stale public/sitemaps/ partitions');
}

writeFileSync(resolve('public/sitemap.xml'), generateSitemapXML());
writeFileSync(resolve('public/robots.txt'), generateRobotsTxt());

console.log(
  `[seo] sitemap.xml written: ${entries.length} indexable URLs ` +
    `(${partitioned ? 'sitemap index' : 'flat urlset'})`,
);
console.log('[seo] wrote public/sitemap.xml, public/robots.txt');
