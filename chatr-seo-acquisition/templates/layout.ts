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
    .live-demo-card { background: #0f172a; color: #fff; border: 1px solid #1e293b; border-radius: var(--radius); padding: 24px; margin: 24px 0 36px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2); }
    .demo-badge { display: inline-block; background: rgba(0,208,132,0.15); color: #00D084; font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 9999px; margin-bottom: 10px; border: 1px solid rgba(0,208,132,0.3); }
    .live-demo-card h3 { font-size: 18px; font-weight: 800; color: #fff; margin-bottom: 6px; }
    .demo-sub { font-size: 13px; color: #94a3b8; margin-bottom: 16px; }
    .demo-box { background: #020617; border: 1px solid #1e293b; border-radius: 12px; padding: 14px; margin-bottom: 18px; font-size: 13px; }
    .demo-input-row, .demo-output-row { display: flex; align-items: baseline; gap: 8px; margin: 4px 0; }
    .demo-lang { font-weight: 700; color: #00D084; font-size: 11px; text-transform: uppercase; }
    .demo-text { color: #f1f5f9; }
    .demo-arrow { color: #64748b; font-size: 12px; margin: 2px 0 2px 20px; }
    .demo-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
    .demo-btn-primary { background: #00D084; color: #022c22; font-weight: 700; font-size: 13px; padding: 10px 20px; border-radius: 9999px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; }
    .demo-btn-primary:hover { background: #10e094; }
    .demo-btn-secondary { background: #1e293b; color: #fff; font-weight: 600; font-size: 13px; padding: 10px 18px; border-radius: 9999px; text-decoration: none; border: 1px solid #334155; }
    .demo-btn-secondary:hover { background: #334155; }
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

    <!-- Interactive Live Demo & Instant Call Hook -->
    <section class="live-demo-card">
      <div class="demo-badge">🔥 Interactive Live Tool</div>
      <h3>Test Real-Time Language Translation</h3>
      <p class="demo-sub">Try instant speech & text translation across Indian regional languages. Works directly in browser.</p>
      
      <div class="demo-box">
        <div class="demo-input-row">
          <span class="demo-lang">Hindi:</span>
          <span class="demo-text">"नमस्ते, क्या हम आज वीडियो कॉल पर बात कर सकते हैं?"</span>
        </div>
        <div class="demo-arrow">➔</div>
        <div class="demo-output-row">
          <span class="demo-lang">English:</span>
          <span class="demo-text">"Hello, can we speak on a video call today?"</span>
        </div>
      </div>

      <div class="demo-actions">
        <a href="/call/instant-demo" class="demo-btn-primary">📞 Start 1-Click Video Call (Zero Download)</a>
        <a href="/auth?ref=seo_demo" class="demo-btn-secondary">Claim Free Profile + 100 Coins</a>
      </div>
    </section>

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
