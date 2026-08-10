# CHATR.CHAT — SEO Engine (production)

Single sources of truth:

| Concern | File |
| --- | --- |
| Route copy + indexability | `src/config/seo.ts` |
| Domain ownership + GSC properties | `src/config/seoDomains.ts` |
| Per-route cluster / section / intent / real lastmod | `src/config/seoRoutes.ts` |
| Topic clusters + internal link graph | `src/config/seoClusters.ts` |
| sitemap.xml + robots.txt generation | `src/utils/sitemapGenerator.ts` |
| Head tags, canonical, JSON-LD | `src/components/SEOHead.tsx` |

## Commands

```
npm run seo:sitemap                     # regenerate sitemap + robots (also runs on predev/prebuild)
npm run seo:audit                       # 206 deterministic checks; exits non-zero on failure
npm run seo:audit -- --live             # additionally probes https://chatr.chat
npm run seo:audit -- --live --origin=http://localhost:8080
```

## Truth rules (enforced, not aspirational)

- **No fabricated metrics.** No ratings, review counts, download counts or user
  numbers are published anywhere.
- **No fabricated freshness.** `<lastmod>` is emitted *only* when
  `seoRoutes.ts` records a real content-change date. It is never derived from
  build or generation time, so a rebuild cannot fake freshness. Routes without
  a known content date omit `<lastmod>` entirely.
- **No fabricated search data.** `seo-gsc-sync` reports `NOT_CONNECTED`,
  `NO_PROPERTY`, `NO_REPORTED_DATA` or `FORBIDDEN` honestly. Absent data is
  "no reported data", never "zero visibility". Rows are stored verbatim from
  Google with no smoothing or modelling.
- **No modelled attribution.** `src/utils/seoAttribution.ts` stores only the
  landing path, referrer, UTM parameters and a search query when the referrer
  actually exposes one. Missing signals stay `null`.

## Multi-domain safety

`seoDomains.ts` marks exactly one domain as `owned: true` — `https://chatr.chat`,
the domain this repository builds. `chatrchat.in`, `talentxcel.in` and
`talentxcel.net` are declared for planning and property mapping, but this build
never emits their URLs in a sitemap, canonical or OG tag. The audit fails if a
second owned domain appears, or if any forbidden host
(`chatr.lovable.app`, `*.vercel.app`, `localhost`, staging) leaks into
`index.html`, robots.txt or the sitemap.

## Sitemap architecture (scales to millions)

- URLs are partitioned by section (`pages`, `guides`, `use-cases`, `articles`)
  and hard-capped at 50,000 per file: `public/sitemaps/<section>-<n>.xml`.
- `public/sitemap.xml` is a `<sitemapindex>` when more than one partition
  exists, and a plain `<urlset>` when only one does. Both are valid.
- Partitioning is deterministic: the same route set always produces identical
  file names and ordering, so diffs are meaningful.
- Current state: 27 indexable URLs across 2 partitions.

## robots.txt policy

- `User-agent: *` → `Allow: /`, with explicit `Disallow` for every private,
  authenticated, transactional and utility prefix. Nothing is blanket-blocked.
- Action/duplicate parameter URLs (`?utm_source=`, `?ref=`, `?session=`,
  `?token=`, `/api/`) are disallowed so they never index as separate URLs.
- Search and retrieval crawlers (Googlebot, Bingbot, DuckDuckBot,
  OAI-SearchBot, PerplexityBot, ChatGPT-User) are allowed — they can send real
  visitors. Training-only crawlers (Google-Extended, GPTBot, CCBot) are opted
  out. The policy table lives in `CRAWLER_POLICY`.

## Internal link graph

Every indexable page belongs to exactly one cluster with a hub page. A page
links to its hub, up to three siblings and the homepage; hubs additionally link
across to neighbouring hubs. Global nav/footer links (`/about`, `/help`,
`/contact`, `/download`, legal pages) are counted as real links. The audit
fails on any orphan page or any page pointing at a non-existent cluster.

## Search Console

Edge function: `supabase/functions/seo-gsc-sync/index.ts`.

Resolution order is list → match → select: it lists verified properties, keeps
only those covering `https://chatr.chat`, and returns `SELECTION_REQUIRED` with
candidates rather than guessing when several match. Metrics upsert on
`(site_url, metric_date, page, query, country, device)`, so repeated syncs are
idempotent. The 2-day reporting lag is respected.

**Current state: no Google Search Console connection is linked to this
workspace.** Until one is connected, the function logs `NOT_CONNECTED` and the
Control Tower shows that state instead of numbers.

## Control Tower

`/admin/seo` (`src/pages/SeoControlTower.tsx`, `noindex`) shows measured state
only: indexable URL count, partition count, blocked prefix count, cluster and
orphan counts, the raw GSC sync log including errors, and observed arrivals.
Where data is unavailable it says so.

## Data model

`seo_attribution`, `seo_pages`, `seo_opportunities`, `seo_gsc_sync`,
`seo_search_metrics` — all with RLS; reads restricted to admin/CEO except the
public page inventory, and anonymous visitors may only insert their own
arrival row. `seo_opportunities` requires `evidence` plus `evidence_source`, so
an opportunity cannot exist without a traceable reason.

## Known limitation

This is a static Vite SPA. Social-preview crawlers that do not execute JS
(LinkedIn, Slack, Facebook) see only `index.html`, so per-page social previews
are not accurate for them. Googlebot executes JS and sees the per-route tags.
Fixing per-page previews properly requires SSR.
