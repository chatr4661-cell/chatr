/**
 * Post-build prerender for indexable public routes.
 *
 * The app is a client-rendered SPA, so every URL used to return the same empty
 * shell. Google saw ~89k byte-identical documents and refused to index them.
 *
 * This step writes one real HTML file per indexable route, with that route's
 * own <title>, meta description, canonical, robots and a static content block
 * (h1 + intro + internal links) inside #root. React hydrates over it on load,
 * so behaviour is unchanged for humans, while crawlers get unique HTML on the
 * very first byte.
 *
 * Vercel matches the filesystem before applying rewrites, so dist/<path>/index.html
 * is served directly and never hits the SPA fallback.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { PUBLIC_ROUTES, canonicalPath, isIndexable } from '../src/config/seo';
import { OWNED_DOMAIN } from '../src/config/seoDomains';

const DIST = resolve('dist');
const ORIGIN = OWNED_DOMAIN.origin;

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const shell = readFileSync(resolve(DIST, 'index.html'), 'utf8');

interface Target {
  path: string;
  title: string;
  description: string;
}

const seen = new Set<string>();
const targets: Target[] = [];

for (const route of PUBLIC_ROUTES) {
  const path = canonicalPath(route.path);
  if (path === '/') continue; // dist/index.html already is the homepage
  if (path.includes(':') || path.includes('*')) continue;
  if (!isIndexable(path)) continue;
  if (seen.has(path)) continue;
  seen.add(path);
  targets.push({ path, title: route.title, description: route.description });
}

/** A few sibling links per page so the static HTML is genuinely crawlable. */
const siblingsFor = (path: string): Target[] => {
  const parent = path.slice(0, path.lastIndexOf('/'));
  return targets.filter((t) => t.path !== path && t.path.startsWith(`${parent}/`)).slice(0, 12);
};

const HUBS: Array<[string, string]> = [
  ['/', 'Chatr home'],
  ['/chatr/locations', 'Chatr by city'],
  ['/chatr/translate', 'Call translation language pairs'],
];

const renderHead = (target: Target) => {
  const canonical = `${ORIGIN}${target.path}`;
  return [
    `<title>${escapeHtml(target.title)}</title>`,
    `<meta name="description" content="${escapeHtml(target.description)}" />`,
    `<link rel="canonical" href="${canonical}" />`,
    '<meta name="robots" content="index, follow" />',
    `<meta property="og:title" content="${escapeHtml(target.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(target.description)}" />`,
    `<meta property="og:url" content="${canonical}" />`,
    '<meta property="og:type" content="website" />',
    '<meta name="twitter:card" content="summary_large_image" />',
  ].join('\n    ');
};

const renderBody = (target: Target) => {
  const heading = target.title.replace(/\s+—\s+Chatr\+?$/, '');
  const links = [...siblingsFor(target.path), ...HUBS.map(([p, t]) => ({ path: p, title: t, description: '' }))]
    .map((l) => `<li><a href="${l.path}">${escapeHtml(l.title.replace(/\s+—\s+Chatr\+?$/, ''))}</a></li>`)
    .join('');

  return [
    '<div data-prerender="seo">',
    `<h1>${escapeHtml(heading)}</h1>`,
    `<p>${escapeHtml(target.description)}</p>`,
    `<nav aria-label="Related pages"><ul>${links}</ul></nav>`,
    '</div>',
  ].join('');
};

let written = 0;

for (const target of targets) {
  let html = shell;

  // Replace the shell's generic head metadata with this route's own.
  html = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name="description"[^>]*>/i, '')
    .replace(/<link\s+rel="canonical"[^>]*>/i, '')
    .replace(/<meta\s+name="robots"[^>]*>/i, '')
    .replace(/<meta\s+property="og:(title|description|url|type)"[^>]*>/gi, '')
    .replace('</head>', `  ${renderHead(target)}\n  </head>`);

  // Seed #root so the first response already carries this page's content.
  html = html.replace(
    /(<div id="root">)([\s\S]*?)(<\/div>)/i,
    (_m, open: string, _inner: string, close: string) => `${open}${renderBody(target)}${close}`,
  );

  const out = resolve(DIST, `.${target.path}/index.html`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  written += 1;
}

console.log(`[seo] prerendered ${written} route(s) into dist/ as static HTML`);
