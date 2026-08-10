import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildSitemapPartitions,
  generateRobotsTxt,
  generateSitemapEntries,
  generateSitemapXML,
} from '../src/utils/sitemapGenerator';

const entries = generateSitemapEntries();
const files = buildSitemapPartitions(entries);

mkdirSync(resolve('public/sitemaps'), { recursive: true });

for (const file of files) {
  writeFileSync(resolve(`public${file.path}`), file.xml);
}

writeFileSync(resolve('public/sitemap.xml'), generateSitemapXML());
writeFileSync(resolve('public/robots.txt'), generateRobotsTxt());

console.log(
  `[seo] sitemap: ${entries.length} indexable URLs across ${files.length} partition(s) ` +
    `(${files.map((f) => `${f.path}=${f.urlCount}`).join(', ')})`,
);
console.log('[seo] wrote public/sitemap.xml, public/sitemaps/*.xml, public/robots.txt');
