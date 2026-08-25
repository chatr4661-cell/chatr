import { useParams } from 'react-router-dom';
import NotFound from '@/pages/NotFound';
import { SeoLandingLayout } from '@/components/seo/SeoLandingLayout';
import {
  getLanguagePair,
  LANGUAGE_PAIRS,
  languagePairDescription,
  languagePairPath,
  languagePairTitle,
} from '@/config/seoPrograms';

/** /chatr/translate/:pair — programmatic language-pair landing page. */
const LanguagePair = () => {
  const { pair: pairSlug } = useParams();
  const pair = getLanguagePair(pairSlug);

  if (!pair) return <NotFound />;

  const path = languagePairPath(pair.slug);
  const reverse = getLanguagePair(`${pair.to.slug}-to-${pair.from.slug}`);
  const siblings = LANGUAGE_PAIRS.filter(
    (p) => p.from.slug === pair.from.slug && p.to.slug !== pair.to.slug,
  ).slice(0, 4);

  return (
    <SeoLandingLayout
      path={path}
      title={languagePairTitle(pair)}
      description={languagePairDescription(pair)}
      h1={`${pair.from.name} to ${pair.to.name} call translation`}
      intro={`Speak ${pair.from.name} (${pair.from.native}) and let the person on the other end hear ${pair.to.name} (${pair.to.native}) — during the same live voice or video call.`}
      breadcrumbLabel={`${pair.from.name} to ${pair.to.name}`}
      sections={[
        {
          heading: 'Both directions, in the same call',
          paragraphs: [
            `Translation runs both ways: what you say in ${pair.from.name} is delivered in ${pair.to.name}, and their ${pair.to.name} comes back to you in ${pair.from.name}. Neither side has to switch language or repeat themselves.`,
            'Captions appear on screen as you talk, so you can read along if the audio is unclear.',
          ],
          bullets: [
            `Voice in ${pair.from.name}, voice out in ${pair.to.name}`,
            'Live captions for both sides of the conversation',
            'Works on a normal Chatr voice or video call',
          ],
        },
        {
          heading: 'Turning it on',
          paragraphs: [
            `Start a Chatr call, open the call controls and enable live translation, then pick ${pair.from.name} as your language and ${pair.to.name} for the other side.`,
          ],
        },
      ]}
      faqs={[
        {
          question: `Do both people need to set a language?`,
          answer: `No. Whoever turns on translation chooses both sides, so a ${pair.from.name} speaker can set up the call for a ${pair.to.name} speaker.`,
        },
        {
          question: 'Does it work on a video call?',
          answer: 'Yes — translation and captions work on both voice and video calls in Chatr.',
        },
      ]}
      relatedLinks={[
        {
          label: 'Live call translation',
          to: '/chatr/live-call-translation',
          description: 'How call translation works in Chatr',
        },
        {
          label: 'All language pairs',
          to: '/chatr/translate',
          description: 'Browse every supported pair',
        },
        ...(reverse
          ? [
              {
                label: `${reverse.from.name} to ${reverse.to.name}`,
                to: languagePairPath(reverse.slug),
                description: 'The reverse direction',
              },
            ]
          : []),
        ...siblings.map((p) => ({
          label: `${p.from.name} to ${p.to.name}`,
          to: languagePairPath(p.slug),
          description: `Translate ${p.from.name} calls into ${p.to.name}`,
        })),
      ]}
      ctaLabel="Open Chatr"
      ctaTo="/"
    />
  );
};

export default LanguagePair;
