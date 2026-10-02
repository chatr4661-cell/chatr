/**
 * ENGINE: /city/
 * Purpose: Location-specific communication & local service demand
 */

import { APPROVED_CITIES, type PublicCityRecord } from '../../data/approved-public-data';
import { renderSeoHtml, type SeoTemplateProps } from '../../templates/layout';
import type { PageCandidate } from '../../quality/quality-gate';

export function generateCityPages(): Array<{ candidate: PageCandidate; html: string; relativePath: string }> {
  return APPROVED_CITIES.map((c) => {
    const slug = `city/${c.slug}`;
    const relativePath = `city/${c.slug}/index.html`;
    const canonicalUrl = `https://chatr.chat/${slug}`;
    const title = `Chatr in ${c.cityName}, ${c.state} — Local Business, Jobs & Communities`;
    const metaDescription = `Discover local businesses, verified hiring roles, and multilingual communication channels in ${c.cityName} (${c.state}). Connect directly with zero ad interference.`;
    const h1 = `Chatr Hub: ${c.cityName}, ${c.state}`;
    const intro = `Local communication hub for ${c.cityName}. Explore verified enterprises across ${c.businessHubs.join(', ')}, find local job openings, and converse across ${c.primaryLanguages.join(', ')} with built-in live translation.`;

    const bodyHtml = `
      <div class="data-card">
        <h3>${c.cityName} Regional Communication Profile</h3>
        <p><strong>State Jurisdiction:</strong> ${c.state}</p>
        <p><strong>Commonly Spoken Regional Languages:</strong> ${c.primaryLanguages.join(', ')}</p>
        <p><strong>Key Commercial &amp; Industrial Corridors:</strong> ${c.businessHubs.join(', ')}</p>
        <p><strong>Network Coverage:</strong> High-definition VoIP and WebRTC calling optimized for urban mobile data</p>
      </div>

      <h2>Linguistic &amp; Business Context in ${c.cityName}</h2>
      <p>${c.localDialectNotes}</p>
      <p>In high-density commercial hubs across ${c.businessHubs.join(', ')}, clear and uninterrupted communication is vital. Local enterprises, logistics dispatchers, and independent professionals in ${c.cityName} rely on Chatr to coordinate operations across multilingual workforces without language barriers or telecom connection drops.</p>

      <h2>Practical Local Use Cases in ${c.cityName}</h2>
      <ul>
        <li><strong>Cross-Regional Commerce:</strong> Conduct wholesale, distributor, and vendor negotiation calls between ${c.primaryLanguages.slice(0, 2).join(' and ')} with real-time speech translation.</li>
        <li><strong>Hyperlocal Hiring &amp; Field Dispatch:</strong> Recruit delivery executives, retail associates, and technicians with automated applicant screening prompts.</li>
        <li><strong>Verified Merchant Identification:</strong> Confirm the verified trust badge of local vendors in ${c.cityName} before transferring payments or dispatching shipments.</li>
        <li><strong>Community &amp; Neighborhood Circles:</strong> Create local neighborhood interest groups, parent-teacher forums, and professional circles without sharing personal phone numbers publicly.</li>
      </ul>

      <h2>Network Resilience &amp; Carrier Optimization</h2>
      <p>Mobile networks in dense Indian urban centers often experience micro-outages and variable signal latency during peak evening transit hours. Chatr incorporates adaptive jitter buffering and dynamic bitrate scaling down to 12 kbps, allowing voice calls and urgent messages to complete without robotic clipping across major telecom networks including Jio, Airtel, and Vi.</p>

      <h2>Local Data Residency &amp; Compliance</h2>
      <p>All telecommunications routing and messaging services originating within India comply with Indian digital data protection standards, ensuring user privacy, end-to-end transport encryption, and regulatory transparency across municipal jurisdictions.</p>

      <h2>Getting Started with Chatr in ${c.cityName}</h2>
      <p>Getting started on Chatr requires no credit cards, passwords, or complex installations. Simply enter your mobile telephone number to receive an instant verification code, set up your profile name, and connect with friends, family, and businesses across ${c.cityName} immediately.</p>
    `;

    const bodyText = `${h1}. ${intro}. Regional Profile: State of ${c.state}. Spoken Languages: ${c.primaryLanguages.join(', ')}. Key Commercial Corridors: ${c.businessHubs.join(', ')}. Network Coverage: High-definition VoIP and WebRTC calling optimized for urban mobile data. Linguistic and Business Context in ${c.cityName}: ${c.localDialectNotes}. In high-density commercial hubs across ${c.businessHubs.join(', ')}, clear and uninterrupted communication is vital. Local enterprises, logistics dispatchers, and independent professionals in ${c.cityName} rely on Chatr to coordinate operations across multilingual workforces without language barriers or telecom connection drops. Practical Local Use Cases in ${c.cityName}: Cross-Regional Commerce with speech translation between ${c.primaryLanguages.slice(0, 2).join(' and ')}. Hyperlocal Hiring and Field Dispatch with automated applicant screening prompts. Verified Merchant Identification confirming trust badges before transferring payments. Community and Neighborhood Circles without sharing personal phone numbers. Network Resilience and Carrier Optimization: Mobile networks in dense urban centers experience signal latency during peak hours. Chatr incorporates adaptive jitter buffering and dynamic bitrate scaling down to 12 kbps, allowing calls to complete across major telecom networks. Local Data Residency and Compliance: All telecommunications routing and messaging services comply with Indian digital data protection standards, ensuring user privacy and regulatory transparency across municipal jurisdictions. Getting Started with Chatr in ${c.cityName}: Enter your mobile telephone number to receive an instant verification code, set up your profile name, and connect with friends, family, and businesses across ${c.cityName} immediately.`;

    const schemaJson = {
      '@context': 'https://schema.org',
      '@type': 'Place',
      name: c.cityName,
      address: {
        '@type': 'PostalAddress',
        addressLocality: c.cityName,
        addressRegion: c.state,
        addressCountry: 'IN'
      },
      description: metaDescription
    };

    const candidate: PageCandidate = {
      slug,
      demand: {
        primaryKeyword: `chatr in ${c.cityName.toLowerCase()}`,
        monthlySearchVolumeMin: 180,
        searchIntent: 'informational',
        queryVariations: [
          `local services ${c.cityName.toLowerCase()} chat`,
          `jobs in ${c.cityName.toLowerCase()} chatr`,
          `connect with businesses in ${c.cityName.toLowerCase()}`
        ]
      },
      evidence: {
        entityType: 'city',
        dataPoints: {
          city: c.cityName,
          state: c.state,
          languages: c.primaryLanguages,
          hubs: c.businessHubs
        },
        provenance: c.provenance
      },
      metadata: {
        title,
        description: metaDescription,
        canonicalUrl,
        h1,
        internalLinksCount: 4,
        coreCtaUrl: `/auth?ref=seo_city_${c.slug}`,
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
        { label: 'City Hubs', url: '/city' },
        { label: c.cityName, url: `/${slug}` }
      ],
      bodyHtml,
      schemaJson,
      relatedLinks: [
        { label: `Jobs in ${c.cityName}`, url: '/jobs', description: `Local hiring and roles in ${c.cityName}` },
        { label: 'Live Translation Hub', url: '/translate/hindi-to-tamil', description: 'Multilingual calling across states' },
        { label: 'Talentxcel Official Account', url: '/business/talentxcel-official', description: 'Verified enterprise hiring on Chatr' }
      ],
      ctaHeadline: `Connect Locally in ${c.cityName}`,
      ctaSubtext: 'Use Chatr on your phone for private calls, neighborhood communities, and verified business contacts.',
      ctaButtonText: `Open Chatr in ${c.cityName} →`,
      ctaTargetUrl: `/auth?ref=seo_city_${c.slug}`
    };

    return {
      candidate,
      html: renderSeoHtml(props),
      relativePath
    };
  });
}
