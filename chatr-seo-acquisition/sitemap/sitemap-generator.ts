/**
 * INDEPENDENT PARTITIONED SITEMAP GENERATOR
 *
 * Generates standards-compliant XML sitemaps partitioned by engine type,
 * plus a master sitemap index.
 * Only pages that pass the Quality Gate are included.
 */

export interface SitemapUrlEntry {
  url: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority?: number;
}

export function generateXmlSitemap(entries: SitemapUrlEntry[]): string {
  const urlNodes = entries.map((entry) => `
  <url>
    <loc>${entry.url}</loc>
    ${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ''}
    ${entry.changefreq ? `<changefreq>${entry.changefreq}</changefreq>` : '<changefreq>weekly</changefreq>'}
    <priority>${entry.priority !== undefined ? entry.priority.toFixed(1) : '0.8'}</priority>
  </url>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes}
</urlset>`;
}

export function generateSitemapIndex(sitemapUrls: string[]): string {
  const now = new Date().toISOString().split('T')[0];
  const sitemapNodes = sitemapUrls.map((sUrl) => `
  <sitemap>
    <loc>${sUrl}</loc>
    <lastmod>${now}</lastmod>
  </sitemap>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapNodes}
</sitemapindex>`;
}
