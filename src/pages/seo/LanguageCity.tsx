import { useParams } from 'react-router-dom';
import NotFound from '@/pages/NotFound';
import { SeoLandingLayout } from '@/components/seo/SeoLandingLayout';
import {
  getLanguagePair,
  getSeoCity,
  languageCityDescription,
  languageCityPath,
  languageCityTitle,
  listLanguages,
  SEO_CITIES,
} from '@/config/seoPrograms';

/** /chatr/translate/:pair/:city — language pair scoped to a city. */
const LanguageCity = () => {
  const { pair: pairSlug, city: citySlug } = useParams();
  const pair = getLanguagePair(pairSlug);
  const city = getSeoCity(citySlug);

  if (!pair || !city) return <NotFound />;

  const path = languageCityPath(pair.slug, city.slug);
  const spoken = listLanguages(city.languages);
  const nearby = SEO_CITIES.filter((c) => c.state === city.state && c.slug !== city.slug).slice(0, 4);

  return (
    <SeoLandingLayout
      path={path}
      title={languageCityTitle(pair, city)}
      description={languageCityDescription(pair, city)}
      h1={`${pair.from.name} to ${pair.to.name} call translation in ${city.name}`}
      intro={`Speak ${pair.from.name} (${pair.from.native}) on a Chatr call and let the person on the other side hear ${pair.to.name} (${pair.to.native}) — in ${city.name}, ${city.state}, over the mobile data you already have.`}
      breadcrumbLabel={`${pair.from.name} to ${pair.to.name} — ${city.name}`}
      sections={[
        {
          heading: `Why ${pair.from.name} to ${pair.to.name} comes up in ${city.name}`,
          paragraphs: [
            `Everyday conversations in ${city.name} move between ${spoken}, and calls often cross into other states and languages. Chatr keeps both people in the language they think in: you talk in ${pair.from.name}, the other side hears ${pair.to.name}, and the reply comes back translated.`,
            `Nothing to install beyond the app, and no separate account — sign in with your phone number.`,
          ],
          bullets: [
            `Both directions: ${pair.from.name} → ${pair.to.name} and ${pair.to.name} → ${pair.from.name}`,
            'Live captions you can read while the call continues',
            'Works on voice and video calls, and holds up on congested mobile networks',
          ],
        },
        {
          heading: 'How to use it on a call',
          paragraphs: [
            `Start or answer a call in Chatr, turn on translation, and pick ${pair.from.name} as your language and ${pair.to.name} for the other person. Speech is translated as you talk — you do not have to pause or type anything.`,
          ],
        },
      ]}
      faqs={[
        {
          question: `Does ${pair.from.name} to ${pair.to.name} translation work in ${city.name}?`,
          answer: `Yes. Chatr runs over mobile data or Wi-Fi, so it works anywhere in ${city.state} with a connection.`,
        },
        {
          question: 'Do both people need Chatr?',
          answer:
            'Translation runs inside a Chatr call, so both sides should be on Chatr for the two-way version. On other calls you still get your own captions.',
        },
      ]}
      relatedLinks={[
        {
          label: `${pair.from.name} to ${pair.to.name} call translation`,
          to: `/chatr/translate/${pair.slug}`,
          description: 'The full language pair page',
        },
        {
          label: 'Call translation languages',
          to: '/chatr/translate',
          description: 'Every supported language pair',
        },
        ...nearby.map((c) => ({
          label: `${pair.from.name} to ${pair.to.name} in ${c.name}`,
          to: languageCityPath(pair.slug, c.slug),
          description: `${c.name}, ${c.state}`,
        })),
      ]}
      ctaLabel="Open Chatr"
      ctaTo="/"
    />
  );
};

export default LanguageCity;
