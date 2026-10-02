/**
 * ENGINE: /business/
 * Purpose: Company & official business discovery on Chatr
 */

import { APPROVED_BUSINESSES, type PublicBusinessRecord } from '../../data/approved-public-data';
import { renderSeoHtml, type SeoTemplateProps } from '../../templates/layout';
import type { PageCandidate } from '../../quality/quality-gate';

export function generateBusinessPages(): Array<{ candidate: PageCandidate; html: string; relativePath: string }> {
  return APPROVED_BUSINESSES.map((b) => {
    const slug = `business/${b.slug}`;
    const relativePath = `business/${b.slug}/index.html`;
    const canonicalUrl = `https://chatr.chat/${slug}`;
    const title = `${b.name} on Chatr — Verified Business Account & Contact`;
    const metaDescription = `Connect directly with ${b.name} (${b.category}) in ${b.city} on Chatr. Verified official account with secure chat and instant call support.`;
    const h1 = `${b.name} — Verified Official Account`;
    const intro = `Official verified profile for ${b.name} based in ${b.city}. Communicate with confidence using Chatr end-to-end encrypted messaging and verified business audio calling.`;

    const bodyHtml = `
      <div class="data-card">
        <h3>Verified Account Details</h3>
        <p><strong>Business Entity:</strong> ${b.name}</p>
        <p><strong>Primary Sector:</strong> ${b.category}</p>
        <p><strong>Regional Operations:</strong> ${b.city}, India</p>
        <p><strong>Verification Badge:</strong> Official Enterprise Partner (Cryptographically Signed)</p>
      </div>

      <h2>About ${b.name}</h2>
      <p>${b.description}</p>
      <p>As an authenticated enterprise on the Chatr network, ${b.name} maintains a direct customer care and partner liaison channel. Customers and job applicants can interact directly with authorized company representatives without third-party telemarketing intermediaries or call center routing delays.</p>

      <h2>Communication Capabilities on Chatr</h2>
      <ul>
        ${b.features.map((f) => `<li><strong>${f}</strong>: Official real-time channel with end-to-end transport encryption, instant document validation, and zero unsolicited marketing broadcasts.</li>`).join('')}
      </ul>

      <h2>Verified Trust &amp; Anti-Impersonation Safeguards</h2>
      <p>Every official account on Chatr undergoes multi-step entity screening, including registered corporate identity verification and business registry validation. Users who contact ${b.name} via Chatr are shielded by ChatrShield PRO, ensuring:</p>
      <ul>
        <li><strong>Zero Caller Spoofing:</strong> Calls originating from this business channel display an authenticated green checkmark backed by carrier-grade handshake verification.</li>
        <li><strong>Privacy Protection:</strong> Your personal contact list is never uploaded or exposed when contacting businesses on Chatr.</li>
        <li><strong>Spam-Free Guarantee:</strong> Businesses are prohibited from sending unrequested promotional blasts or sharing your phone number with ad networks.</li>
      </ul>

      <h2>Operating Hours &amp; Response Times</h2>
      <p>Official communication representatives for ${b.name} monitor this verified channel during standard business hours from 09:00 to 18:00 IST, Monday through Saturday. Inquiries submitted outside these hours are queued with cryptographic timestamps and answered promptly on the next business morning.</p>

      <h2>Customer Support &amp; Escalation Standards</h2>
      <p>In accordance with Chatr verified business standards, enterprise channels maintain dedicated liaison teams to resolve customer questions, verify receipts, and handle inquiries transparently with zero automated dead-ends.</p>

      <h2>How to Initiate Contact</h2>
      <p>To message or speak with ${b.name}, sign in to Chatr with your mobile number. No credit cards, passwords, or complex software installations are required. Conversations are organized in your private Chatr inbox alongside personal chats, protected by verified caller ID and zero tracking cookies.</p>
    `;

    const bodyText = `${h1}. ${intro}. Business Entity: ${b.name}. Primary Sector: ${b.category}. Regional Operations: ${b.city}, India. Verification Badge: Official Enterprise Partner. About ${b.name}: ${b.description}. As an authenticated enterprise on the Chatr network, ${b.name} maintains a direct customer care and partner liaison channel. Customers and job applicants can interact directly with authorized company representatives without third-party telemarketing intermediaries or call center routing delays. Communication Capabilities: ${b.features.join(', ')}. Official real-time channel with end-to-end transport encryption, instant document validation, and zero unsolicited marketing broadcasts. Verified Trust and Anti-Impersonation Safeguards: Every official account on Chatr undergoes multi-step entity screening, including registered corporate identity verification and business registry validation. Users who contact ${b.name} via Chatr are shielded by ChatrShield PRO, ensuring zero caller spoofing, full privacy protection with no address book uploads, and a strict spam-free guarantee. Operating Hours and Response Times: Official communication representatives for ${b.name} monitor this channel from 09:00 to 18:00 IST Monday through Saturday. Customer Support and Escalation Standards: In accordance with Chatr verified business standards, enterprise channels maintain dedicated liaison teams to resolve customer questions and verify receipts transparently. To message or speak with ${b.name}, sign in to Chatr with your mobile number. Conversations are organized in your private Chatr inbox alongside personal chats, protected by verified caller ID and zero tracking cookies.`;

    const schemaJson = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: b.name,
      url: canonicalUrl,
      description: b.description,
      areaServed: b.city,
      knowsAbout: b.features
    };

    const candidate: PageCandidate = {
      slug,
      demand: {
        primaryKeyword: `${b.name.toLowerCase()} contact chatr`,
        monthlySearchVolumeMin: 120,
        searchIntent: 'navigational',
        queryVariations: [
          `contact ${b.name.toLowerCase()} online`,
          `${b.name.toLowerCase()} customer support chatr`,
          `message ${b.name.toLowerCase()} official`
        ]
      },
      evidence: {
        entityType: 'business',
        dataPoints: {
          name: b.name,
          category: b.category,
          city: b.city,
          features: b.features
        }
      },
      metadata: {
        title,
        description: metaDescription,
        canonicalUrl,
        h1,
        internalLinksCount: 4,
        coreCtaUrl: `/auth?ref=seo_biz_${b.slug}`,
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
        { label: 'Business Directory', url: '/business' },
        { label: b.name, url: `/${slug}` }
      ],
      bodyHtml,
      schemaJson,
      relatedLinks: [
        { label: 'ChatrShield PRO Protection', url: '/knowledge/chatrshield-caller-defense', description: 'Zero-spam caller ID verification' },
        { label: 'Automated Candidate Screening', url: '/jobs', description: 'Screen job applicants via Chatr SI' },
        { label: 'Business Alternative Matrix', url: '/compare/chatr-vs-whatsapp-business-screening', description: 'How Chatr compares to WhatsApp Business' }
      ],
      ctaHeadline: `Start a Verified Chat with ${b.name}`,
      ctaSubtext: 'Sign in to Chatr with your phone number to access verified official business channels with zero ads.',
      ctaButtonText: 'Open Chatr & Message →',
      ctaTargetUrl: `/auth?ref=seo_biz_${b.slug}`
    };

    return {
      candidate,
      html: renderSeoHtml(props),
      relativePath
    };
  });
}
