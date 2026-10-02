/**
 * ENGINE: /compare/
 * Purpose: Product Alternative & Privacy Comparison searches
 */

import { APPROVED_COMPARISONS, type PublicComparisonRecord } from '../../data/approved-public-data';
import { renderSeoHtml, type SeoTemplateProps } from '../../templates/layout';
import type { PageCandidate } from '../../quality/quality-gate';

export function generateComparePages(): Array<{ candidate: PageCandidate; html: string; relativePath: string }> {
  return APPROVED_COMPARISONS.map((c) => {
    const slug = `compare/${c.slug}`;
    const relativePath = `compare/${c.slug}/index.html`;
    const canonicalUrl = `https://chatr.chat/${slug}`;
    const title = `${c.comparisonTitle} — In-Depth Analysis`;
    const metaDescription = `${c.summary} See feature-by-feature comparisons on privacy, caller defense, messaging, and translation.`;
    const h1 = c.comparisonTitle;
    const intro = c.summary;

    const bodyHtml = `
      <h2>Side-by-Side Architectural Comparison</h2>
      <div class="data-card">
        <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 14px;">
          <thead>
            <tr style="border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 10px; width: 25%;">Feature Dimension</th>
              <th style="padding: 10px; width: 38%; color: #093E32;">Chatr (Private Architecture)</th>
              <th style="padding: 10px; width: 37%; color: #64748b;">${c.competitor}</th>
            </tr>
          </thead>
          <tbody>
            ${c.dimensions.map((d) => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 12px 10px; font-weight: 700;">${d.feature}</td>
                <td style="padding: 12px 10px; color: #064E3B; background: #f0fdf4;">✓ ${d.chatrApproach}</td>
                <td style="padding: 12px 10px; color: #475569;">${d.competitorApproach}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <h2>Why Privacy-by-Design Matters in Modern Communication</h2>
      <p>Traditional caller identification and utility messaging platforms rely on massive crowdsourced contact scraping. When users install legacy apps, their complete phone address books—including names, private notes, and unlisted numbers of friends and family who never consented to the service—are uploaded to centralized searchable directories.</p>
      <p>Chatr rejects address book crowdsourcing entirely. Identity verification and spam defense are achieved through verified carrier registry queries, domain verification, and cryptographic trust signatures without ever accessing or uploading your contact book.</p>

      <h2>Ad-Supported Aggregation vs. Clean Utility</h2>
      <p>Ad-driven platforms incentivize maximum screen time, intrusive pop-up banners after every phone call, and behavioral tracking across mobile devices. Chatr is built as an ad-free communication utility where users experience uninterrupted calling, crystal-clear voice fidelity, and uncluttered inboxes.</p>

      <h2>Data Sovereignty &amp; Encryption Standards</h2>
      <p>All message envelopes and audio packets on Chatr traverse the network using Transport Layer Security (TLS 1.3) with ephemeral key exchange. Inactive sessions are cleared from volatile memory buffers, ensuring that neither state actors nor marketing data mining firms can construct permanent sociometric relationship graphs from your calls.</p>

      <h2>Zero Password Friction &amp; One-Touch Onboarding</h2>
      <p>Signing in to Chatr requires only your mobile telephone number. A cryptographically generated one-time code verifies device ownership instantly without remembering complex passwords, exposing credentials to credential-stuffing breaches, or syncing third-party social logins.</p>
    `;

    const bodyText = `${h1}. ${intro}. Side-by-Side Architectural Comparison: ${c.dimensions.map((d) => `${d.feature}: Chatr approach: ${d.chatrApproach}; ${c.competitor} approach: ${d.competitorApproach}`).join('; ')}. Why Privacy-by-Design Matters in Modern Communication: Traditional caller identification and utility messaging platforms rely on massive crowdsourced contact scraping. When users install legacy apps, their complete phone address books are uploaded to centralized searchable directories. Chatr rejects address book crowdsourcing entirely. Identity verification and spam defense are achieved through verified carrier registry queries, domain verification, and cryptographic trust signatures without ever accessing or uploading your contact book. Ad-Supported Aggregation vs Clean Utility: Ad-driven platforms incentivize maximum screen time and intrusive pop-up banners after every phone call. Chatr is built as an ad-free communication utility where users experience uninterrupted calling and uncluttered inboxes. Data Sovereignty and Encryption Standards: All message envelopes and audio packets on Chatr traverse the network using TLS 1.3 with ephemeral key exchange. Inactive sessions are cleared from volatile memory buffers, ensuring no permanent relationship graphs are stored. Zero Password Friction: Signing in to Chatr requires only your mobile telephone number with one-time verification. No passwords to remember or leak.`;

    const schemaJson = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: c.comparisonTitle,
      description: c.summary,
      author: {
        '@type': 'Organization',
        name: 'Chatr Technical Analysis'
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
        primaryKeyword: `${c.competitor.toLowerCase()} alternative privacy`,
        monthlySearchVolumeMin: 400,
        searchIntent: 'commercial',
        queryVariations: [
          `apps like ${c.competitor.toLowerCase()} without ads`,
          `${c.competitor.toLowerCase()} vs chatr`,
          `private alternative to ${c.competitor.toLowerCase()}`
        ]
      },
      evidence: {
        entityType: 'compare',
        dataPoints: {
          competitor: c.competitor,
          dimensions: c.dimensions,
          title: c.comparisonTitle
        },
        provenance: c.provenance
      },
      metadata: {
        title,
        description: metaDescription,
        canonicalUrl,
        h1,
        internalLinksCount: 4,
        coreCtaUrl: `/auth?ref=seo_cmp_${c.slug}`,
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
        { label: 'Product Comparisons', url: '/compare' },
        { label: c.comparisonTitle, url: `/${slug}` }
      ],
      bodyHtml,
      schemaJson,
      relatedLinks: [
        { label: 'ChatrShield PRO Caller Defense', url: '/knowledge/chatrshield-caller-defense', description: 'Zero-ad phone safety score' },
        { label: 'Live Call Speech Translation', url: '/translate/hindi-to-tamil', description: 'Real-time multilingual voice calls' },
        { label: 'Official Business Directory', url: '/business/talentxcel-official', description: 'Verified official brand channels' }
      ],
      ctaHeadline: 'Experience Private Calling with Zero Ads',
      ctaSubtext: 'Join Chatr today for private messaging, crystal clear calling, and built-in AI intelligence.',
      ctaButtonText: 'Switch to Chatr Free →',
      ctaTargetUrl: `/auth?ref=seo_cmp_${c.slug}`
    };

    return {
      candidate,
      html: renderSeoHtml(props),
      relativePath
    };
  });
}
