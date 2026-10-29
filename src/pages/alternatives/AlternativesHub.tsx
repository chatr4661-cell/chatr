import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Sparkles, MessageSquare, PhoneCall, Users, Shield, ArrowRight, Download } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { COMPETITOR_LIST } from '@/config/competitorData';
import { PRODUCTION_ORIGIN } from '@/config/seo';

export const AlternativesHub: React.FC = () => {
  const canonicalPath = '/alternatives';
  const title = 'Modern Communication Alternatives & Software Comparisons (2026) — Chatr';
  const description =
    'Compare Chatr against WhatsApp, Microsoft Teams, FaceTime, Slack, and Telegram. Discover private messaging, real-time live call translation, and zero passwords.';

  const schemaData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: title,
    description,
    url: `${PRODUCTION_ORIGIN}${canonicalPath}`,
    inLanguage: 'en-IN',
  };

  const categories = [
    {
      title: 'Consumer Messaging Alternatives',
      desc: 'Private, ad-free alternatives to mainstream consumer chat apps with native Indian language translation.',
      icon: MessageSquare,
      items: COMPETITOR_LIST.filter((c) => c.category === 'Messaging'),
    },
    {
      title: 'Team & Workplace Collaboration Alternatives',
      desc: 'Lightweight team chat and huddle tools without heavy corporate RAM bloat or 90-day archive paywalls.',
      icon: Users,
      items: COMPETITOR_LIST.filter((c) => c.category === 'Team Collaboration'),
    },
    {
      title: 'Voice & Video Calling Alternatives',
      desc: 'Cross-platform WebRTC HD audio/video calling with live speech-to-speech translation across devices.',
      icon: PhoneCall,
      items: COMPETITOR_LIST.filter((c) => c.category === 'Video & Voice Calling'),
    },
  ];

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
          { name: 'Alternatives & Comparisons', url: canonicalPath },
        ]}
      />

      <main className="mx-auto max-w-4xl px-4 py-8 pb-24 text-slate-800 dark:text-slate-100">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <li>
              <Link to="/" className="hover:text-foreground">Home</Link>
            </li>
            <ChevronRight className="h-3 w-3" />
            <li aria-current="page" className="font-medium text-foreground">
              Alternatives &amp; Comparisons
            </li>
          </ol>
        </nav>

        {/* Hero Header */}
        <header className="mb-10 rounded-3xl border border-emerald-100 bg-gradient-to-b from-emerald-50/50 to-white p-6 sm:p-10 dark:border-emerald-950/40 dark:from-emerald-950/20 dark:to-slate-900">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-100/60 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Honest &amp; Objective Software Comparisons</span>
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl text-slate-900 dark:text-white">
            Looking for a Better, More Private Communication App?
          </h1>

          <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-300">
            Explore feature-by-feature comparisons between CHATR and mainstream communication tools. Learn where CHATR’s live speech translation, zero-password authentication, and AI universal inbox provide real advantages—and where competitors still excel.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              <Link to="/download">
                <Download className="mr-2 h-4 w-4" />
                Download CHATR App
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/chatr/translate">
                Explore Regional Translation
              </Link>
            </Button>
          </div>
        </header>

        {/* Categories of Comparisons */}
        <div className="space-y-10">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <section key={cat.title} className="rounded-2xl border border-slate-200/80 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">{cat.title}</h2>
                </div>
                <p className="text-xs text-muted-foreground mb-6">{cat.desc}</p>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {cat.items.map((item) => (
                    <Link
                      key={item.slug}
                      to={`/alternatives/${item.slug}`}
                      className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition hover:border-emerald-500 hover:bg-emerald-50/20 hover:shadow-md dark:border-slate-800 dark:bg-slate-950/40"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-slate-900 group-hover:text-emerald-700 dark:text-white dark:group-hover:text-emerald-400">
                            CHATR vs {item.competitorName}
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 dark:text-slate-400">
                          {item.heroSubheadline}
                        </p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                        <span>Read full comparison</span>
                        <ArrowRight className="h-3 w-3" />
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        {/* Global Differentiator Banner */}
        <section className="mt-12 rounded-3xl border border-emerald-900/20 bg-slate-900 p-8 text-white shadow-xl dark:bg-slate-950">
          <div className="flex items-center gap-2 text-emerald-400 mb-3 text-xs font-bold uppercase tracking-wider">
            <Shield className="h-4 w-4" />
            <span>The CHATR Difference</span>
          </div>
          <h2 className="text-2xl font-bold mb-3">
            Built for Privacy, Regional Dialects, and Zero Friction
          </h2>
          <p className="text-sm leading-relaxed text-slate-300 max-w-2xl mb-6">
            We believe communication should be free from address book scraping, invasive advertising, and language barriers. CHATR connects you through verified phone identity and real-time live speech translation.
          </p>
          <Button asChild size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold">
            <Link to="/download">
              Try CHATR Today
            </Link>
          </Button>
        </section>
      </main>
    </>
  );
};

export default AlternativesHub;
