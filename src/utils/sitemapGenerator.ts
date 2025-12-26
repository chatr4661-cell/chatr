/**
 * Sitemap Generator for CHATR
 * Auto-generates sitemap.xml from valid routes
 */

import { VALID_ROUTES } from './deepLinkHandler';

const BASE_URL = 'https://chatr.chat';

interface SitemapEntry {
  loc: string;
  lastmod: string;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority: number;
}

// Route priority mapping
const ROUTE_PRIORITIES: Record<string, number> = {
  '/': 1.0,
  '/auth': 0.8,
  '/chat': 0.9,
  '/health': 0.9,
  '/care': 0.9,
  '/jobs': 0.9,
  '/ai-browser': 0.9,
  '/chatr-wallet': 0.8,
  '/communities': 0.8,
  '/chatr-games': 0.8,
  '/chatr-studio': 0.8,
  '/marketplace': 0.8,
  '/about': 0.7,
  '/help': 0.7,
  '/contact': 0.7,
  '/terms': 0.5,
  '/privacy-policy': 0.5,
  '/refund': 0.4,
  '/disclaimer': 0.4,
};

// Route change frequency mapping
const ROUTE_CHANGEFREQ: Record<string, SitemapEntry['changefreq']> = {
  '/': 'daily',
  '/chat': 'always',
  '/jobs': 'daily',
  '/health': 'weekly',
  '/care': 'weekly',
  '/ai-browser': 'daily',
  '/communities': 'daily',
  '/chatr-games': 'weekly',
  '/stories': 'hourly',
  '/about': 'monthly',
  '/terms': 'yearly',
  '/privacy-policy': 'yearly',
};

// Routes to exclude from sitemap (auth-protected or dynamic)
const EXCLUDED_ROUTES = [
  '/admin',
  '/provider-portal',
  '/provider-register',
  '/device-management',
  '/geofence-history',
  '/notification-settings',
  '/account',
  '/qr-login',
  '/onboarding',
];

// Filter out dynamic routes (with :param)
const getStaticRoutes = (): string[] => {
  return VALID_ROUTES.filter(route => {
    // Exclude routes with dynamic segments
    if (route.includes(':')) return false;
    // Exclude auth-protected routes
    if (EXCLUDED_ROUTES.includes(route)) return false;
    return true;
  });
};

// Generate sitemap entries
export const generateSitemapEntries = (): SitemapEntry[] => {
  const routes = getStaticRoutes();
  const today = new Date().toISOString().split('T')[0];

  return routes.map(route => ({
    loc: `${BASE_URL}${route}`,
    lastmod: today,
    changefreq: ROUTE_CHANGEFREQ[route] || 'weekly',
    priority: ROUTE_PRIORITIES[route] || 0.6,
  }));
};

// Generate sitemap XML string
export const generateSitemapXML = (): string => {
  const entries = generateSitemapEntries();
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  entries.forEach(entry => {
    xml += '  <url>\n';
    xml += `    <loc>${entry.loc}</loc>\n`;
    xml += `    <lastmod>${entry.lastmod}</lastmod>\n`;
    xml += `    <changefreq>${entry.changefreq}</changefreq>\n`;
    xml += `    <priority>${entry.priority}</priority>\n`;
    xml += '  </url>\n';
  });
  
  xml += '</urlset>';
  
  return xml;
};

// Generate robots.txt content
export const generateRobotsTxt = (): string => {
  return `# CHATR Robots.txt
User-agent: *
Allow: /

# Sitemaps
Sitemap: ${BASE_URL}/sitemap.xml

# Disallow admin and auth routes
Disallow: /admin
Disallow: /provider-portal
Disallow: /device-management
Disallow: /qr-login
Disallow: /onboarding

# Allow crawling of main content
Allow: /health
Allow: /care
Allow: /jobs
Allow: /ai-browser
Allow: /communities
Allow: /chatr-games
Allow: /chatr-studio
Allow: /marketplace
Allow: /about
Allow: /help
Allow: /contact
`;
};

// Export sitemap data for API endpoint
export const getSitemapData = () => ({
  xml: generateSitemapXML(),
  robots: generateRobotsTxt(),
  entries: generateSitemapEntries(),
  totalRoutes: getStaticRoutes().length,
});
