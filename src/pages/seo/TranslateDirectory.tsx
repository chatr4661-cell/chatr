import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Sparkles } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { PRODUCTION_ORIGIN } from '@/config/seo';
import { LANGUAGE_PAIRS, SEO_LANGUAGES, languagePairPath } from '@/config/seoPrograms';
import { InteractiveTranslator } from '@/components/translator/InteractiveTranslator';

const PATH = '/chatr/translate';
const TITLE = 'Regional Language & Call Translation — Chatr';
const DESCRIPTION =
  'Translate text and live speech across 25+ Indian regional languages including Haryanvi, Tulu, Kannada, Telugu, Odia, Rajasthani, Hindi and English on Chatr.';

const FEATURED_CLUSTERS = [
  { from: 'Haryanvi', to: 'Hindi', slug: 'haryanvi-to-hindi', note: 'Dialect translation with Devanagari script support' },
  { from: 'Tulu', to: 'Kannada', slug: 'tulu-to-kannada', note: 'Coastal Karnataka bilingual conversation' },
  { from: 'Haryanvi', to: 'English', slug: 'haryanvi-to-english', note: 'Regional phrasing to clear English' },
  { from: 'Tulu', to: 'Hindi', slug: 'tulu-to-hindi', note: 'Inter-regional communication bridge' },
  { from: 'Telugu', to: 'Rajasthani', slug: 'telugu-to-rajasthani', note: 'Interstate trade and business calls' },
  { from: 'Odia', to: 'Telugu', slug: 'odia-to-telugu', note: 'Eastern & Southern corridor connectivity' },
];

/** Directory hub linking to every programmatic language-pair page. */
const TranslateDirectory: React.FC = () => (
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
        { name: 'Translation', url: PATH },
      ]}
    />

    <main className="mx-auto max-w-4xl px-4 py-8 pb-24">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="flex items-center gap-1 text-xs text-muted-foreground">
          <li>
            <Link to="/" className="hover:text-foreground">
              Home
            </Link>
          </li>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <li aria-current="page" className="text-foreground">
            Regional Language Translation
          </li>
        </ol>
      </nav>

      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl text-slate-900 dark:text-white">
          Regional Indian Language &amp; Live Call Translation
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Real-time text and speech translation across {SEO_LANGUAGES.length} Indian languages and dialects.
          Try the interactive translator below, or use it during live voice and video calls in Chatr.
        </p>
      </header>

      {/* Interactive Live Translator Tool */}
      <section className="mb-10">
        <InteractiveTranslator initialSourceSlug="haryanvi" initialTargetSlug="hindi" />
      </section>

      {/* High-Intent Regional Dialect Clusters */}
      <section className="mb-10 rounded-2xl border border-emerald-100 bg-emerald-50/40 p-6 dark:border-emerald-900/30 dark:bg-emerald-950/20">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            High-Demand Regional Language Pairs
          </h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Direct tools for regional dialects that are traditionally underserved by mainstream translators:
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {FEATURED_CLUSTERS.map((cluster) => (
            <Link
              key={cluster.slug}
              to={languagePairPath(cluster.slug)}
              className="flex flex-col rounded-xl border border-emerald-200/60 bg-white p-3.5 shadow-sm transition hover:border-emerald-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm text-emerald-900 dark:text-emerald-300">
                  {cluster.from} → {cluster.to}
                </span>
                <ChevronRight className="h-4 w-4 text-emerald-500" />
              </div>
              <span className="mt-1 text-xs text-muted-foreground">{cluster.note}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Complete Index of Language Pairs */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">
          All Supported Languages ({SEO_LANGUAGES.length})
        </h2>
        <div className="space-y-6">
          {SEO_LANGUAGES.map((language) => (
            <div key={language.slug} className="rounded-xl border border-border/50 p-4">
              <h3 className="mb-2.5 text-base font-semibold text-slate-800 dark:text-slate-200">
                From {language.name}{' '}
                <span className="text-xs font-normal text-muted-foreground">({language.native})</span>
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {LANGUAGE_PAIRS.filter((p) => p.from.slug === language.slug).map((pair) => (
                  <li key={pair.slug}>
                    <Link
                      to={languagePairPath(pair.slug)}
                      className="inline-block rounded-full border border-border/60 bg-slate-50/50 px-2.5 py-1 text-xs text-muted-foreground transition hover:border-emerald-500 hover:text-emerald-700 dark:bg-slate-900 dark:hover:text-emerald-400"
                    >
                      {pair.from.name} to {pair.to.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Chatr — A product of Talentxcel Services Pvt Ltd
      </p>
    </main>
  </>
);

export default TranslateDirectory;
