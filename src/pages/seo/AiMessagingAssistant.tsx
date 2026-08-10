import { SeoLandingLayout } from '@/components/seo/SeoLandingLayout';

const AiMessagingAssistant = () => (
  <SeoLandingLayout
    path="/chatr/ai-messaging-assistant"
    breadcrumbLabel="AI messaging assistant"
    title="AI Messaging Assistant — Chatr"
    description="Use an AI assistant inside your own conversations in Chatr: summarise long threads, draft replies in your tone and translate a chat between languages."
    h1="An AI assistant that works inside your messages"
    intro="Most AI tools live in a separate tab, so you copy a thread out, paste an answer back and lose the context in between. In Chatr the assistant sits in the conversation itself — it can read the thread you are looking at, summarise it, draft a reply for you to edit, or translate what the other person said."
    sections={[
      {
        heading: 'What the assistant does in a conversation',
        paragraphs: [
          'The assistant works on the thread in front of you, not on a copy of it. You stay the sender: every draft is shown to you before it goes out.',
        ],
        bullets: [
          'Summarise a long thread down to what was asked and what is still open',
          'Draft a reply you can edit, in the tone you normally write in',
          'Translate messages so two people can each write in their own language',
          'Pull out dates, amounts and action items mentioned in the conversation',
          'Answer a general question without leaving the chat',
        ],
      },
      {
        heading: 'Voice and calls',
        paragraphs: [
          'Chatr also handles voice. You can speak to the assistant instead of typing, and on a call the assistant can translate speech between two languages so both sides can talk naturally.',
          'If you cannot pick up, AI Answer can take the call, speak with the caller and give you what they wanted afterwards.',
        ],
      },
      {
        heading: 'Where it stops',
        paragraphs: [
          'The assistant does not send anything on its own. Automatic replies only happen when you explicitly set up an agent for a defined kind of message, which is a separate, deliberate step.',
          'Summaries are shown next to the original messages so you can always check them against what was actually written.',
        ],
      },
      {
        heading: 'Getting started',
        paragraphs: [
          'Sign in with your phone number, open any conversation and use the assistant from the message composer. Connecting Gmail, Outlook, WhatsApp Business, Slack or Teams brings those threads into the same place, so the assistant can help on them too.',
        ],
      },
    ]}
    faqs={[
      {
        question: 'Does the AI reply to people without me seeing it?',
        answer:
          'No. Drafts are shown to you first. Automatic replies only happen for an agent you configured yourself.',
      },
      {
        question: 'Which languages does translation cover?',
        answer:
          'Translation covers widely used Indian and international languages, including Hindi, Punjabi, Marathi, Tamil, Bengali and English, in text and on calls.',
      },
      {
        question: 'Do I need a separate AI subscription?',
        answer:
          'No. The assistant is part of Chatr and you sign in with the same phone number you use for messaging.',
      },
    ]}
    relatedLinks={[
      {
        label: 'Universal inbox with AI',
        to: '/chatr/universal-inbox-ai',
        description: 'Bring Gmail, Outlook, WhatsApp, Slack and Teams into one list.',
      },
      {
        label: 'AI agents',
        to: '/chatr/ai-agents',
        description: 'Let a configured agent handle routine, repetitive replies.',
      },
      {
        label: 'AI assistant in the app',
        to: '/ai-assistant',
        description: 'Open the assistant and try it on your own conversations.',
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

export default AiMessagingAssistant;
