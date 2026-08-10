# CHATR.CHAT — SEO Foundation Hardening

Single source of truth: `src/config/seo.ts`.

## What changed

| Area | Before | Now |
| --- | --- | --- |
| Domain | mix of `chatr.lovable.app` and `chatr.chat` | `https://chatr.chat` only (`PRODUCTION_ORIGIN`) |
| Canonical | static tag in `index.html` on every route, duplicated by Helmet | per-route, absolute, self-referencing, query/hash stripped |
| robots.txt | hand-written, drifted from routes | generated from route classification |
| sitemap.xml | legacy domain, private routes included | generated; 27 indexable public URLs only |
| Robots meta | indexable by default | **noindex by default**, index only for `INDEXABLE_PUBLIC` |
| Structured data | fake `AggregateRating` (4.9/325 and 4.8/10000), fake `itunes app-id=1234567890`, unverified twitter:data | removed; only verifiable Organization / WebApplication / WebPage / BreadcrumbList |

## Route classification (`src/config/seo.ts`)

- `INDEXABLE_PUBLIC` — marketing, informational, legal, and the new landing pages.
- `NOINDEX_PRIVATE` — authenticated surfaces (chat, calls, health records, wallet, settings, admin, portals).
- `NOINDEX_UTILITY` — transactional/utility (checkout, order tracking, QR login, onboarding, diagnostics).

Anything not explicitly listed as public is treated as noindex. Adding a public
page = add one entry to `PUBLIC_ROUTES`; robots.txt, sitemap.xml and the robots
meta tag all follow automatically.

## Regeneration

`scripts/generate-sitemap.ts` runs on `predev` and `prebuild`, writing
`public/sitemap.xml` and `public/robots.txt`. Run manually with
`npm run seo:sitemap`.

`lastmod` is a build-time date, not a per-page content timestamp — it is
deliberately uniform and should not be read as a content-change signal.

## Landing pages (extensible pattern)

`src/components/seo/SeoLandingLayout.tsx` provides canonical, robots, OG,
breadcrumbs, `WebPage` schema, visible FAQ blocks and an internal-linking
section. Two pages use it:

- `/chatr/whatsapp-candidate-screening`
- `/chatr/universal-inbox-ai`

New landing pages: create a page that renders `SeoLandingLayout`, register it in
`src/routes/lazyPages.tsx` + `src/App.tsx`, and add the path to `PUBLIC_ROUTES`.

## Truthfulness rules

No ratings, review counts, download counts or user numbers are published
anywhere, because none are independently verifiable. `FAQPage` schema is emitted
only when the questions are visibly rendered on the page. Support telephone and
social profiles are emitted only when a real value exists in
`src/config/seo.ts`.

## Not done (needs SSR)

This is a static Vite SPA. Social-preview crawlers (LinkedIn, Slack, Facebook)
do not execute JS, so they see only `index.html` — per-page social previews are
not accurate for them. Googlebot does execute JS and sees the per-route tags.
Fixing per-page previews properly requires SSR.
