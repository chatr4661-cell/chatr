/**
 * INDEPENDENT SEO ACQUISITION TEMPLATE LAYOUT
 *
 * Emits pure, fully rendered HTML.
 * Completely decoupled from React client bundle, CSS preprocessors, or app state.
 *
 * Hand-off links point directly to existing frozen Chatr core URLs:
 *  - Primary: /auth?ref=seo_[engine]
 *  - Homepage: /
 *  - Download: /download
 */

export interface SeoTemplateProps {
  slug: string;
  title: string;
  metaDescription: string;
  canonicalUrl: string;
  h1: string;
  intro: string;
  breadcrumbs: Array<{ label: string; url: string }>;
  bodyHtml: string;
  schemaJson: Record<string, unknown> | Array<Record<string, unknown>>;
  relatedLinks: Array<{ label: string; url: string; description: string }>;
  ctaHeadline: string;
  ctaSubtext: string;
  ctaButtonText: string;
  ctaTargetUrl: string;
}

export function renderSeoHtml(props: SeoTemplateProps): string {
  const schemaStr = JSON.stringify(props.schemaJson, null, 2);

  const breadcrumbItems = props.breadcrumbs.map((b, idx) => `
    <li class="breadcrumb-item" itemprop="itemListElement" itemscope itemtype="https://schema.org/ListItem">
      <a href="${b.url}" itemprop="item"><span itemprop="name">${b.label}</span></a>
      <meta itemprop="position" content="${idx + 1}" />
      ${idx < props.breadcrumbs.length - 1 ? '<span class="sep">/</span>' : ''}
    </li>
  `).join('');

  const relatedHtml = props.relatedLinks.map((r) => `
    <li class="related-card">
      <a href="${r.url}" class="related-link">
        <span class="related-title">${r.label}</span>
        <span class="related-desc">${r.description}</span>
      </a>
    </li>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en-IN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(props.title)}</title>
  <meta name="description" content="${escapeHtml(props.metaDescription)}" />
  <link rel="canonical" href="${props.canonicalUrl}" />
  <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large" />
  
  <!-- Open Graph -->
  <meta property="og:title" content="${escapeHtml(props.title)}" />
  <meta property="og:description" content="${escapeHtml(props.metaDescription)}" />
  <meta property="og:url" content="${props.canonicalUrl}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Chatr" />

  <!-- Pre-rendered Semantic Styling (Self-Contained) -->
  <style>
    :root {
      --bg: #ffffff;
      --text: #0f172a;
      --muted: #475569;
      --brand: #093E32;
      --accent: #00D084;
      --card-bg: #f8fafc;
      --border: #e2e8f0;
      --radius: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text); line-height: 1.6; }
    .nav-bar { border-bottom: 1px solid var(--border); background: #ffffff; padding: 14px 24px; position: sticky; top: 0; z-index: 50; }
    .nav-inner { max-width: 1040px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
    .logo { font-size: 20px; font-weight: 800; text-decoration: none; color: var(--text); display: flex; align-items: center; gap: 6px; }
    .logo-badge { background: var(--accent); color: #fff; font-size: 11px; padding: 2px 7px; border-radius: 6px; font-weight: 700; }
    .nav-cta { background: var(--brand); color: #ffffff; padding: 8px 18px; border-radius: 9999px; text-decoration: none; font-size: 13px; font-weight: 600; }
    .container { max-width: 900px; margin: 0 auto; padding: 32px 20px 80px; }
    .breadcrumbs { list-style: none; display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); margin-bottom: 24px; }
    .breadcrumbs a { color: var(--muted); text-decoration: none; }
    .breadcrumbs a:hover { color: var(--text); }
    .sep { margin: 0 4px; opacity: 0.5; }
    h1 { font-size: 32px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.25; margin-bottom: 14px; }
    .intro { font-size: 17px; color: var(--muted); line-height: 1.55; margin-bottom: 36px; }
    .content-body h2 { font-size: 22px; font-weight: 700; margin: 32px 0 12px; letter-spacing: -0.01em; }
    .content-body p { margin-bottom: 16px; color: #334155; }
    .content-body ul { margin: 12px 0 20px 24px; color: #334155; }
    .content-body li { margin-bottom: 8px; }
    .data-card { background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius); padding: 24px; margin: 24px 0; }
    .cta-banner { background: linear-gradient(135deg, #093E32, #0d5c4b); color: #ffffff; border-radius: var(--radius); padding: 36px 32px; text-align: center; margin: 48px 0; }
    .cta-banner h2 { font-size: 24px; font-weight: 800; margin-bottom: 10px; color: #fff; }
    .cta-banner p { font-size: 15px; opacity: 0.9; margin-bottom: 22px; max-width: 540px; margin-left: auto; margin-right: auto; }
    .cta-button { display: inline-block; background: var(--accent); color: #064e3b; padding: 13px 28px; border-radius: 9999px; font-weight: 700; font-size: 15px; text-decoration: none; }
    .cta-button:hover { background: #10e094; }
    .related-section { margin-top: 48px; border-top: 1px solid var(--border); padding-top: 32px; }
    .related-grid { list-style: none; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; margin-top: 16px; }
    .related-card { background: #ffffff; border: 1px solid var(--border); border-radius: 12px; padding: 16px; transition: border-color 0.2s; }
    .related-card:hover { border-color: var(--accent); }
    .related-link { text-decoration: none; color: inherit; display: block; }
    .related-title { font-weight: 700; font-size: 14px; display: block; margin-bottom: 4px; color: var(--text); }
    .related-desc { font-size: 12px; color: var(--muted); }
    footer { border-top: 1px solid var(--border); padding: 24px 20px; text-align: center; font-size: 12px; color: var(--muted); margin-top: 60px; }
  </style>

  <!-- Valid JSON-LD Structured Data -->
  <script type="application/ld+json">
${schemaStr}
  </script>
</head>
<body>
  <nav class="nav-bar">
    <div class="nav-inner">
      <a href="/" class="logo">
        <span>chatr</span>
        <span class="logo-badge">Hub</span>
      </a>
      <a href="/auth?ref=seo_nav" class="nav-cta">Open Chatr</a>
    </div>
  </nav>

  <div class="container">
    <ol class="breadcrumbs" itemscope itemtype="https://schema.org/BreadcrumbList">
      ${breadcrumbItems}
    </ol>

    <header>
      <h1>${escapeHtml(props.h1)}</h1>
      <p class="intro">${escapeHtml(props.intro)}</p>
    </header>

    <main class="content-body">
      ${props.bodyHtml}
    </main>

    <!-- Clear, Frictionless Deep Link CTA to Frozen Core -->
    <section class="cta-banner">
      <h2>${escapeHtml(props.ctaHeadline)}</h2>
      <p>${escapeHtml(props.ctaSubtext)}</p>
      <a href="${props.ctaTargetUrl}" class="cta-button">${escapeHtml(props.ctaButtonText)}</a>
    </section>

    <section class="related-section">
      <h3>Related Exploration on Chatr</h3>
      <ul class="related-grid">
        ${relatedHtml}
      </ul>
    </section>
  </div>

  <footer>
    <p>© 2026 Chatr — Independent Acquisition Layer. Connected directly to Chatr Core.</p>
  </footer>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
