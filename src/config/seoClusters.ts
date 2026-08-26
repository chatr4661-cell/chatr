/**
 * CHATR — Topic clusters and the internal link graph.
 *
 * Purpose: no indexable page should be an orphan. Every cluster has a hub page,
 * and every member page links back to the hub and sideways to siblings.
 * Anchor text is written as a human would write it — never keyword-stuffed.
 */

import { PUBLIC_ROUTES } from './seo';
import { ROUTE_META } from './seoRoutes';
import { LANGUAGE_PAIRS, SEO_CITIES, getSeoCity, languageCityPath } from './seoPrograms';

export interface SeoCluster {
  id: string;
  label: string;
  /** Hub page for the cluster. Must itself be an indexable public route. */
  hub: string;
  /** Domain that owns this cluster. */
  domain: string;
}

export const CHATR_CLUSTERS: SeoCluster[] = [
  { id: 'universal-inbox', label: 'Universal inbox', hub: '/chatr/universal-inbox-ai', domain: 'chatr.chat' },
  { id: 'ai-messaging', label: 'AI messaging', hub: '/communities', domain: 'chatr.chat' },
  { id: 'ai-assistant', label: 'AI assistant', hub: '/ai-assistant', domain: 'chatr.chat' },
  { id: 'ai-agents', label: 'AI agents', hub: '/ai-agents', domain: 'chatr.chat' },
  { id: 'business-communication', label: 'Business communication', hub: '/official-accounts', domain: 'chatr.chat' },
  { id: 'whatsapp-candidate-screening', label: 'WhatsApp candidate screening', hub: '/chatr/whatsapp-candidate-screening', domain: 'chatr.chat' },
  { id: 'recruitment-communication', label: 'Recruitment communication', hub: '/jobs', domain: 'chatr.chat' },
  { id: 'ai-productivity', label: 'AI productivity', hub: '/ai-browser', domain: 'chatr.chat' },
  { id: 'business-automation', label: 'Business automation', hub: '/ai-agents', domain: 'chatr.chat' },
  { id: 'ai-workspace', label: 'AI workspace', hub: '/', domain: 'chatr.chat' },
  { id: 'calling-intelligence', label: 'AI calling', hub: '/chatr/live-call-translation', domain: 'chatr.chat' },
  { id: 'city-pages', label: 'Chatr by city', hub: '/chatr/locations', domain: 'chatr.chat' },
  { id: 'language-pairs', label: 'Call translation languages', hub: '/chatr/translate', domain: 'chatr.chat' },
  { id: 'language-cities', label: 'Call translation by city', hub: '/chatr/translate', domain: 'chatr.chat' },
];

/** Hubs that intentionally link to every member of their cluster (directories). */
export const DIRECTORY_HUBS = ['/chatr/locations', '/chatr/translate'];

/**
 * Clusters owned by the Talentxcel domains. Declared for planning only — this
 * repository does not build those sites, so their URLs are never emitted here.
 */
export const TALENTXCEL_CLUSTERS: SeoCluster[] = [
  { id: 'ats-resume', label: 'ATS resume', hub: '/ats-resume', domain: 'talentxcel.in' },
  { id: 'resume-builder', label: 'Resume builder', hub: '/resume-builder', domain: 'talentxcel.in' },
  { id: 'ai-resume-parser', label: 'AI resume parser', hub: '/resume-parser', domain: 'talentxcel.in' },
  { id: 'candidate-screening', label: 'Candidate screening', hub: '/candidate-screening', domain: 'talentxcel.in' },
  { id: 'recruitment-os', label: 'Recruitment OS', hub: '/recruitment-os', domain: 'talentxcel.in' },
  { id: 'recruiter-workflow', label: 'Recruiter workflow', hub: '/recruiter-workflow', domain: 'talentxcel.in' },
  { id: 'fresher-hiring', label: 'Fresher hiring', hub: '/fresher-hiring', domain: 'talentxcel.in' },
  { id: 'interview-preparation', label: 'Interview preparation', hub: '/interview-preparation', domain: 'talentxcel.in' },
  { id: 'job-matching', label: 'Job matching', hub: '/job-matching', domain: 'talentxcel.in' },
  { id: 'talent-acquisition', label: 'Talent acquisition', hub: '/talent-acquisition', domain: 'talentxcel.in' },
];

export const getCluster = (id: string): SeoCluster | undefined =>
  CHATR_CLUSTERS.find((c) => c.id === id);

/**
 * Slugs of every language pair, used to route the deep /chatr/translate/:pair
 * and /chatr/translate/:pair/:city families without scanning ROUTE_META
 * (that family alone has tens of thousands of members).
 */
const PAIR_SLUGS = new Set(LANGUAGE_PAIRS.map((p) => p.slug));

export const clusterMembers = (id: string): string[] =>
  Object.entries(ROUTE_META)
    .filter(([, meta]) => meta.cluster === id)
    .map(([path]) => path);

export interface InternalLink {
  to: string;
  /** Natural human anchor text. */
  anchor: string;
}

/**
 * Links a page should expose so nothing is orphaned: its cluster hub, up to
 * three siblings from the same cluster, and the homepage for top-level reach.
 */
export const internalLinksFor = (path: string): InternalLink[] => {
  const meta = ROUTE_META[path];
  if (!meta) return [];

  // Deep translate families are resolved structurally, not by scanning the
  // cluster, so the link graph stays O(1) at 100k+ URLs.
  if (path.startsWith('/chatr/translate/')) {
    const [pairSlug, citySlug] = path.slice('/chatr/translate/'.length).split('/');
    if (PAIR_SLUGS.has(pairSlug) && !citySlug) {
      // A pair page enumerates its city children, so none of them is orphaned.
      return [
        { to: '/chatr/translate', anchor: 'Call translation languages' },
        ...SEO_CITIES.map((c) => ({
          to: languageCityPath(pairSlug, c.slug),
          anchor: `${pairSlug.replace('-to-', ' to ')} in ${c.name}`,
        })),
        { to: '/', anchor: 'Chatr+' },
      ];
    }
    if (PAIR_SLUGS.has(pairSlug) && citySlug && getSeoCity(citySlug)) {
      const city = getSeoCity(citySlug)!;
      const nearby = SEO_CITIES.filter((c) => c.state === city.state && c.slug !== city.slug).slice(0, 3);
      return [
        { to: `/chatr/translate/${pairSlug}`, anchor: pairSlug.replace('-to-', ' to ') },
        { to: '/chatr/translate', anchor: 'Call translation languages' },
        ...nearby.map((c) => ({
          to: languageCityPath(pairSlug, c.slug),
          anchor: `${pairSlug.replace('-to-', ' to ')} in ${c.name}`,
        })),
        { to: '/', anchor: 'Chatr+' },
      ];
    }
  }
  const cluster = getCluster(meta.cluster);
  const titleOf = (p: string) =>
    PUBLIC_ROUTES.find((r) => r.path === p)?.title.split(' — ')[0] ?? p;

  const links: InternalLink[] = [];
  // Directory hubs enumerate every member so no programmatic page is orphaned.
  if (DIRECTORY_HUBS.includes(path)) {
    for (const member of clusterMembers(meta.cluster)) {
      if (member === path) continue;
      links.push({ to: member, anchor: titleOf(member) });
    }
    links.push({ to: '/', anchor: 'Chatr+' });
    return links;
  }
  if (cluster && cluster.hub !== path) {
    links.push({ to: cluster.hub, anchor: titleOf(cluster.hub) });
  }
  for (const sibling of clusterMembers(meta.cluster)) {
    if (sibling === path || sibling === cluster?.hub) continue;
    if (links.length >= 6) break;
    links.push({ to: sibling, anchor: titleOf(sibling) });
  }
  // A hub also links across to neighbouring hubs, so no hub is left unlinked.
  if (cluster?.hub === path) {
    for (const other of CHATR_CLUSTERS) {
      if (other.hub === path) continue;
      if (links.length >= 7) break;
      links.push({ to: other.hub, anchor: titleOf(other.hub) });
    }
  }
  if (path !== '/') links.push({ to: '/', anchor: 'Chatr+' });
  return links;
};

/**
 * Links present in the global footer / header on every page. These are real
 * site-wide links, so pages reachable through them are not orphans.
 */
export const GLOBAL_NAV_LINKS: string[] = [
  '/chatr/locations',
  '/chatr/translate',
  '/about',
  '/help',
  '/contact',
  '/download',
  '/terms',
  '/privacy',
  '/refund',
  '/disclaimer',
];

/** Every indexable path that no other indexable page and no global nav links to. */
export const findOrphanPages = (): string[] => {
  const indexable = Object.keys(ROUTE_META);
  const linkedTo = new Set<string>(GLOBAL_NAV_LINKS);
  for (const from of indexable) {
    for (const link of internalLinksFor(from)) linkedTo.add(link.to);
  }
  return indexable.filter((p) => p !== '/' && !linkedTo.has(p));
};


/** Paths whose declared cluster does not exist. */
export const findClusterViolations = (): string[] =>
  Object.entries(ROUTE_META)
    .filter(([, meta]) => !getCluster(meta.cluster))
    .map(([path]) => path);
