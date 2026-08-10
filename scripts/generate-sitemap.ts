import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { generateSitemapXML, generateRobotsTxt } from '../src/utils/sitemapGenerator';

writeFileSync(resolve('public/sitemap.xml'), generateSitemapXML());
writeFileSync(resolve('public/robots.txt'), generateRobotsTxt());

console.log('[seo] public/sitemap.xml + public/robots.txt regenerated from src/config/seo.ts');
