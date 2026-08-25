import { useParams } from 'react-router-dom';
import NotFound from '@/pages/NotFound';
import { SeoLandingLayout } from '@/components/seo/SeoLandingLayout';
import {
  cityUseCaseDescription,
  cityUseCasePath,
  cityUseCaseTitle,
  getSeoCity,
  getSeoUseCase,
  listLanguages,
  SEO_CITIES,
} from '@/config/seoPrograms';

/** /chatr/:useCase/:city — programmatic city landing page. */
const CityUseCase = () => {
  const { useCase: useCaseSlug, city: citySlug } = useParams();
  const useCase = getSeoUseCase(useCaseSlug);
  const city = getSeoCity(citySlug);

  if (!useCase || !city) return <NotFound />;

  const path = cityUseCasePath(useCase.slug, city.slug);
  const languages = listLanguages(city.languages);

  const nearby = SEO_CITIES.filter((c) => c.state === city.state && c.slug !== city.slug).slice(0, 4);

  return (
    <SeoLandingLayout
      path={path}
      title={cityUseCaseTitle(useCase, city)}
      description={cityUseCaseDescription(useCase, city)}
      h1={`${useCase.label} in ${city.name}`}
      intro={`Chatr brings ${useCase.intentLabel} to ${city.name}, ${city.state}. It works on your existing phone number, over whatever mobile data you already have.`}
      breadcrumbLabel={`${useCase.label} — ${city.name}`}
      sections={[
        {
          heading: `Why this matters in ${city.name}`,
          paragraphs: [
            `Conversations in ${city.name} move between ${languages}. Chatr is built for exactly that: you keep speaking the language you are comfortable in, and the app handles the rest of the call or the thread.`,
            `Nothing extra to buy or install beyond the app — sign in with your phone number and start.`,
          ],
          bullets: [
            `Works on ${languages} speakers' everyday handsets`,
            'Sign in with a phone number — no separate account to create',
            'Designed to keep working on slow and congested mobile networks',
          ],
        },
        {
          heading: 'How it works',
          paragraphs: [
            `Open Chatr, start or answer a call, and turn on ${useCase.label.toLowerCase()}. Everything runs inside the same app you already use for chats and calls in ${city.name}.`,
          ],
        },
      ]}
      faqs={[
        {
          question: `Does ${useCase.label.toLowerCase()} work in ${city.name}?`,
          answer: `Yes. Chatr is a data-based app, so it works anywhere in ${city.state} where you have a mobile data or Wi-Fi connection.`,
        },
        {
          question: `Which languages does it handle in ${city.name}?`,
          answer: `This page is written for people who speak ${languages}, and Chatr supports these along with other major Indian languages.`,
        },
      ]}
      relatedLinks={[
        {
          label: useCase.label,
          to: useCase.hub,
          description: 'The full feature overview',
        },
        {
          label: 'Chatr by city',
          to: '/chatr/locations',
          description: 'Browse every city page',
        },
        ...nearby.map((c) => ({
          label: `${useCase.label} in ${c.name}`,
          to: cityUseCasePath(useCase.slug, c.slug),
          description: `${c.name}, ${c.state}`,
        })),
      ]}
      ctaLabel="Open Chatr"
      ctaTo="/"
    />
  );
};

export default CityUseCase;
