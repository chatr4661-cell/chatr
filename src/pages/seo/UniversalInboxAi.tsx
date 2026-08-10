import { SeoLandingLayout } from '@/components/seo/SeoLandingLayout';

const UniversalInboxAi = () => (
  <SeoLandingLayout
    path="/chatr/universal-inbox-ai"
    breadcrumbLabel="Universal inbox with AI"
    title="Universal Inbox with AI — Chatr+"
    description="Bring Gmail, Outlook, WhatsApp, Slack and Teams into one Chatr+ inbox, with AI summaries and replies that work across every channel."
    h1="One inbox for email, WhatsApp and team chat"
    intro="Work arrives in five places at once: a client emails, a candidate replies on WhatsApp, a colleague pings Slack, a calendar invite lands in Outlook. The Chatr+ universal inbox connects those accounts and shows every conversation in one list, with AI help for reading and replying."
    sections={[
      {
        heading: 'What gets connected',
        paragraphs: [
          'Chatr+ connects your accounts through each provider\u2019s official API, so nothing is scraped and your credentials are never shared with the app itself.',
        ],
        bullets: [
          'Gmail and Google Calendar',
          'Outlook mail, Microsoft Calendar and Microsoft Teams',
          'WhatsApp Business Cloud API',
          'Slack channels and direct messages',
          'Chatr+ conversations and calls',
        ],
      },
      {
        heading: 'Why one inbox changes the work',
        paragraphs: [
          'Switching apps costs more than the seconds it takes. Context resets, replies get delayed, and a thread that needed one answer turns into three follow-ups.',
          'A single list ordered by recency means you answer the oldest waiting message rather than whichever tab you happened to open. Threads keep their channel label, so a WhatsApp reply still goes out over WhatsApp.',
        ],
      },
      {
        heading: 'Where AI helps, and where it does not',
        paragraphs: [
          'AI summarises long threads, drafts a reply in your usual tone and pulls out what someone actually asked for. You read the draft before it sends.',
          'Nothing is sent automatically unless you explicitly configure an agent to answer a defined type of message. Summaries always sit next to the original text so you can check them.',
        ],
      },
      {
        heading: 'Set-up in short',
        paragraphs: [
          'Open Integrations in Chatr+, sign in to each account you want to connect, and pick the first sync. Every connection shows its current status and last sync time, and you can disconnect an account at any point.',
        ],
      },
    ]}
    faqs={[
      {
        question: 'Does Chatr+ store my mailbox password?',
        answer:
          'No. Connections use OAuth with the provider, so Chatr+ receives a revocable access token and never sees your password.',
      },
      {
        question: 'Can I reply from the universal inbox in the original channel?',
        answer:
          'Yes. A reply to an email goes out as email, and a reply to a WhatsApp message goes out over WhatsApp from your business number.',
      },
    ]}
    ctaLabel="Connect your accounts"
    ctaTo="/connectors"
    relatedLinks={[
      {
        label: 'AI Assistant',
        to: '/ai-assistant',
        description: 'Summarise threads and draft replies across channels.',
      },
      {
        label: 'AI Agents',
        to: '/ai-agents',
        description: 'Automate the repeatable replies in your inbox.',
      },
      {
        label: 'WhatsApp candidate screening',
        to: '/chatr/whatsapp-candidate-screening',
        description: 'Screen applicants on WhatsApp with an AI agent.',
      },
      {
        label: 'Official Accounts',
        to: '/official-accounts',
        description: 'Give your business a verified presence and a team inbox.',
      },
    ]}
  />
);

export default UniversalInboxAi;
