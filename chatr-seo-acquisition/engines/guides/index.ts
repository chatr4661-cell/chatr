/**
 * ENGINE: /guides/
 * Purpose: High-volume communication how-to & workflow searches
 */

import { renderSeoHtml, type SeoTemplateProps } from '../../templates/layout';
import type { PageCandidate } from '../../quality/quality-gate';

interface GuideRecord {
  slug: string;
  title: string;
  metaDescription: string;
  h1: string;
  steps: Array<{ title: string; desc: string }>;
  faqs: Array<{ question: string; answer: string }>;
}

const APPROVED_GUIDES: GuideRecord[] = [
  {
    slug: 'live-audio-call-translation',
    title: 'How to Live-Translate Audio Calls in Real Time — Chatr Step-by-Step Guide',
    metaDescription: 'Step-by-step tutorial on translating live phone calls across Indian languages in real time. Learn how to activate speech captions, translated audio, and dial multilingual contacts.',
    h1: 'How to Live-Translate Audio Calls in Real Time',
    steps: [
      { title: '1. Initiate Your Call on Chatr', desc: 'Open Chatr, choose any contact from your phone book, and tap the voice or video call button.' },
      { title: '2. Tap the SI Translate Button', desc: 'During the call, press the SI Translate icon on the active call screen to open the language selector.' },
      { title: '3. Select Source and Target Languages', desc: 'Choose the language you are speaking (e.g., Hindi) and the language your contact understands (e.g., Tamil).' },
      { title: '4. Speak Naturally', desc: 'Chatr converts your speech to translated audio output and live on-screen text captions with less than 300ms latency.' }
    ],
    faqs: [
      {
        question: 'Does the caller need to download a separate translation tool?',
        answer: 'No. Both callers converse directly through Chatr. The translation engine runs seamlessly inside the voice call stream.'
      },
      {
        question: 'Are call audio streams recorded or saved during translation?',
        answer: 'No. Speech-to-speech translation is processed ephemeral in memory during the live call session and is not stored on Chatr servers.'
      }
    ]
  },
  {
    slug: 'automate-candidate-screening-interviews',
    title: 'How to Automate Candidate Screening on Chat — Step-by-Step HR Guide',
    metaDescription: 'Learn how recruiters and hiring managers use Chatr SI to automate initial applicant screening interviews, evaluate qualifications, and receive candidate summaries.',
    h1: 'How to Automate Candidate Screening on Chat',
    steps: [
      { title: '1. Configure Screening Prompts', desc: 'Set up 3 to 5 core qualifying questions covering driving license status, location availability, or technical tools.' },
      { title: '2. Share Your Verified Chatr Channel Link', desc: 'Include your verified official Chatr hiring link in your job postings across LinkedIn, job portals, or campus boards.' },
      { title: '3. SI Conducts First-Touch Q&A', desc: 'When candidates message your verified account, Chatr SI asks your structured screening questions and collects verified responses.' },
      { title: '4. Receive Instant Executive Summaries', desc: 'Chatr summarizes candidate answers, scores qualification alignment, and notifies your hiring manager.' }
    ],
    faqs: [
      {
        question: 'Can human recruiters take over the conversation at any moment?',
        answer: 'Yes. Recruiters can step into the chat instantly, initiate a verified audio call, or schedule a formal interview.'
      },
      {
        question: 'Is there a limit on how many applicants can be screened concurrently?',
        answer: 'No. Chatr handles concurrent candidate screening queues without per-conversation throttling.'
      }
    ]
  }
];

export function generateGuidePages(): Array<{ candidate: PageCandidate; html: string; relativePath: string }> {
  return APPROVED_GUIDES.map((g) => {
    const slug = `guides/${g.slug}`;
    const relativePath = `guides/${g.slug}/index.html`;
    const canonicalUrl = `https://chatr.chat/${slug}`;
    const title = g.title;
    const metaDescription = g.metaDescription;
    const h1 = g.h1;
    const intro = g.metaDescription;

    const bodyHtml = `
      <h2>Step-by-Step Walkthrough</h2>
      <div class="data-card">
        <ol style="margin-left: 20px;">
          ${g.steps.map((s) => `
            <li style="margin-bottom: 16px;">
              <h3 style="font-size: 16px; font-weight: 700; color: #093E32;">${s.title}</h3>
              <p style="margin-top: 4px; color: #334155;">${s.desc}</p>
            </li>
          `).join('')}
        </ol>
      </div>

      <h2>Frequently Asked Questions</h2>
      <div class="data-card">
        ${g.faqs.map((f) => `
          <div style="margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
            <p><strong>Q: ${f.question}</strong></p>
            <p style="color: #475569; margin-top: 4px;">A: ${f.answer}</p>
          </div>
        `).join('')}
      </div>

      <h2>Troubleshooting &amp; Performance Tips</h2>
      <p>To ensure optimal real-time performance when utilizing Chatr features:</p>
      <ul>
        <li><strong>Network Quality:</strong> Although Chatr adaptive codecs operate even on constrained 3G/4G connections, maintaining stable packet latency below 120ms ensures instant speech transcription and zero conversational stutter.</li>
        <li><strong>Microphone Placement:</strong> Position your device headset or microphone to minimize background ambient noise, especially in crowded outdoor markets or busy office environments.</li>
        <li><strong>Battery Optimization:</strong> Ensure Chatr background notification permissions are granted so you never miss incoming call requests or automated SI candidate screening alerts.</li>
      </ul>

      <h2>Built for Everyday Privacy</h2>
      <p>All Chatr communication workflows are designed with strict privacy controls. Users register with their phone number via one-time verification, without sharing unnecessary permissions or exposed social graphs. Data processed during live sessions remains encrypted and protected against unauthorized surveillance.</p>
    `;

    const bodyText = `${h1}. ${intro}. Step-by-Step Walkthrough: ${g.steps.map((s) => `${s.title}: ${s.desc}`).join('. ')}. Frequently Asked Questions: ${g.faqs.map((f) => `Question: ${f.question} Answer: ${f.answer}`).join(' ')}. Troubleshooting and Performance Tips: Although Chatr adaptive codecs operate even on constrained 3G and 4G connections, maintaining stable packet latency below 120ms ensures instant speech transcription. Position your device headset or microphone to minimize background ambient noise. Ensure Chatr background notification permissions are granted so you never miss incoming call requests. Built for Everyday Privacy: All Chatr communication workflows are designed with strict privacy controls. Users register with their phone number via one-time verification. Data processed during live sessions remains encrypted.`;

    const schemaJson = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: g.faqs.map((f) => ({
        '@type': 'Question',
        name: f.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: f.answer
        }
      }))
    };

    const candidate: PageCandidate = {
      slug,
      demand: {
        primaryKeyword: g.slug.replace(/-/g, ' '),
        monthlySearchVolumeMin: 220,
        searchIntent: 'informational',
        queryVariations: [
          `how to ${g.slug.replace(/-/g, ' ')}`,
          `guide for ${g.slug.replace(/-/g, ' ')}`,
          `${g.slug.replace(/-/g, ' ')} tutorial online`
        ]
      },
      evidence: {
        entityType: 'guide',
        dataPoints: {
          title: g.title,
          stepsCount: g.steps.length,
          faqsCount: g.faqs.length
        }
      },
      metadata: {
        title,
        description: metaDescription,
        canonicalUrl,
        h1,
        internalLinksCount: 4,
        coreCtaUrl: `/auth?ref=seo_guide_${g.slug}`,
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
        { label: 'Guides & Walkthroughs', url: '/guides' },
        { label: g.h1, url: `/${slug}` }
      ],
      bodyHtml,
      schemaJson,
      relatedLinks: [
        { label: 'Language Call Translation Pairs', url: '/translate/hindi-to-tamil', description: 'Real-time multilingual voice calling' },
        { label: 'Recruitment & Job Roles', url: '/jobs', description: 'Screen candidates via Chatr SI' },
        { label: 'Chatr vs WhatsApp Business', url: '/compare/chatr-vs-whatsapp-business-screening', description: 'Screening efficiency comparison' }
      ],
      ctaHeadline: 'Try This on Chatr Today',
      ctaSubtext: 'Sign in with your phone number to start calling, messaging, and using SI tools with zero setup friction.',
      ctaButtonText: 'Open Chatr & Start Free →',
      ctaTargetUrl: `/auth?ref=seo_guide_${g.slug}`
    };

    return {
      candidate,
      html: renderSeoHtml(props),
      relativePath
    };
  });
}
