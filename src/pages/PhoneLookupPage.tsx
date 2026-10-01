import React from 'react';
import { Helmet } from 'react-helmet-async';
import { PublicPhoneLookup } from '@/components/tools/PublicPhoneLookup';
import { ConversionActionBar } from '@/components/seo/ConversionActionBar';
import { 
  ShieldCheck, 
  Search, 
  HelpCircle, 
  ArrowRight, 
  PhoneCall, 
  Bot, 
  Lock, 
  AlertTriangle 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PRODUCTION_ORIGIN } from '@/config/seo';

export default function PhoneLookupPage() {
  const canonicalUrl = `${PRODUCTION_ORIGIN}/lookup`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${canonicalUrl}#app`,
        name: 'Phone Number Lookup & Community Caller ID — Chatr',
        url: canonicalUrl,
        applicationCategory: 'SecurityApplication',
        operatingSystem: 'All',
        browserRequirements: 'Requires JavaScript. Requires HTML5.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        featureList: [
          'Instant caller risk verification and trust scoring',
          'Community-powered spam and fraud reporting',
          'Cryptographically hashed lookup preserving phone privacy',
          'Automated AI call screening integration',
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How do I check if a phone number is a spam caller?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Enter the phone number into the search bar above. CHATR queries its community caller database using secure cryptographic hashes to show if the number has active spam reports or risk flags.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is my phone number search private?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. CHATR converts phone numbers to irreversible SHA-256 hashes prior to matching. We never store personal contact lists or search history on our servers.',
            },
          },
          {
            '@type': 'Question',
            name: 'How can I report a persistent spam caller or scammer?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'After searching the number, use the "Submit Community Report" section to flag the caller as telemarketing, fraud, or robocall. Your report helps protect hundreds of thousands of users.',
            },
          },
          {
            '@type': 'Question',
            name: 'Can CHATR automatically block incoming spam calls on my mobile phone?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. By installing the CHATR app, you get automated AI call answering and spam protection that screens unknown callers in real time before your device rings.',
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 pb-28">
      <Helmet>
        <title>Phone Number Lookup & Caller ID — Free Spam Check | Chatr</title>
        <meta 
          name="description" 
          content="Look up unknown phone numbers, check community spam reports, and protect your calls from fraud. Free, privacy-first caller ID tool by Chatr." 
        />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content="Phone Number Lookup & Caller ID — Free Spam Check | Chatr" />
        <meta 
          property="og:description" 
          content="Identify unknown callers and check community fraud reports instantly with CHATR's free privacy-first lookup tool." 
        />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto px-4 py-8 md:py-12 space-y-12">
        {/* Header */}
        <section className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Search className="w-3.5 h-3.5" />
            Verified Community Defense • SHA-256 Privacy
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">
            Phone Number & Caller Lookup
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            Search unknown phone numbers, view community trust scores, and report fraudulent spam callers.
          </p>
        </section>

        {/* Interactive Lookup Tool */}
        <section>
          <PublicPhoneLookup />
        </section>

        {/* Feature Grid */}
        <section className="space-y-6 pt-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              Community-Backed Spam Defense
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Real-time protection without compromising your address book.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border border-border/70 bg-card/60">
              <CardContent className="p-6 space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">Crowdsourced Accuracy</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Aggregated reports from active users ensure suspicious phone numbers are categorized before they reach your phone.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border/70 bg-card/60">
              <CardContent className="p-6 space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">No Contact Scraping</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Unlike traditional caller ID platforms, CHATR never uploads, monetizes, or sells your private contact book.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border/70 bg-card/60">
              <CardContent className="p-6 space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
                  <Bot className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">Intelligent Call Screening</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Let your CHATR SI Assistant answer suspicious calls on your behalf and deliver full transcripts directly into chat.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQs */}
        <section className="space-y-4 pt-4 max-w-3xl mx-auto">
          <div className="text-center space-y-1 mb-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              <HelpCircle className="w-4 h-4" /> FAQs
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-border/70 p-4 bg-card/40 space-y-1.5">
              <h3 className="font-semibold text-sm">How does CHATR determine if a number is spam?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Risk ratings are computed from verified community submissions, call frequency anomalies, and user reports. Numbers exceeding complaint thresholds receive warning badges.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 p-4 bg-card/40 space-y-1.5">
              <h3 className="font-semibold text-sm">Can I remove or correct information about my phone number?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Yes. If your legitimate business number has been incorrectly reported, you can verify your business identity on CHATR to restore a Verified Business status.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 p-4 bg-card/40 space-y-1.5">
              <h3 className="font-semibold text-sm">Is there any fee to look up numbers?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                No. The CHATR Phone Lookup utility is 100% free with unlimited queries.
              </p>
            </div>
          </div>
        </section>

        {/* Contextual Internal Links */}
        <section className="border-t border-border/70 pt-8 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Explore Related CHATR Solutions
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link to="/direct-chat" className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium">
              💬 Direct Chat Without Saving Number
            </Link>
            <Link to="/chatr/spam-call-protection" className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium">
              🛡️ Spam Call Protection
            </Link>
            <Link to="/chatr/ai-call-answering" className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium">
              📞 AI Call Answering
            </Link>
            <Link to="/chatr/live-call-translation" className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium">
              🌐 Live Call Translation
            </Link>
            <Link to="/download" className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium">
              📲 Download Chatr App
            </Link>
          </div>
        </section>
      </main>

      {/* Floating Conversion Bar */}
      <ConversionActionBar />
    </div>
  );
}
