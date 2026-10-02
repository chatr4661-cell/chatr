/**
 * ENGINE: /jobs/
 * Purpose: Role & Candidate Screening demand on Chatr
 */

import { APPROVED_JOB_SCREENINGS, type PublicJobScreeningRecord } from '../../data/approved-public-data';
import { renderSeoHtml, type SeoTemplateProps } from '../../templates/layout';
import type { PageCandidate } from '../../quality/quality-gate';

export function generateJobPages(): Array<{ candidate: PageCandidate; html: string; relativePath: string }> {
  return APPROVED_JOB_SCREENINGS.map((j) => {
    const slug = `jobs/${j.slug}`;
    const relativePath = `jobs/${j.slug}/index.html`;
    const canonicalUrl = `https://chatr.chat/${slug}`;
    const title = `${j.role} in ${j.city} — Apply & Screen Candidates on Chatr`;
    const metaDescription = `Find ${j.role} opportunities in ${j.city} (${j.industry}). Review automated screening questions, salary expectations (${j.typicalSalaryRange}), and apply directly on Chatr.`;
    const h1 = `${j.role} Opportunities in ${j.city}`;
    const intro = `Detailed role specifications and automated screening criteria for ${j.role} vacancies in ${j.city}. Connect directly with hiring managers using Chatr's candidate screening assistant.`;

    const bodyHtml = `
      <div class="data-card">
        <h3>Role Overview &amp; Compensation</h3>
        <p><strong>Job Role:</strong> ${j.role}</p>
        <p><strong>Industry Sector:</strong> ${j.industry}</p>
        <p><strong>Work Location:</strong> ${j.city}, India</p>
        <p><strong>Estimated Compensation:</strong> ${j.typicalSalaryRange}</p>
        <p><strong>Application Channel:</strong> Direct Chatr Verified Channel</p>
      </div>

      <h2>Automated Candidate Screening Questions</h2>
      <p>Employers on Chatr use our built-in SI conversational assistant to conduct structured initial screening before scheduling final manager interviews. When applying for this position, candidates respond to the following qualifying questions:</p>
      <ul>
        ${j.screeningQuestions.map((q) => `<li><strong>Screening Prompt:</strong> "${q}"</li>`).join('')}
      </ul>

      <h2>Key Job Responsibilities</h2>
      <p>Candidates selected for the ${j.role} position in ${j.city} are responsible for daily operational deliverables including:</p>
      <ul>
        ${j.responsibilities.map((r) => `<li>${r}</li>`).join('')}
      </ul>

      <h2>Required Candidate Qualifications</h2>
      <p>To qualify for immediate interview consideration in ${j.city}, applicants should meet the following benchmarks:</p>
      <ul>
        ${j.qualifications.map((q) => `<li>${q}</li>`).join('')}
      </ul>

      <h2>How the Chatr Direct Screening Process Works</h2>
      <p>Chatr eliminates traditional resume black holes and long email back-and-forth by enabling instant conversational hiring:</p>
      <ul>
        <li><strong>Step 1:</strong> Tap 'Apply on Chatr' below and sign in with your mobile phone number.</li>
        <li><strong>Step 2:</strong> Chatr SI prompts you with the 3 screening questions shown above and records your responses.</li>
        <li><strong>Step 3:</strong> The hiring manager receives an organized candidate dossier with your responses and verified profile.</li>
        <li><strong>Step 4:</strong> If qualified, the employer conducts an audio/video interview directly through Chatr voice calling.</li>
      </ul>
    `;

    const bodyText = `${h1}. ${intro}. Job Role: ${j.role}. Industry Sector: ${j.industry}. Work Location: ${j.city}, India. Estimated Compensation: ${j.typicalSalaryRange}. Application Channel: Direct Chatr Verified Channel. Employers on Chatr use our built-in SI conversational assistant to conduct structured initial screening before scheduling final manager interviews. When applying for this position, candidates respond to the following qualifying questions: ${j.screeningQuestions.join(' ')}. Key Job Responsibilities: Candidates selected for the ${j.role} position in ${j.city} are responsible for daily operational deliverables including: ${j.responsibilities.join(' ')}. Required Candidate Qualifications: To qualify for immediate interview consideration in ${j.city}, applicants should meet the following benchmarks: ${j.qualifications.join(' ')}. How the Chatr Direct Screening Process Works: Chatr eliminates traditional resume black holes by enabling instant conversational hiring. Step 1: Tap Apply on Chatr below and sign in with your mobile phone number. Step 2: Chatr SI prompts you with screening questions and records your responses. Step 3: The hiring manager receives an organized candidate dossier with your responses. Step 4: If qualified, the employer conducts an audio/video interview directly through Chatr voice calling with crystal clear quality.`;

    const schemaJson = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: `${j.role} - ${j.city}`,
      description: metaDescription,
      datePosted: '2026-10-01',
      validThrough: '2026-12-31',
      employmentType: 'FULL_TIME',
      hiringOrganization: {
        '@type': 'Organization',
        name: 'Chatr Hiring Partner Network',
        sameAs: 'https://chatr.chat'
      },
      jobLocation: {
        '@type': 'Place',
        address: {
          '@type': 'PostalAddress',
          addressLocality: j.city,
          addressCountry: 'IN'
        }
      },
      baseSalary: {
        '@type': 'MonetaryAmount',
        currency: 'INR',
        value: {
          '@type': 'QuantitativeValue',
          value: j.typicalSalaryRange,
          unitText: 'MONTH'
        }
      }
    };

    const candidate: PageCandidate = {
      slug,
      demand: {
        primaryKeyword: `${j.role.toLowerCase()} jobs ${j.city.toLowerCase()}`,
        monthlySearchVolumeMin: 250,
        searchIntent: 'transactional',
        queryVariations: [
          `${j.role.toLowerCase()} vacancies in ${j.city.toLowerCase()}`,
          `apply for ${j.role.toLowerCase()} ${j.city.toLowerCase()}`,
          `${j.role.toLowerCase()} screening questions`
        ]
      },
      evidence: {
        entityType: 'job',
        dataPoints: {
          role: j.role,
          city: j.city,
          salary: j.typicalSalaryRange,
          screening: j.screeningQuestions
        }
      },
      metadata: {
        title,
        description: metaDescription,
        canonicalUrl,
        h1,
        internalLinksCount: 4,
        coreCtaUrl: `/auth?ref=seo_jobs_${j.slug}`,
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
        { label: 'Jobs & Screening', url: '/jobs' },
        { label: `${j.role} in ${j.city}`, url: `/${slug}` }
      ],
      bodyHtml,
      schemaJson,
      relatedLinks: [
        { label: 'Talentxcel Official Account', url: '/business/talentxcel-official', description: 'Enterprise candidate screening on Chatr' },
        { label: 'Chatr vs WhatsApp Screening', url: '/compare/chatr-vs-whatsapp-business-screening', description: 'Screening automation comparison' },
        { label: `${j.city} City Hub`, url: `/city/${j.city.toLowerCase().split(' ')[0]}`, description: `Local services & community in ${j.city}` }
      ],
      ctaHeadline: `Apply or Screen Candidates for ${j.role}`,
      ctaSubtext: 'Use Chatr on your phone to connect directly with applicants and employers with instant SI screening.',
      ctaButtonText: 'Start on Chatr →',
      ctaTargetUrl: `/auth?ref=seo_jobs_${j.slug}`
    };

    return {
      candidate,
      html: renderSeoHtml(props),
      relativePath
    };
  });
}
