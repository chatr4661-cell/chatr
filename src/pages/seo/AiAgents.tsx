import { SeoLandingLayout } from '@/components/seo/SeoLandingLayout';

const AiAgents = () => (
  <SeoLandingLayout
    path="/chatr/ai-agents"
    breadcrumbLabel="AI agents"
    title="AI Agents for Messaging — Chatr"
    description="Set up AI agents in Chatr that answer routine messages, ask qualifying questions and hand a conversation to a person the moment it needs one."
    h1="AI agents that answer the routine messages for you"
    intro="Most incoming messages are the same handful of questions: are you open, what does it cost, is the order shipped, can you send the details again. A Chatr agent handles that defined set of messages with your own answers, and passes anything outside it to a person — with the conversation history intact."
    sections={[
      {
        heading: 'What an agent is',
        paragraphs: [
          'An agent is a set of instructions you write, attached to a channel or an account. You define what it should answer, what it must never answer, and when it should hand over.',
        ],
        bullets: [
          'Reply to a defined set of routine questions in your own wording',
          'Ask qualifying questions and record the answers as structured data',
          'Escalate to a human when a message falls outside its scope',
          'Run on Chatr conversations and on connected channels such as WhatsApp Business',
          'Stay off entirely until you switch it on',
        ],
      },
      {
        heading: 'Hand-off is the important part',
        paragraphs: [
          'An agent that cannot admit it is out of depth costs more than it saves. Chatr agents hand over rather than improvise: the conversation moves to a person, who sees everything the agent already said.',
          'Because agents run inside the same inbox as everything else, an escalated conversation is not a new ticket in a different tool — it is the same thread.',
        ],
      },
      {
        heading: 'Common setups',
        paragraphs: [
          'Recruiters use an agent to screen applicants over WhatsApp before a recruiter spends time on a call. Businesses use one on their official account to answer opening hours, pricing and order status. Teams use one on a shared inbox so the first reply is never hours late.',
        ],
      },
      {
        heading: 'Setting one up',
        paragraphs: [
          'Sign in, open AI Agents, write the instructions and the questions you want asked, pick the channel it runs on, and turn it on. You can read every conversation it handled and change the instructions at any time.',
        ],
      },
    ]}
    faqs={[
      {
        question: 'Will an agent reply to everything?',
        answer:
          'Only to what you scoped it to. Anything else is handed to a person rather than guessed at.',
      },
      {
        question: 'Can I see what the agent said?',
        answer:
          'Yes. Agent conversations sit in the same inbox as the rest, so you can read the full thread.',
      },
      {
        question: 'Does it work on WhatsApp?',
        answer:
          'Yes, through the official WhatsApp Business Cloud API once you connect your business number.',
      },
    ]}
    relatedLinks={[
      {
        label: 'WhatsApp candidate screening',
        to: '/chatr/whatsapp-candidate-screening',
        description: 'A worked example of an agent screening applicants.',
      },
      {
        label: 'AI messaging assistant',
        to: '/chatr/ai-messaging-assistant',
        description: 'Summaries, drafts and translation inside your own chats.',
      },
      {
        label: 'Business messaging',
        to: '/chatr/business-messaging',
        description: 'Official accounts and a shared inbox for a team.',
      },
      {
        label: 'AI agents in the app',
        to: '/ai-agents',
        description: 'Open the agent builder and configure your first agent.',
      },
    ]}
    ctaLabel="Sign in with your phone number"
    ctaTo="/auth"
  />
);

export default AiAgents;
