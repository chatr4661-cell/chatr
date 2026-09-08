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

type PageKind = 'translation' | 'location' | 'ai-answering' | 'download' | 'generic';

const classify = (path: string): PageKind => {
  if (path.startsWith('/chatr/translate/')) return 'translation';
  if (path.startsWith('/chatr/locations/')) return 'location';
  if (/ai-call-answering|ai-agents|ai-messaging/.test(path)) return 'ai-answering';
  if (/download|whatsapp-alternative/.test(path)) return 'download';
  return 'generic';
};

const section = (title: string, inner: string) =>
  `<section><h2>${escapeHtml(title)}</h2>${inner}</section>`;

const list = (items: string[]) => `<ul>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
const steps = (items: string[]) => `<ol>${items.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ol>`;

/** Intent-matched content blocks so every prerendered page is genuinely useful. */
const contentFor = (kind: PageKind, heading: string): string => {
  switch (kind) {
    case 'translation': {
      const pair = heading.replace(/\s*call translation.*/i, '');
      return [
        section(`How ${pair} call translation works`, steps([
          'Start a voice or video call in Chatr — no special equipment needed.',
          'Speak naturally in your language. Chatr translates speech in real time.',
          'The other person hears the translation in their own language, and you hear theirs in yours.',
          'Both sides talk naturally — no reading text, no passing the phone.',
        ])),
        section('Why people use it', list([
          'Talk to family, customers, or colleagues who speak a different language.',
          'Works on slow networks — built for real Indian network conditions.',
          'Private by design: calls are encrypted end to end.',
          'Free to start — download the Android app and call in minutes.',
        ])),
        section('Common questions', [
          ['Do both people need the app?', 'Yes — both sides install Chatr so the call connects securely.'],
          ['Does it work on 2G or 3G?', 'Yes. Chatr adapts audio quality automatically to keep the call alive on weak networks.'],
          ['Is my voice recorded?', 'No. Translation happens during the call and audio is not stored.'],
        ].map(([q, a]) => `<h3>${escapeHtml(q)}</h3><p>${escapeHtml(a)}</p>`).join('')),
      ].join('');
    }
    case 'location':
      return [
        section('What you can do with Chatr here', list([
          'Free HD voice and video calls, even on slow networks.',
          'Live call translation across 25+ Indian and world languages.',
          'AI answers your calls when you are busy and summarises what you missed.',
          'Private, encrypted messaging with your existing contacts.',
        ])),
        section('Get started', steps([
          'Download Chatr for Android from the official download page.',
          'Verify your phone number — it takes under a minute.',
          'Your contacts who already use Chatr appear automatically.',
        ])),
      ].join('');
    case 'ai-answering':
      return [
        section('How AI call answering works', steps([
          'When you are busy, tap "AI Answer" on an incoming call.',
          'Chatr\'s AI speaks to the caller naturally in their language.',
          'You get a summary and transcript of the call when you are free.',
        ])),
        section('Built for real life', list([
          'Never miss a customer call while you are in a meeting or driving.',
          'Screen unknown callers before you decide to pick up.',
          'Works in multiple Indian languages.',
        ])),
      ].join('');
    case 'download':
      return [
        section('Why Chatr', list([
          'Free encrypted calling and messaging.',
          'Live call translation — speak your language, they hear theirs.',
          'AI call answering when you are busy.',
          'Made in India, built for Indian networks.',
        ])),
      ].join('');
    default:
      return '';
  }
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
    contentFor(classify(target.path), heading),
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
