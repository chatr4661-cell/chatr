import React from 'react';
import { Helmet } from 'react-helmet-async';
import { DirectChatTool } from '@/components/tools/DirectChatTool';
import { ConversionActionBar } from '@/components/seo/ConversionActionBar';
import { 
  ShieldCheck, 
  Zap, 
  Globe2, 
  HelpCircle, 
  ArrowRight, 
  Languages, 
  Bot, 
  Sparkles,
  PhoneOff
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { PRODUCTION_ORIGIN } from '@/config/seo';
import { PublicHeader } from '@/components/navigation/PublicHeader';

export default function DirectChatPage() {
  const canonicalUrl = `${PRODUCTION_ORIGIN}/direct-chat`;

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${canonicalUrl}#app`,
        name: 'Direct Chat Without Saving Number — Chatr Tool',
        url: canonicalUrl,
        applicationCategory: 'CommunicationApplication',
        operatingSystem: 'All',
        browserRequirements: 'Requires JavaScript. Requires HTML5.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        featureList: [
          'Direct message any phone number without saving to contacts',
          'International E.164 phone code normalization',
          'Client-side privacy with zero server retention',
          'Instant QR code generation for mobile chat dispatch',
        ],
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonicalUrl}#faq`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'How do I send a message to a phone number without saving it?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Select the destination country code, type the phone number, optionally write your message, and click "Open Direct Chat". Your chat client will open with the conversation immediately ready without needing to save a contact.',
            },
          },
          {
            '@type': 'Question',
            name: 'Is my phone number or recipient number stored on your servers?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'No. The Direct Chat tool operates completely client-side in your web browser. Neither phone numbers nor message contents are ever logged or stored on any server.',
            },
          },
          {
            '@type': 'Question',
            name: 'Does this tool work for international phone numbers?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. It supports full international E.164 formatting across 200+ countries including India, UAE, UK, USA, Canada, Saudi Arabia, Singapore, and Australia.',
            },
          },
          {
            '@type': 'Question',
            name: 'What extra features does CHATR provide beyond direct chat?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'CHATR provides live bi-directional call translation between languages, SI-powered conversation summarization, community spam call protection, and seamless low-bandwidth calls on 2G networks.',
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-primary/20 pb-28">
      <Helmet>
        <title>Direct Chat Without Saving Phone Number — Free Instant Tool | Chatr</title>
        <meta 
          name="description" 
          content="Send a message to any phone number directly without saving it to your contacts. Free, private, instant E.164 international formatting. Try it now." 
        />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:title" content="Direct Chat Without Saving Phone Number — Free Instant Tool | Chatr" />
        <meta 
          property="og:description" 
          content="Start messaging any phone number instantly without cluttering your address book. Free client-side utility by Chatr." 
        />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <PublicHeader />

      {/* Main Container */}
      <main className="container max-w-5xl mx-auto px-4 py-8 md:py-12 space-y-12">
        {/* Header Section */}
        <section className="text-center space-y-3 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <Zap className="w-3.5 h-3.5" />
            100% Free • No Contact Book Clutter • Instant Dispatch
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-foreground">
            Direct Chat Without Saving Number
          </h1>
          <p className="text-base md:text-lg text-muted-foreground">
            Connect with deliveries, clients, or sellers in one tap without saving temporary contacts to your phone.
          </p>
        </section>

        {/* Interactive Tool Component */}
        <section>
          <DirectChatTool />
        </section>

        {/* Value Proposition Grid */}
        <section className="space-y-6 pt-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              Why Use Direct Chat with CHATR?
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Built for privacy, speed, and cross-border communication.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border border-border/70 bg-card/60">
              <CardContent className="p-6 space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                  <PhoneOff className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">Clean Address Book</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Never pollute your contact book with one-time delivery drivers, classified sellers, or temporary business inquiries.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border/70 bg-card/60">
              <CardContent className="p-6 space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">Guaranteed Client Privacy</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Everything executes in your device’s browser memory. Your contacts, numbers, and texts are never uploaded or retained.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-border/70 bg-card/60">
              <CardContent className="p-6 space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                  <Globe2 className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">Global E.164 Formatter</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Automatic country code detection and prefix normalization prevents broken chat links across international borders.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* SI Intelligence Showcase */}
        <section className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                CHATR SI: Communication + Intelligence
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                Meet CHATR's Synthetic Intelligence Layer
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl">
                Unlike basic chat apps, CHATR brings an active intelligence layer into your messaging and calls.
              </p>
            </div>
            <Link to="/auth">
              <Button size="lg" className="font-semibold gap-2">
                Get Started Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-border/60 bg-background/80 space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Languages className="w-4 h-4" />
                Bi-Directional Voice Translation
              </div>
              <p className="text-xs text-muted-foreground">
                Break language barriers on live calls. Talk in your mother tongue; the receiver hears their language in real time.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/60 bg-background/80 space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Bot className="w-4 h-4" />
                Instant Thread Summarization
              </div>
              <p className="text-xs text-muted-foreground">
                Catch up on 150+ unread group messages in three concise bullet points without reading through endless chatter.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-border/60 bg-background/80 space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <ShieldCheck className="w-4 h-4" />
                True Community Spam Shield
              </div>
              <p className="text-xs text-muted-foreground">
                Instantly identify suspicious caller numbers and block malicious fraud before picking up incoming calls.
              </p>
            </div>
          </div>
        </section>

        {/* Frequently Asked Questions */}
        <section className="space-y-4 pt-4 max-w-3xl mx-auto">
          <div className="text-center space-y-1 mb-6">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
              <HelpCircle className="w-4 h-4" /> FAQs
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Frequently Asked Questions</h2>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-border/70 p-4 bg-card/40 space-y-1.5">
              <h3 className="font-semibold text-sm">How does direct chat without saving a number work?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When you click "Open Direct Chat", our tool utilizes official deep-link protocols with the international E.164 phone format. This instructs your messaging client to open a chat session directly with the specified number.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 p-4 bg-card/40 space-y-1.5">
              <h3 className="font-semibold text-sm">Are phone numbers or messages stored on CHATR?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                No. All validation, formatting, and link generation occurs directly within your web browser. No phone numbers, text messages, or contact records are sent to or stored in any remote database.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 p-4 bg-card/40 space-y-1.5">
              <h3 className="font-semibold text-sm">Can I use this across different countries?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Yes! The tool features an international country picker with automatic dial codes for India (+91), UAE (+971), UK (+44), USA (+1), Saudi Arabia (+966), Qatar (+974), and over 200 other countries worldwide.
              </p>
            </div>

            <div className="rounded-xl border border-border/70 p-4 bg-card/40 space-y-1.5">
              <h3 className="font-semibold text-sm">Is any account required to use this tool?</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Zero sign-up is required. You can use the Direct Chat utility as many times as you want completely free of charge.
              </p>
            </div>
          </div>
        </section>

        {/* Contextual Internal Links Section */}
        <section className="border-t border-border/70 pt-8 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Explore Related CHATR Solutions
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <Link to="/lookup" className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium">
              🔍 Caller ID & Phone Lookup
            </Link>
            <Link to="/chatr/live-call-translation" className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium">
              🌐 Live Call Translation
            </Link>
            <Link to="/chatr/spam-call-protection" className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium">
              🛡️ Spam Call Protection
            </Link>
            <Link to="/chatr/ai-messaging-assistant" className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors font-medium">
              🤖 AI Messaging Assistant
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
