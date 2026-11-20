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

    /* High-Converting Live Calling & Viral Share Engine */
    .call-generator-card {
      background: linear-gradient(145deg, #0b1528, #052a21);
      color: #fff;
      border: 1px solid rgba(0, 208, 132, 0.4);
      border-radius: var(--radius);
      padding: 28px 24px;
      margin: 28px 0 40px;
      box-shadow: 0 20px 40px -15px rgba(0, 208, 132, 0.2), 0 10px 20px -5px rgba(0, 0, 0, 0.4);
      position: relative;
      overflow: hidden;
    }
    .call-generator-card::before {
      content: '';
      position: absolute;
      top: -60px;
      right: -60px;
      width: 140px;
      height: 140px;
      background: radial-gradient(circle, rgba(0,208,132,0.25) 0%, transparent 70%);
      pointer-events: none;
    }
    .generator-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      margin-bottom: 12px;
    }
    .live-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: rgba(0, 208, 132, 0.15);
      color: #00D084;
      font-size: 11px;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 9999px;
      border: 1px solid rgba(0, 208, 132, 0.3);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .live-dot {
      width: 7px;
      height: 7px;
      background: #00D084;
      border-radius: 50%;
      box-shadow: 0 0 8px #00D084;
      animation: pulse-dot 1.8s infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    .privacy-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(255, 255, 255, 0.08);
      color: #cbd5e1;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    .call-generator-card h2 {
      font-size: 24px;
      font-weight: 800;
      color: #ffffff;
      line-height: 1.25;
      margin-bottom: 8px;
      letter-spacing: -0.01em;
    }
    .generator-sub {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.5;
      margin-bottom: 20px;
    }
    .room-box {
      background: #020617;
      border: 1px solid #1e293b;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 18px;
    }
    .room-label {
      display: block;
      font-size: 11px;
      font-weight: 700;
      color: #00D084;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    .input-action-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    .room-input {
      flex: 1;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      color: #f1f5f9;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      outline: none;
      min-width: 0;
    }
    .btn-copy {
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: background 0.15s, border-color 0.15s;
    }
    .btn-copy:hover {
      background: #334155;
      border-color: #00D084;
    }
    .btn-refresh {
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid #334155;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-refresh:hover {
      background: #334155;
      color: #00D084;
      transform: rotate(45deg);
    }
    .action-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 18px;
    }
    @media (max-width: 640px) {
      .action-grid { grid-template-columns: 1fr; }
    }
    .btn-primary-call {
      background: #00D084;
      color: #022c22;
      font-weight: 800;
      font-size: 14px;
      padding: 13px 20px;
      border-radius: 10px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(0, 208, 132, 0.4);
      transition: background 0.15s, transform 0.15s;
    }
    .btn-primary-call:hover {
      background: #10e094;
      transform: translateY(-1px);
    }
    .btn-whatsapp {
      background: #25D366;
      color: #ffffff;
      font-weight: 700;
      font-size: 14px;
      padding: 13px 20px;
      border-radius: 10px;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 14px rgba(37, 211, 102, 0.3);
      transition: background 0.15s, transform 0.15s;
    }
    .btn-whatsapp:hover {
      background: #22bf5b;
      transform: translateY(-1px);
    }
    .trust-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 24px;
    }
    .badge-item {
      font-size: 11px;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 4px 8px;
    }
    .translation-tool-divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #334155, transparent);
      margin: 20px 0;
    }
    .trans-tool-header {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 12px;
      gap: 6px;
    }
    .tool-title {
      font-size: 13px;
      font-weight: 700;
      color: #e2e8f0;
    }
    .tool-note {
      font-size: 11px;
      color: #64748b;
    }
    .lang-pills-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 14px;
    }
    .lang-pill {
      background: #1e293b;
      border: 1px solid #334155;
      color: #94a3b8;
      padding: 5px 11px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .lang-pill:hover {
      background: #334155;
      color: #fff;
    }
    .lang-pill.active {
      background: rgba(0, 208, 132, 0.15);
      border-color: #00D084;
      color: #00D084;
      font-weight: 700;
    }
    .dialogue-box {
      background: #020617;
      border: 1px solid #1e293b;
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 12px;
      font-size: 13px;
    }
    .dialogue-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .speaker-tag {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .source-row .speaker-tag { color: #38bdf8; }
    .target-row .speaker-tag { color: #00D084; }
    .dialogue-text { color: #f8fafc; }
    .trans-arrow {
      color: #64748b;
      font-size: 11px;
      margin: 4px 0 4px 18px;
    }
    .tool-footer {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn-audio {
      background: #1e293b;
      border: 1px solid #334155;
      color: #f1f5f9;
      font-size: 12px;
      font-weight: 700;
      padding: 7px 14px;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .btn-audio:hover {
      background: #334155;
      border-color: #00D084;
      color: #00D084;
    }
    .audio-hint {
      font-size: 11px;
      color: #64748b;
    }
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

    <!-- High-Converting 1-Click Private Calling Engine -->
    <section class="call-generator-card" id="chatr-call-generator">
      <div class="generator-header">
        <span class="live-pill"><span class="live-dot"></span> Live Calling Engine</span>
        <span class="privacy-pill">🔒 Zero App Download • No Signup</span>
      </div>
      <h2>Call Anyone Privately. Without Sharing Your Phone Number.</h2>
      <p class="generator-sub">Generate an encrypted 48kHz HD video or audio room in 1 second. Share the link on WhatsApp, Telegram, or SMS. Your guest joins directly in mobile Chrome, Safari, or Desktop with zero install.</p>
      
      <div class="room-box">
        <label for="room-link-input" class="room-label">Your Private Ephemeral Call Room:</label>
        <div class="input-action-row">
          <input type="text" id="room-link-input" class="room-input" readonly value="https://chatr.chat/call/p-generating..." />
          <button type="button" id="copy-room-btn" class="btn-copy">📋 Copy Link</button>
          <button type="button" id="refresh-room-btn" class="btn-refresh" title="Generate New Room">🔄</button>
        </div>
      </div>

      <div class="action-grid">
        <a href="/call" id="start-call-btn" class="btn-primary-call">
          <span>📞 Start HD Video Call Now</span>
        </a>
        <a href="https://api.whatsapp.com/send" id="whatsapp-share-btn" target="_blank" rel="noopener noreferrer" class="btn-whatsapp">
          <span>💬 Share on WhatsApp</span>
        </a>
      </div>

      <div class="trust-badges">
        <span class="badge-item">🛡️ Hardware WebCrypto Fail-Closed</span>
        <span class="badge-item">⚡ Sub-100ms P2P WebRTC</span>
        <span class="badge-item">📱 Mobile Chrome & Safari Native</span>
        <span class="badge-item">📁 P2P File Drop (AirDrop for Web)</span>
      </div>

      <!-- Interactive Language Translation Player -->
      <div class="translation-tool-divider"></div>
      <div class="translation-tool">
        <div class="trans-tool-header">
          <span class="tool-title">🌐 Test Real-Time Call Translation (SI Voice Engine)</span>
          <span class="tool-note">Try instant speech synthesis right now</span>
        </div>
        <div class="lang-pills-row" id="lang-pills">
          <button type="button" class="lang-pill active" data-pair="hi-en">Hindi ➔ English</button>
          <button type="button" class="lang-pill" data-pair="pa-hi">Punjabi ➔ Hindi</button>
          <button type="button" class="lang-pill" data-pair="mr-en">Marathi ➔ English</button>
          <button type="button" class="lang-pill" data-pair="ta-en">Tamil ➔ English</button>
          <button type="button" class="lang-pill" data-pair="te-hi">Telugu ➔ Hindi</button>
          <button type="button" class="lang-pill" data-pair="bn-hi">Bengali ➔ Hindi</button>
        </div>
        <div class="dialogue-box">
          <div class="dialogue-row source-row">
            <span class="speaker-tag" id="source-lang-label">Hindi:</span>
            <span class="dialogue-text" id="source-phrase">"नमस्ते, क्या हम आज वीडियो कॉल पर बात कर सकते हैं?"</span>
          </div>
          <div class="trans-arrow">➔ Translated in real-time on live call ➔</div>
          <div class="dialogue-row target-row">
            <span class="speaker-tag" id="target-lang-label">English:</span>
            <span class="dialogue-text" id="target-phrase">"Hello, can we speak on a video call today?"</span>
          </div>
        </div>
        <div class="tool-footer">
          <button type="button" id="play-audio-btn" class="btn-audio">
            <span id="audio-icon">🔊</span>
            <span id="audio-btn-text">Listen to Translated Audio</span>
          </button>
          <span class="audio-hint">Zero latency browser speech synthesis</span>
        </div>
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

  <!-- Vanilla High-Converting Calling & Speech Synthesis Scripts (Zero Blocking, Sub-1ms) -->
  <script>
    (function() {
      function generateSlug() {
        try {
          if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return 'p-' + window.crypto.randomUUID();
          }
          if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
            var b = new Uint8Array(16);
            window.crypto.getRandomValues(b);
            b[6] = (b[6] & 0x0f) | 0x40;
            b[8] = (b[8] & 0x3f) | 0x80;
            var h = Array.from(b, function(x) { return x.toString(16).padStart(2, '0'); }).join('');
            return 'p-' + h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
          }
        } catch (e) {}
        return 'p-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
      }

      var origin = window.location.origin || 'https://chatr.chat';
      if (!origin || origin === 'null') origin = 'https://chatr.chat';

      function updateRoom(slug) {
        var roomUrl = origin + '/call/' + slug;
        var input = document.getElementById('room-link-input');
        var startBtn = document.getElementById('start-call-btn');
        var waBtn = document.getElementById('whatsapp-share-btn');
        if (input) input.value = roomUrl;
        if (startBtn) startBtn.href = '/call/' + slug;
        if (waBtn) {
          var msg = 'Join my private HD video call on CHATR (No app or signup needed):\\n' + roomUrl;
          waBtn.href = 'https://api.whatsapp.com/send?text=' + encodeURIComponent(msg);
        }
      }

      var currentSlug = generateSlug();
      updateRoom(currentSlug);

      var refreshBtn = document.getElementById('refresh-room-btn');
      if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
          currentSlug = generateSlug();
          updateRoom(currentSlug);
        });
      }

      var copyBtn = document.getElementById('copy-room-btn');
      if (copyBtn) {
        copyBtn.addEventListener('click', function() {
          var input = document.getElementById('room-link-input');
          if (!input) return;
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(input.value).then(function() {
              copyBtn.innerText = '✓ Link Copied!';
              setTimeout(function() { copyBtn.innerText = '📋 Copy Link'; }, 2500);
            }).catch(function() {
              input.select();
              document.execCommand('copy');
              copyBtn.innerText = '✓ Link Copied!';
              setTimeout(function() { copyBtn.innerText = '📋 Copy Link'; }, 2500);
            });
          } else {
            input.select();
            document.execCommand('copy');
            copyBtn.innerText = '✓ Link Copied!';
            setTimeout(function() { copyBtn.innerText = '📋 Copy Link'; }, 2500);
          }
        });
      }

      var pairs = {
        'hi-en': { srcLang: 'Hindi', tgtLang: 'English', src: 'नमस्ते, क्या हम आज वीडियो कॉल पर बात कर सकते हैं?', tgt: 'Hello, can we speak on a video call today?', voice: 'en-US' },
        'pa-hi': { srcLang: 'Punjabi', tgtLang: 'Hindi', src: 'ਸਤਿ ਸ਼੍ਰੀ ਅਕਾਲ, ਤੁਹਾਡਾ ਕੀ ਹਾਲ ਹੈ?', tgt: 'नमस्ते, आपका क्या हाल है?', voice: 'hi-IN' },
        'mr-en': { srcLang: 'Marathi', tgtLang: 'English', src: 'नमस्कार, मला या सेवेबद्दल अधिक जाणून घ्यायचे आहे.', tgt: 'Hello, I want to learn more about this service.', voice: 'en-US' },
        'ta-en': { srcLang: 'Tamil', tgtLang: 'English', src: 'வணக்கம், நாளை சந்திப்பை உறுதிப்படுத்த முடியுமா?', tgt: 'Hello, could you confirm tomorrow’s meeting?', voice: 'en-US' },
        'te-hi': { srcLang: 'Telugu', tgtLang: 'Hindi', src: 'నమస్కారం, మీతో మాట్లాడటం చాలా సంతోషంగా ఉంది.', tgt: 'नमस्ते, आपसे बात करके बहुत खुशी हुई।', voice: 'hi-IN' },
        'bn-hi': { srcLang: 'Bengali', tgtLang: 'Hindi', src: 'নমস্কার, আপনি কেমন আছেন?', tgt: 'नमस्ते, आप कैसे हैं?', voice: 'hi-IN' }
      };

      var activePairKey = 'hi-en';
      var pills = document.querySelectorAll('.lang-pill');
      for (var i = 0; i < pills.length; i++) {
        (function(pill) {
          pill.addEventListener('click', function() {
            for (var j = 0; j < pills.length; j++) pills[j].classList.remove('active');
            pill.classList.add('active');
            var key = pill.getAttribute('data-pair');
            if (pairs[key]) {
              activePairKey = key;
              var p = pairs[key];
              var srcLabel = document.getElementById('source-lang-label');
              var srcPhrase = document.getElementById('source-phrase');
              var tgtLabel = document.getElementById('target-lang-label');
              var tgtPhrase = document.getElementById('target-phrase');
              if (srcLabel) srcLabel.innerText = p.srcLang + ':';
              if (srcPhrase) srcPhrase.innerText = '"' + p.src + '"';
              if (tgtLabel) tgtLabel.innerText = p.tgtLang + ':';
              if (tgtPhrase) tgtPhrase.innerText = '"' + p.tgt + '"';
            }
          });
        })(pills[i]);
      }

      var audioBtn = document.getElementById('play-audio-btn');
      if (audioBtn) {
        audioBtn.addEventListener('click', function() {
          if ('speechSynthesis' in window) {
            var p = pairs[activePairKey];
            if (!p) return;
            window.speechSynthesis.cancel();
            var u = new SpeechSynthesisUtterance(p.tgt);
            u.lang = p.voice;
            u.rate = 0.95;
            var icon = document.getElementById('audio-icon');
            var text = document.getElementById('audio-btn-text');
            if (icon) icon.innerText = '🔊 Playing...';
            u.onend = function() {
              if (icon) icon.innerText = '🔊';
              if (text) text.innerText = 'Listen to Translated Audio';
            };
            window.speechSynthesis.speak(u);
          }
        });
      }
    })();
  </script>
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
