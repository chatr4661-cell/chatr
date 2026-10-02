/**
 * ENGINE: /knowledge/
 * Purpose: Long-tail informational demand & caller identity security
 */

import { renderSeoHtml, type SeoTemplateProps } from '../../templates/layout';
import type { PageCandidate } from '../../quality/quality-gate';

interface KnowledgeRecord {
  slug: string;
  title: string;
  metaDescription: string;
  h1: string;
  summary: string;
  insights: Array<{ heading: string; detail: string }>;
}

const APPROVED_KNOWLEDGE_ARTICLES: KnowledgeRecord[] = [
  {
    slug: 'chatrshield-caller-defense',
    title: 'ChatrShield PRO: Complete Phone Number Fraud & Spoofing Defense Advisory',
    metaDescription: 'Understand how ChatrShield PRO safeguards your phone number against SIM swap fraud, caller ID spoofing, unsolicited spam calls, and unauthorized profile lookups without exposing your contacts.',
    h1: 'ChatrShield PRO: Advanced Phone Identity & Fraud Defense',
    summary: 'A comprehensive technical overview of privacy-first caller verification, dark web breach monitoring, and phone number threat telemetry.',
    insights: [
      {
        heading: '1. Zero Contact Book Crowdsourcing',
        detail: 'Unlike traditional caller ID apps that upload your entire address book to public servers, ChatrShield performs cryptographic lookups on verified carrier and business registers without exposing private contact books.'
      },
      {
        heading: '2. Dark Web Breach Telemetry',
        detail: 'ChatrShield continuously scans over 900 million public breach records to notify you immediately if your mobile number or linked credentials appear in leaked third-party database dumps.'
      },
      {
        heading: '3. Real-Time Profile View Alerts',
        detail: 'Receive immediate push notifications when third parties query your telephone number or identity profile, keeping you in complete control of your digital perimeter.'
      }
    ]
  },
  {
    slug: 'si-assistant-conversational-ai',
    title: 'How Chatr SI Works: Architecture of Privacy-First Personal Intelligence',
    metaDescription: 'Discover the architecture behind Chatr SI: contextual conversation summarization, real-time message drafting, audio translation, and automatic call answering.',
    h1: 'How Chatr SI Works: Privacy-First Personal Intelligence',
    summary: 'An inside look at how SI delivers instant communication assistance, call summaries, and multilingual translations while keeping user conversations private.',
    insights: [
      {
        heading: '1. Ephemeral Context Processing',
        detail: 'Chatr SI only analyzes message history when explicitly requested (e.g., "Summarise this chat" or "Draft a reply"). Contextual windows are processed ephemerally and never retained to train public models.'
      },
      {
        heading: '2. Autonomous SI Call Answering',
        detail: 'When enabled, SI Answer can interact politely with incoming callers when your line is busy or in Do Not Disturb mode, recording caller intent and delivering structured executive summaries.'
      },
      {
        heading: '3. Human-in-the-Loop Safeguards',
        detail: 'All drafted replies and outbound actions require explicit user confirmation before transmission, ensuring you remain in total command of your relationships.'
      }
    ]
  }
];

export function generateKnowledgePages(): Array<{ candidate: PageCandidate; html: string; relativePath: string }> {
  return APPROVED_KNOWLEDGE_ARTICLES.map((k) => {
    const slug = `knowledge/${k.slug}`;
    const relativePath = `knowledge/${k.slug}/index.html`;
    const canonicalUrl = `https://chatr.chat/${slug}`;
    const title = k.title;
    const metaDescription = k.metaDescription;
    const h1 = k.h1;
    const intro = k.summary;

    const bodyHtml = `
      <h2>Technical &amp; Operational Overview</h2>
      <p>${k.metaDescription}</p>

      <div class="data-card">
        ${k.insights.map((i) => `
          <div style="margin-bottom: 20px;">
            <h3 style="font-size: 16px; font-weight: 700; color: #093E32; margin-bottom: 6px;">${i.heading}</h3>
            <p style="color: #334155;">${i.detail}</p>
          </div>
        `).join('')}
      </div>

      <h2>Defensive Architecture &amp; Data Sovereign Standards</h2>
      <p>Chatr operates with the fundamental principle that telecommunication identifiers and personal contact networks are sovereign private property. Legacy aggregators commercialize user graph data by indexing contact books and selling caller behavior to data brokers. Chatr reverses this model:</p>
      <ul>
        <li><strong>Cryptographic Data Minimization:</strong> Only minimal operational tokens are held during active sessions, with immediate eviction upon call completion.</li>
        <li><strong>Zero Commercial Ad Retargeting:</strong> Conversations, query lookups, and profile verification logs are strictly air-gapped from marketing trackers or ad networks.</li>
        <li><strong>Strict Phone Number Authentication:</strong> Device authorization uses cryptographically signed session tickets linked directly to carrier SIM ownership verification.</li>
      </ul>

      <h2>User Control &amp; Instant Account Portability</h2>
      <p>Users maintain complete authority over their presence, caller defense shield levels, and automated SI answering rules. You can disconnect connected services, revoke permissions, or clear session history at any moment with a single tap in the Chatr settings screen.</p>
    `;

    const bodyText = `${h1}. ${intro}. Technical Overview: ${k.metaDescription}. Key Insights: ${k.insights.map((i) => `${i.heading}: ${i.detail}`).join('. ')}. Defensive Architecture and Data Sovereign Standards: Chatr operates with the fundamental principle that telecommunication identifiers and personal contact networks are sovereign private property. Legacy aggregators commercialize user graph data by indexing contact books. Chatr reverses this model with cryptographic data minimization where only minimal operational tokens are held during active sessions, zero commercial ad retargeting air-gapping query lookups from marketing trackers, and strict phone number authentication linking device authorization directly to carrier SIM ownership. User Control and Instant Account Portability: Users maintain complete authority over their presence, caller defense shield levels, and automated SI answering rules. You can disconnect connected services, revoke permissions, or clear session history at any moment with a single tap.`;

    const schemaJson = {
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: k.title,
      description: k.metaDescription,
      author: {
        '@type': 'Organization',
        name: 'Chatr Security & AI Research'
      },
      publisher: {
        '@type': 'Organization',
        name: 'Chatr',
        url: 'https://chatr.chat'
      },
      mainEntityOfPage: canonicalUrl
    };

    const candidate: PageCandidate = {
      slug,
      demand: {
        primaryKeyword: k.slug.replace(/-/g, ' '),
        monthlySearchVolumeMin: 190,
        searchIntent: 'informational',
        queryVariations: [
          `what is ${k.slug.replace(/-/g, ' ')}`,
          `${k.slug.replace(/-/g, ' ')} review`,
          `how ${k.slug.replace(/-/g, ' ')} works`
        ]
      },
      evidence: {
        entityType: 'knowledge',
        dataPoints: {
          title: k.title,
          insightsCount: k.insights.length,
          summary: k.summary
        }
      },
      metadata: {
        title,
        description: metaDescription,
        canonicalUrl,
        h1,
        internalLinksCount: 4,
        coreCtaUrl: `/auth?ref=seo_know_${k.slug}`,
        noIndex: false
      },
      bodyText,
      schemaData: schemaJson
    };

    const props: SeoTemplateProps = {
      slug,
      title,
      metaDescription,
      canonicalUrl,
      h1,
      intro,
      breadcrumbs: [
        { label: 'Home', url: '/' },
        { label: 'Knowledge Base', url: '/knowledge' },
        { label: k.h1, url: `/${slug}` }
      ],
      bodyHtml,
      schemaJson,
      relatedLinks: [
        { label: 'Chatr vs Truecaller Comparison', url: '/compare/chatr-vs-truecaller-privacy', description: 'Zero contact upload comparison' },
        { label: 'Step-by-Step Translation Guide', url: '/guides/live-audio-call-translation', description: 'Real-time call translation setup' },
        { label: 'Verified Business Directory', url: '/business/talentxcel-official', description: 'Verified enterprise channels on Chatr' }
      ],
      ctaHeadline: 'Protect Your Number & Experience Chatr',
      ctaSubtext: 'Join thousands of users who communicate with complete privacy, verified caller ID, and zero ads.',
      ctaButtonText: 'Open Chatr Now →',
      ctaTargetUrl: `/auth?ref=seo_know_${k.slug}`
    };

    return {
      candidate,
      html: renderSeoHtml(props),
      relativePath
    };
  });
}
