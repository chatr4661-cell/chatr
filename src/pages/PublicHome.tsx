import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Inbox,
  Languages,
  PhoneCall,

  MessageSquare,
  Building2,
  ShieldCheck,
  Sparkles,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import { SEOHead } from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_TITLE,
  ORGANIZATION_NAME,
  PRODUCTION_ORIGIN,
  SITE_NAME,
  SOCIAL_PROFILES,
  absoluteUrl,
} from '@/config/seo';
import chatrIconLogo from '@/assets/chatr-icon-logo.png';

/**
 * Public, crawlable homepage for https://chatr.chat/.
 *
 * Truth rules: every capability described below exists in the application and
 * has a real route. No ratings, reviews, download counts or user numbers are
 * published anywhere on this page or in its structured data.
 */

const capabilities = [
  {
    icon: Inbox,
    title: 'Universal inbox',
    body: 'Connect Gmail, Outlook, WhatsApp Business, Slack and Microsoft Teams and read every conversation in one list, with each thread keeping the channel it arrived on.',
    to: '/chatr/universal-inbox-ai',
    linkLabel: 'How the universal inbox works',
  },
  {
    icon: MessageSquare,
    title: 'AI-powered messaging',
    body: 'Summarise a long thread, draft a reply in your own tone, or translate a conversation between languages while you message and call the people you already talk to.',
    to: '/chatr/ai-messaging-assistant',
    linkLabel: 'AI messaging assistant',
  },
  {
    icon: Bot,
    title: 'AI assistants and agents',
    body: 'Ask the assistant a question inside any chat, or configure an agent to answer a defined kind of message and hand the conversation to a person when it needs one.',
    to: '/chatr/ai-agents',
    linkLabel: 'AI agents in Chatr',
  },
  {
    icon: Languages,
    title: 'Calls that cross languages',
    body: 'Turn on translation during a voice or video call and each person speaks and hears their own language, with captions alongside the audio.',
    to: '/chatr/live-call-translation',
    linkLabel: 'Live call translation',
  },
  {
    icon: PhoneCall,
    title: 'Calling with an assistant',
    body: 'When you cannot pick up, AI Answer takes the call, speaks to the caller and leaves you the summary instead of a missed-call entry.',
    to: '/chatr/ai-call-answering',
    linkLabel: 'How AI call answering works',
  },
  {
    icon: Building2,
    title: 'Business communication',
    body: 'Official accounts, a shared team inbox and connected business channels so enquiries, orders and follow-ups are handled by a team rather than one phone.',
    to: '/chatr/business-messaging',
    linkLabel: 'Business messaging',
  },
];

const useCases = [
  {
    title: 'Recruiters screening applicants',
    body: 'An AI agent asks your qualifying questions over WhatsApp, records the answers and passes qualified candidates to a recruiter.',
    to: '/chatr/whatsapp-candidate-screening',
  },
  {
    title: 'Small businesses answering customers',
    body: 'Customer messages from email, WhatsApp and chat land in one inbox, so nothing waits because it arrived in the wrong app.',
    to: '/official-accounts',
  },
  {
    title: 'Anyone drowning in channels',
    body: 'One place to read and reply, with AI summaries for the threads that grew while you were away.',
    to: '/ai-assistant',
  },
  {
    title: 'People on weak networks',
    body: 'Audio encoded for very low bandwidth, video that adapts as the signal moves, and a call that resumes after a short drop.',
    to: '/chatr/calls-on-slow-networks',
  },
  {
    title: 'Anyone tired of unknown numbers',
    body: 'Look up a number against community spam reports before answering, and report the calls that reach you.',
    to: '/chatr/spam-call-protection',
  },
];


const PublicHome = () => {
  const homepageSchema = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${PRODUCTION_ORIGIN}/#organization`,
        name: ORGANIZATION_NAME,
        alternateName: 'Chatr',
        url: PRODUCTION_ORIGIN,
        logo: absoluteUrl('/chatr-logo.png'),
        sameAs: SOCIAL_PROFILES,
      },
      {
        '@type': 'WebSite',
        '@id': `${PRODUCTION_ORIGIN}/#website`,
        name: SITE_NAME,
        url: PRODUCTION_ORIGIN,
        inLanguage: 'en-IN',
        publisher: { '@id': `${PRODUCTION_ORIGIN}/#organization` },
      },
      {
        '@type': 'WebApplication',
        '@id': `${PRODUCTION_ORIGIN}/#webapp`,
        name: 'Chatr',
        alternateName: SITE_NAME,
        url: PRODUCTION_ORIGIN,
        applicationCategory: 'CommunicationApplication',
        operatingSystem: 'Web, Android',
        description: DEFAULT_DESCRIPTION,
        publisher: { '@id': `${PRODUCTION_ORIGIN}/#organization` },
        featureList: [
          'Universal inbox across email, WhatsApp, Slack and Teams',
          'AI assistant for summaries and drafted replies',
          'Configurable AI agents for routine replies',
          'Messaging, voice and video calling',
          'Official accounts and shared team inbox',
          'Phone-number sign-in',
        ],
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
      },
    ],
  };

  return (
    <>
      <SEOHead
        title={DEFAULT_TITLE}
        description={DEFAULT_DESCRIPTION}
        canonicalUrl="/"
        noIndex={false}
        schemaData={homepageSchema}
      />

      <main className="mx-auto max-w-4xl px-4 pb-24 pt-8">
        {/* Hero */}
        <header className="mb-12">
          <div className="mb-5 flex items-center gap-3">
            <img src={chatrIconLogo} alt="Chatr app logo" className="h-10 w-10 rounded-xl" />
            <span className="text-sm font-medium text-muted-foreground">
              Chatr — by {ORGANIZATION_NAME}
            </span>
          </div>

          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            Chatr is an AI-powered messaging app and universal inbox for the conversations your work
            actually happens in
          </h1>

          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Chatr brings messaging and calling together with a universal inbox for Gmail, Outlook,
            WhatsApp Business, Slack and Microsoft Teams, and adds an AI assistant that reads long
            threads, drafts replies and can answer routine messages for you. You sign in with your
            phone number — there is nothing else to install to get started on the web.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">
                <Smartphone className="mr-2 h-4 w-4" />
                Continue with your phone number
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/download">Get the Android app</Link>
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Sign-in uses a one-time code sent to your number. No email or password required.
          </p>
        </header>

        {/* What Chatr is / who it is for */}
        <section className="mb-12 rounded-2xl border border-border/60 bg-muted/30 p-5">
          <h2 className="text-lg font-semibold">Who Chatr is for</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Chatr is built for people whose conversations are scattered: a founder answering
            customers on WhatsApp and email, a recruiter screening applicants, a small support team
            sharing one business number, or anyone who simply wants one place to read and reply.
            It is a communication workspace rather than a single-channel chat app — messaging,
            calling, connected accounts and AI help in one product, and one account across web and
            Android.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Chatr is a product of {ORGANIZATION_NAME}. It is not affiliated with any mobile network
            or telecom brand using a similar name.
          </p>
        </section>

        {/* Capabilities */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold">What you can do in Chatr</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {capabilities.map((item) => (
              <article key={item.title} className="rounded-2xl border border-border/60 p-5">
                <item.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                <h3 className="mt-3 text-base font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                <Link
                  to={item.to}
                  className="mt-3 inline-flex items-center text-sm font-medium text-primary hover:underline"
                >
                  {item.linkLabel}
                  <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* Use cases */}
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-semibold">How people use it</h2>
          <ul className="space-y-3">
            {useCases.map((item) => (
              <li key={item.title}>
                <Link
                  to={item.to}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border/60 p-4 transition-colors hover:bg-muted/50"
                >
                  <span>
                    <span className="block text-sm font-medium">{item.title}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {item.body}
                    </span>
                  </span>
                  <ChevronRight
                    className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Security & privacy */}
        <section className="mb-12">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            Security and privacy
          </h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {[
              'Sign-in is phone-number based with a one-time code — Chatr does not ask you for the passwords of accounts you connect.',
              'Connected accounts like Gmail, Outlook, Slack and WhatsApp Business are authorised through each provider’s official API, and you can disconnect any of them at any time.',
              'Chatr conversations are encrypted in transit, and your data is scoped to your account by database-level access rules.',
              'AI drafts and summaries are shown to you before anything is sent, unless you deliberately configure an agent to reply on your behalf.',
            ].map((line) => (
              <li key={line} className="flex gap-2">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary"
                />
                <span className="leading-relaxed">{line}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Full detail is in the{' '}
            <Link to="/privacy" className="underline">
              privacy policy
            </Link>{' '}
            and{' '}
            <Link to="/terms" className="underline">
              terms of service
            </Link>
            .
          </p>
        </section>

        {/* Getting started */}
        <section className="mb-12 rounded-2xl border border-border/60 bg-muted/30 p-5">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            Getting started
          </h2>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>1. Sign in with your phone number and confirm the one-time code.</li>
            <li>2. Start messaging or calling straight away — your contacts are matched by number.</li>
            <li>
              3. Open Integrations to connect Gmail, Outlook, WhatsApp Business, Slack or Teams so
              their conversations appear in the universal inbox.
            </li>
            <li>4. Turn on the AI assistant, and set up an agent later if you want routine replies handled.</li>
          </ol>
          <Button asChild className="mt-5">
            <Link to="/auth">
              Sign in with your phone number
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </section>

        {/* Explore */}
        <section>
          <h2 className="mb-3 text-lg font-semibold">Explore Chatr</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { to: '/chatr/universal-inbox-ai', label: 'Universal inbox with AI' },
              { to: '/chatr/ai-messaging-assistant', label: 'AI messaging assistant' },
              { to: '/chatr/ai-agents', label: 'AI agents' },
              { to: '/chatr/business-messaging', label: 'Business messaging' },
              { to: '/chatr/whatsapp-candidate-screening', label: 'WhatsApp candidate screening' },
              { to: '/ai-assistant', label: 'AI assistant' },
              { to: '/ai-browser', label: 'AI browser' },
              { to: '/official-accounts', label: 'Official accounts' },
              { to: '/communities', label: 'Communities' },
              { to: '/jobs', label: 'Jobs on Chatr' },
              { to: '/download', label: 'Download the app' },
              { to: '/about', label: 'About Chatr' },
              { to: '/help', label: 'Help centre' },
              { to: '/contact', label: 'Contact us' },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-xl border border-border/60 px-4 py-3 text-sm transition-colors hover:bg-muted/50"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        <p className="mt-12 text-center text-xs text-muted-foreground">
          Chatr — A product of Talentxcel Services Pvt Ltd
        </p>
      </main>
    </>
  );
};

export default PublicHome;
