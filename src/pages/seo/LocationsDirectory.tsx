import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { PRODUCTION_ORIGIN } from '@/config/seo';
import { cityUseCasePath, SEO_CITIES, SEO_USE_CASES, listLanguages } from '@/config/seoPrograms';

const PATH = '/chatr/locations';
const TITLE = 'Chatr by City — Calling and Messaging Across India';
const DESCRIPTION =
  'Browse Chatr calling and messaging use cases city by city, from Mumbai and Delhi to Ludhiana, Coimbatore and Guwahati, with the languages each page is written for.';

/** Directory hub linking to every programmatic city page. */
const LocationsDirectory = () => {
  const states = Array.from(new Set(SEO_CITIES.map((c) => c.state))).sort();

  return (
    <>
      <SEOHead
        title={TITLE}
        description={DESCRIPTION}
        canonicalUrl={PATH}
        noIndex={false}
        schemaData={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: TITLE,
          description: DESCRIPTION,
          url: `${PRODUCTION_ORIGIN}${PATH}`,
          inLanguage: 'en-IN',
        }}
        breadcrumbList={[
          { name: 'Home', url: '/' },
          { name: 'Cities', url: PATH },
        ]}
      />

      <main className="mx-auto max-w-3xl px-4 py-8 pb-24">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-1 text-xs text-muted-foreground">
            <li>
              <Link to="/" className="hover:text-foreground">
                Home
              </Link>
            </li>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <li aria-current="page" className="text-foreground">
              Cities
            </li>
          </ol>
        </nav>

        <header className="mb-8">
          <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">Chatr by city</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Each page below is written for one city and the languages spoken there, across{' '}
            {SEO_USE_CASES.length} Chatr use cases.
          </p>
        </header>

        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Use cases</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {SEO_USE_CASES.map((useCase) => (
              <li key={useCase.slug}>
                <Link
                  to={useCase.hub}
                  className="block rounded-xl border border-border/60 p-3 text-sm transition-colors hover:bg-muted/50"
                >
                  {useCase.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {states.map((state) => (
          <section key={state} className="mb-8">
            <h2 className="mb-3 text-lg font-semibold">{state}</h2>
            <ul className="space-y-3">
              {SEO_CITIES.filter((c) => c.state === state).map((city) => (
                <li key={city.slug} className="rounded-xl border border-border/60 p-3">
                  <p className="text-sm font-medium">{city.name}</p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    {listLanguages(city.languages)}
                  </p>
                  <ul className="flex flex-wrap gap-2">
                    {SEO_USE_CASES.map((useCase) => (
                      <li key={useCase.slug}>
                        <Link
                          to={cityUseCasePath(useCase.slug, city.slug)}
                          className="inline-block rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {useCase.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Chatr — A product of Talentxcel Services Pvt Ltd
        </p>
      </main>
    </>
  );
};

export default LocationsDirectory;
