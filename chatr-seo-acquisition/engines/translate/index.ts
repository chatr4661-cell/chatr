/**
 * ENGINE: /translate/
 * Purpose: Multilingual Voice & Call Translation intent on Chatr
 */

import { APPROVED_LANGUAGE_PAIRS, type PublicLanguagePairRecord } from '../../data/approved-public-data';
import { renderSeoHtml, type SeoTemplateProps } from '../../templates/layout';
import type { PageCandidate } from '../../quality/quality-gate';

export function generateTranslatePages(): Array<{ candidate: PageCandidate; html: string; relativePath: string }> {
  return APPROVED_LANGUAGE_PAIRS.map((lp) => {
    const slug = `translate/${lp.slug}`;
    const relativePath = `translate/${lp.slug}/index.html`;
    const canonicalUrl = `https://chatr.chat/${slug}`;
    const title = `${lp.sourceLanguage} to ${lp.targetLanguage} Live Call Translation — Chatr Voice AI`;
    const metaDescription = `Speak in ${lp.sourceLanguage} and be heard in ${lp.targetLanguage} on live calls. Chatr provides real-time voice translation, live audio captions, and speech synthesis without language barriers.`;
    const h1 = `${lp.sourceLanguage} to ${lp.targetLanguage} Live Call Translation`;
    const intro = `Bridge communication gaps across India with Chatr's real-time voice translation. Conduct business, family calls, and support conversations where you speak ${lp.sourceLanguage} (${lp.nativeSource}) and your caller hears ${lp.targetLanguage} (${lp.nativeTarget}).`;

    const bodyHtml = `
      <div class="data-card">
        <h3>Linguistic Translation Profile</h3>
        <p><strong>Source Language:</strong> ${lp.sourceLanguage} (${lp.nativeSource})</p>
        <p><strong>Target Language:</strong> ${lp.targetLanguage} (${lp.nativeTarget})</p>
        <p><strong>Primary Use Case:</strong> ${lp.useCase}</p>
        <p><strong>Processing Latency:</strong> Sub-300ms stream translation with dual-channel speech synthesis</p>
      </div>

      <h2>How Live Call Translation Works in Chatr</h2>
      <p>During an active voice or video call on Chatr, callers can enable SI Live Translation with a single tap without hanging up or dialing special bridges:</p>
      <ul>
        <li><strong>Dual-Stream Speech Recognition:</strong> Audio packets are converted to phonemic transcripts in real time without buffering pauses.</li>
        <li><strong>Grammatical &amp; Dialect Normalization:</strong> Neural speech models understand regional variations, colloquial slang, and business terminology between ${lp.sourceLanguage} and ${lp.targetLanguage}.</li>
        <li><strong>Simultaneous Voice &amp; Live Captions:</strong> The remote listener hears translated audio spoken in a natural synthesized voice while viewing synchronized text subtitles on screen.</li>
      </ul>

      <h2>Essential Conversational Phrases &amp; Verified Translations</h2>
      <div class="data-card">
        ${lp.commonPhrases.map((p) => `
          <div style="margin-bottom: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
            <p><strong>Contextual Usage (${p.context}):</strong></p>
            <p style="color: #093E32; font-weight: 600;">${lp.sourceLanguage}: "${p.original}"</p>
            <p style="color: #064E3B; font-weight: 600;">${lp.targetLanguage}: "${p.translated}"</p>
          </div>
        `).join('')}
      </div>

      <h2>Linguistic &amp; Dialect Analysis</h2>
      <p>${lp.linguisticNotes}</p>
      <p>When translating live conversations from ${lp.sourceLanguage} into ${lp.targetLanguage}, Chatr preserves conversational formality, honorifics, and polite address registers so neither caller feels alienated or misunderstood.</p>

      <h2>Audio Privacy &amp; Data Security</h2>
      <p>Live voice translation is processed entirely in ephemeral memory buffers during the phone call. Audio streams are encrypted end-to-end between participants, and spoken voice recordings are never stored on persistent disks or sold to marketing aggregators.</p>
    `;

    const bodyText = `${h1}. ${intro}. Source Language: ${lp.sourceLanguage} (${lp.nativeSource}). Target Language: ${lp.targetLanguage} (${lp.nativeTarget}). Primary Use Case: ${lp.useCase}. Processing Latency: Sub-300ms stream translation with dual-channel speech synthesis. How Live Call Translation Works in Chatr: During an active voice or video call on Chatr, callers can enable SI Live Translation with a single tap without hanging up or dialing special bridges. Dual-Stream Speech Recognition converts audio packets in real time without buffering pauses. Neural speech models understand regional variations and business terminology between ${lp.sourceLanguage} and ${lp.targetLanguage}. The remote listener hears translated audio spoken in a natural synthesized voice while viewing synchronized text subtitles on screen. Essential Conversational Phrases and Verified Translations: ${lp.commonPhrases.map((p) => `${p.context}: ${p.original} translates to ${p.translated}`).join('; ')}. Linguistic and Dialect Analysis: ${lp.linguisticNotes}. When translating live conversations from ${lp.sourceLanguage} into ${lp.targetLanguage}, Chatr preserves conversational formality, honorifics, and polite address registers. Audio Privacy and Data Security: Live voice translation is processed entirely in ephemeral memory buffers during the phone call. Audio streams are encrypted end-to-end between participants, and spoken voice recordings are never stored on persistent disks or sold to marketing aggregators. One phone number, zero passwords, instant calling.`;

    const schemaJson = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `How do I translate ${lp.sourceLanguage} to ${lp.targetLanguage} during a phone call?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `In Chatr, initiate a voice call with your contact and tap the 'SI Translate' icon. Select ${lp.sourceLanguage} as your spoken language and ${lp.targetLanguage} as the output language. Live audio and captions will stream automatically.`
          }
        },
        {
          '@type': 'Question',
          name: `Do both callers need to install separate translation apps?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text: `No. Both callers simply use Chatr. Live translation is processed natively inside the call session without any external plugin or third-party bot.`
          }
        }
      ]
    };

    const candidate: PageCandidate = {
      slug,
      demand: {
        primaryKeyword: `${lp.sourceLanguage.toLowerCase()} to ${lp.targetLanguage.toLowerCase()} call translator`,
        monthlySearchVolumeMin: 320,
        searchIntent: 'commercial',
        queryVariations: [
          `translate ${lp.sourceLanguage.toLowerCase()} to ${lp.targetLanguage.toLowerCase()} voice call`,
          `live speech translator ${lp.sourceLanguage.toLowerCase()} ${lp.targetLanguage.toLowerCase()}`,
          `${lp.sourceLanguage.toLowerCase()} ${lp.targetLanguage.toLowerCase()} live audio call app`
        ]
      },
      evidence: {
        entityType: 'translate',
        dataPoints: {
          source: lp.sourceLanguage,
          target: lp.targetLanguage,
          phrases: lp.commonPhrases,
          linguistic: lp.linguisticNotes
        },
        provenance: lp.provenance
      },
      metadata: {
        title,
        description: metaDescription,
        canonicalUrl,
        h1,
        internalLinksCount: 4,
        coreCtaUrl: `/auth?ref=seo_trans_${lp.slug}`,
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
        { label: 'Live Call Translation', url: '/translate' },
        { label: `${lp.sourceLanguage} to ${lp.targetLanguage}`, url: `/${slug}` }
      ],
      bodyHtml,
      schemaJson,
      relatedLinks: [
        { label: 'AI Voice Calling Features', url: '/guides/live-audio-call-translation', description: 'Complete live call translation walkthrough' },
        { label: 'Chatr vs Truecaller Comparison', url: '/compare/chatr-vs-truecaller-privacy', description: 'Zero ads & call translation advantages' },
        { label: 'Chatr Knowledge Base', url: '/knowledge/si-assistant-conversational-ai', description: 'How SI intelligence powers your calls' }
      ],
      ctaHeadline: `Start a Free Call with ${lp.targetLanguage} Translation`,
      ctaSubtext: 'Talk freely in your native language. Chatr translates audio and captions in real time.',
      ctaButtonText: 'Try Live Call Translation →',
      ctaTargetUrl: `/auth?ref=seo_trans_${lp.slug}`
    };

    return {
      candidate,
      html: renderSeoHtml(props),
      relativePath
    };
  });
}
