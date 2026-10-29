import React from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Check, X, Shield, Sparkles, PhoneCall, ArrowRight, ChevronRight, HelpCircle, Download } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { COMPETITORS, CompetitorComparisonData } from '@/config/competitorData';
import { PRODUCTION_ORIGIN } from '@/config/seo';
import { InteractiveTranslator } from '@/components/translator/InteractiveTranslator';

export const CompetitorComparison: React.FC = () => {
  const { competitorSlug } = useParams<{ competitorSlug: string }>();
  const cleanSlug = competitorSlug?.toLowerCase().replace(/^chatr-vs-/, '') || '';
  const data: CompetitorComparisonData | undefined = COMPETITORS[cleanSlug];

  if (!data) {
    return <Navigate to="/alternatives" replace />;
  }

  const canonicalPath = `/alternatives/${data.slug}`;
  const title = `Best ${data.competitorName} Alternative (2026) — Chatr vs ${data.competitorName}`;
  const description = `${data.heroSubheadline} Honest feature breakdown, privacy evaluation, and live call translation comparison.`;

  // Schema.org structured data for SoftwareApplication + FAQPage
  const schemaData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'Chatr+',
        operatingSystem: 'Android, iOS, Web',
        applicationCategory: 'CommunicationApplication',
        offers: {
          '@type': 'Offer',
          price: '0.00',
          priceCurrency: 'USD',
        },
        description:
          'Private messaging, WebRTC calling with live regional speech translation, and integrated AI assistant with zero passwords.',
      },
      {
        '@type': 'FAQPage',
        mainEntity: data.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    ],
  };

  return (
    <>
      <SEOHead
        title={title}
        description={description}
        canonicalUrl={canonicalPath}
        noIndex={false}
        schemaData={schemaData}
        breadcrumbList={[
          { name: 'Home', url: '/' },
          { name: 'Alternatives', url: '/alternatives' },
          { name: `${data.competitorName} Alternative`, url: canonicalPath },
        ]}
      />

      <main className="mx-auto max-w-4xl px-4 py-8 pb-24 text-slate-800 dark:text-slate-100">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <li>
              <Link to="/" className="hover:text-foreground">Home</Link>
            </li>
            <ChevronRight className="h-3 w-3" />
            <li>
              <Link to="/alternatives" className="hover:text-foreground">Alternatives</Link>
            </li>
            <ChevronRight className="h-3 w-3" />
            <li aria-current="page" className="font-medium text-foreground">
              {data.competitorName} Alternative
            </li>
          </ol>
        </nav>

        {/* Hero Section */}
        <header className="mb-10 rounded-3xl border border-emerald-100 bg-gradient-to-b from-emerald-50/60 to-white p-6 sm:p-10 dark:border-emerald-950/40 dark:from-emerald-950/20 dark:to-slate-900">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/60 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Honest Product &amp; Feature Comparison</span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
            {data.heroHeadline}
          </h1>

          <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            {data.heroSubheadline}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              <Link to="/download">
                <Download className="mr-2 h-4 w-4" />
                Download CHATR Free
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/chatr/live-call-translation">
                <PhoneCall className="mr-2 h-4 w-4 text-emerald-600" />
                Explore Live Call Translation
              </Link>
            </Button>
          </div>
        </header>

        {/* Feature-by-Feature Comparison Table */}
        <section className="mb-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Feature-by-Feature Breakdown
            </h2>
            <span className="text-xs text-muted-foreground">Updated for 2026</span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                    <th className="p-4 font-semibold text-slate-700 dark:text-slate-200 w-1/4">Capability</th>
                    <th className="p-4 font-bold text-emerald-800 bg-emerald-50/50 dark:text-emerald-300 dark:bg-emerald-950/30 w-3/8">
                      CHATR (chatr.chat)
                    </th>
                    <th className="p-4 font-semibold text-slate-600 dark:text-slate-300 w-3/8">
                      {data.competitorName}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.keyDifferences.map((diff) => (
                    <tr key={diff.dimension} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                      <td className="p-4 font-semibold text-slate-900 dark:text-white">
                        {diff.dimension}
                      </td>
                      <td className="p-4 bg-emerald-50/30 dark:bg-emerald-950/10 text-slate-800 dark:text-slate-200">
                        <div className="flex items-start gap-2">
                          <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                          <span>{diff.chatrValue}</span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        <div className="flex items-start gap-2">
                          {diff.advantage === 'chatr' ? (
                            <X className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
                          ) : (
                            <Check className="h-4 w-4 shrink-0 text-slate-600 mt-0.5" />
                          )}
                          <span>{diff.competitorValue}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Where CHATR Wins vs Where Competitor Wins (Objective Transparency) */}
        <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-full bg-emerald-600 p-1.5 text-white">
                <Check className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-bold text-emerald-950 dark:text-emerald-200">
                Where CHATR Shines
              </h3>
            </div>
            <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              {data.whereChatrWins.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="font-bold text-emerald-600">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6 dark:border-slate-800 dark:bg-slate-900/50">
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-full bg-slate-500 p-1.5 text-white">
                <Check className="h-4 w-4" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200">
                Where {data.competitorName} Has the Advantage
              </h3>
            </div>
            <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              {data.whereCompetitorWins.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2.5">
                  <span className="font-bold text-slate-400">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Balanced Evaluation Narrative */}
        <section className="mb-12 rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
            The Honest Bottom Line
          </h2>
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
            {data.honestAssessment}
          </p>
        </section>

        {/* Live Feature Demonstration: Interactive Translator Tool */}
        <section className="mb-12">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Try CHATR&apos;s Core Differentiator: Instant Regional Translation
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Unlike {data.competitorName}, CHATR natively translates text and voice across Indian dialects:
            </p>
          </div>
          <InteractiveTranslator initialSourceSlug="haryanvi" initialTargetSlug="hindi" />
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {data.faqs.map((faq, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                  {faq.question}
                </h3>
                <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Related Comparisons & Internal Links */}
        <section className="border-t border-slate-200 pt-8 dark:border-slate-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
            Explore Other Comparisons
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.relatedAlternatives.map((slug) => {
              const comp = COMPETITORS[slug];
              if (!comp) return null;
              return (
                <Link
                  key={slug}
                  to={`/alternatives/${slug}`}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-500 hover:text-emerald-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:text-emerald-400 transition"
                >
                  CHATR vs {comp.competitorName} →
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
};

export default CompetitorComparison;
