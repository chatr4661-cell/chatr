import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { PRODUCTION_ORIGIN } from '@/config/seo';
import { LANGUAGE_PAIRS, SEO_LANGUAGES, languagePairPath } from '@/config/seoPrograms';

const PATH = '/chatr/translate';
const TITLE = 'Call Translation Language Pairs — Chatr';
const DESCRIPTION =
  'Every language pair Chatr can translate during a live voice or video call, from Hindi to Punjabi through to Tamil, Telugu, Bengali, Malayalam and Urdu.';

/** Directory hub linking to every programmatic language-pair page. */
const TranslateDirectory = () => (
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
        { name: 'Call translation', url: PATH },
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
            Call translation
          </li>
        </ol>
      </nav>

      <header className="mb-8">
        <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
          Call translation language pairs
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {LANGUAGE_PAIRS.length} pairs across {SEO_LANGUAGES.length} languages. Translation runs in
          both directions during the same live call.
        </p>
        <p className="mt-3 text-sm">
          <Link to="/chatr/live-call-translation" className="underline">
            How live call translation works
          </Link>
        </p>
      </header>

      {SEO_LANGUAGES.map((language) => (
        <section key={language.slug} className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">
            From {language.name}{' '}
            <span className="text-sm font-normal text-muted-foreground">({language.native})</span>
          </h2>
          <ul className="flex flex-wrap gap-2">
            {LANGUAGE_PAIRS.filter((p) => p.from.slug === language.slug).map((pair) => (
              <li key={pair.slug}>
                <Link
                  to={languagePairPath(pair.slug)}
                  className="inline-block rounded-full border border-border/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {pair.from.name} to {pair.to.name}
                </Link>
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

export default TranslateDirectory;
