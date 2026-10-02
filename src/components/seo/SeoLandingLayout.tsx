import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { PRODUCTION_ORIGIN } from '@/config/seo';

export interface SeoLandingSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface SeoLandingFaq {
  question: string;
  answer: string;
}

export interface SeoLandingLink {
  label: string;
  to: string;
  description: string;
}

export interface SeoLandingLayoutProps {
  path: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: SeoLandingSection[];
  faqs?: SeoLandingFaq[];
  relatedLinks: SeoLandingLink[];
  ctaLabel: string;
  ctaTo: string;
  breadcrumbLabel: string;
}

/**
 * Shared, extensible shell for public SEO landing pages under /chatr/*.
 * Provides canonical, robots, OpenGraph, breadcrumbs, WebPage + FAQ schema
 * (FAQ schema only when the questions are visibly rendered below) and a
 * consistent internal-linking block.
 */
export const SeoLandingLayout = ({
  path,
  title,
  description,
  h1,
  intro,
  sections,
  faqs,
  relatedLinks,
  ctaLabel,
  ctaTo,
  breadcrumbLabel,
}: SeoLandingLayoutProps) => {
  const webPageSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: `${PRODUCTION_ORIGIN}${path}`,
    inLanguage: 'en-IN',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Chatr+',
      url: PRODUCTION_ORIGIN,
    },
  };

  return (
    <>
      <SEOHead
        title={title}
        description={description}
        canonicalUrl={path}
        noIndex={false}
        schemaData={webPageSchema}
        breadcrumbList={[
          { name: 'Home', url: '/' },
          { name: breadcrumbLabel, url: path },
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
              {breadcrumbLabel}
            </li>
          </ol>
        </nav>

        <header className="mb-8">
          <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">{h1}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{intro}</p>
        </header>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-2 text-lg font-semibold">{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="mb-3 text-sm leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-2 space-y-2">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-2 text-sm text-muted-foreground">
                      <span aria-hidden="true" className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {faqs && faqs.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-3 text-lg font-semibold">Questions people ask</h2>
            <dl className="space-y-4">
              {faqs.map((faq) => (
                <div key={faq.question} className="rounded-xl border border-border/60 p-4">
                  <dt className="text-sm font-medium">{faq.question}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{faq.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <section className="mt-10 rounded-2xl border border-border/60 bg-muted/40 p-5">
          <h2 className="text-base font-semibold">Get started</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open Chatr+ and set this up on your own number — no separate tool to install.
          </p>
          <Button asChild className="mt-4">
            <Link to={ctaTo}>
              {ctaLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">Related on Chatr+</h2>
          <ul className="space-y-2">
            {relatedLinks.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border/60 p-4 transition-colors hover:bg-muted/50"
                >
                  <span>
                    <span className="block text-sm font-medium">{link.label}</span>
                    <span className="block text-xs text-muted-foreground">{link.description}</span>
                  </span>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-10 text-center text-xs text-muted-foreground">
          Chatr — A product of Talentxcel Services Pvt Ltd
        </p>
      </main>
    </>
  );
};
