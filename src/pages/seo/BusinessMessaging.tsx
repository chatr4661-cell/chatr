import { SeoLandingLayout } from '@/components/seo/SeoLandingLayout';

const BusinessMessaging = () => (
  <SeoLandingLayout
    path="/chatr/business-messaging"
    breadcrumbLabel="Business messaging"
    title="Business Messaging and Shared Inbox — Chatr"
    description="Run customer conversations from a verified Chatr official account with a shared team inbox across email, WhatsApp Business, Slack and Teams."
    h1="Business messaging that a team can actually share"
    intro="A business outgrows one phone quickly. Chatr gives a business a verified official account, a shared inbox that the whole team can see, and connected channels so an enquiry that arrives by email and a follow-up that arrives on WhatsApp are the same conversation."
    sections={[
      {
        heading: 'What a business gets',
        paragraphs: [
          'The account belongs to the business, not to whoever happens to hold the handset. People joining or leaving the team does not take conversation history with them.',
        ],
        bullets: [
          'A verified official account with a clear business identity',
          'A shared inbox your team reads and replies from together',
          'Connected channels: Gmail, Outlook, WhatsApp Business, Slack, Microsoft Teams',
          'AI summaries and drafts on customer threads',
          'AI agents for the routine questions, with hand-off to a person',
        ],
      },
      {
        heading: 'One conversation, whichever channel it arrived on',
        paragraphs: [
          'Replies go back out over the channel the customer used, so nobody is asked to move to a different app to continue.',
          'Because everything is in one list ordered by recency, the oldest waiting customer gets answered — rather than whoever happens to be in the tab that is open.',
        ],
      },
      {
        heading: 'Who this suits',
        paragraphs: [
          'Small and mid-sized businesses handling enquiries, orders and support with a handful of people: local sellers, clinics, service providers, recruiters and agencies.',
        ],
      },
      {
        heading: 'Setting it up',
        paragraphs: [
          'Sign in with your phone number, create your official account, then open Integrations and connect the channels your customers already message you on. WhatsApp uses the official WhatsApp Business Cloud API.',
        ],
      },
    ]}
    faqs={[
      {
        question: 'Can several people answer from the same number?',
        answer: 'Yes. The shared inbox is what the whole team reads and replies from.',
      },
      {
        question: 'Does connecting WhatsApp need a business account?',
        answer:
          'Yes — a WhatsApp Business account and the Cloud API, which you authorise through Meta.',
      },
      {
        question: 'Can AI handle the first reply?',
        answer:
          'Yes, if you configure an agent for it. Anything outside its scope goes to a person.',
      },
    ]}
    relatedLinks={[
      {
        label: 'Official accounts',
        to: '/official-accounts',
        description: 'Create the verified business presence in the app.',
      },
      {
        label: 'Universal inbox with AI',
        to: '/chatr/universal-inbox-ai',
        description: 'How the connected channels come into one inbox.',
      },
      {
        label: 'AI agents',
        to: '/chatr/ai-agents',
        description: 'Automate routine replies with a controlled hand-off.',
      },
      {
        label: 'Chatr',
        to: '/',
        description: 'What Chatr is and who it is for.',
      },
    ]}
    ctaLabel="Sign in with your phone number"
    ctaTo="/auth"
  />
);

export default BusinessMessaging;
