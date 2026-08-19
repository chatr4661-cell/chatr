import { SeoLandingLayout } from '@/components/seo/SeoLandingLayout';

const AiCallAnswering = () => (
  <SeoLandingLayout
    path="/chatr/ai-call-answering"
    breadcrumbLabel="AI call answering"
    title="Let AI Answer the Call When You Are Busy — Chatr"
    description="Tap AI Answer instead of declining. A Chatr assistant picks up the call, talks to the caller in plain language, finds out why they rang and leaves you the summary."
    h1="Too busy to pick up? Let AI answer the call"
    intro="Declining a call tells the caller nothing and leaves you guessing what it was about. On an incoming Chatr call you can tap AI Answer instead: the assistant takes the call, speaks to the person, asks why they are calling, and hands you a readable account of the conversation afterwards."
    sections={[
      {
        heading: 'What the caller experiences',
        paragraphs: [
          'The call connects normally. Instead of you, the caller hears an assistant that speaks, listens and responds — it says you are unavailable, asks what the call is about and can take a message or a callback preference. It is a spoken conversation, not a menu with numbers to press.',
        ],
        bullets: [
          'Appears as a third button on the incoming call screen, next to accept and decline',
          'The assistant speaks and listens in real time, both directions',
          'The caller is told plainly that they are speaking to an assistant',
          'You get the conversation afterwards instead of a missed-call entry',
          'Entirely optional — the normal accept and decline buttons behave as before',
        ],
      },
      {
        heading: 'When it is the right choice',
        paragraphs: [
          'In a meeting, driving, in a hospital waiting room, on another call, or facing an unknown number you do not want to answer blind. In all of those, AI Answer is better than a decline: the caller is dealt with politely and you keep the information.',
        ],
      },
      {
        heading: 'Where it stops',
        paragraphs: [
          'The assistant is there to find out why someone called and take a message. It does not make commitments on your behalf, agree to money, or handle anything that needs you. When a call clearly needs a person, that is the answer it gives — and you still have the record so you can call back.',
          'It relies on speech recognition, so a very noisy line or a heavy accent can produce a rough transcript. The summary is a starting point, not a legal record of what was said.',
        ],
      },
      {
        heading: 'Using it',
        paragraphs: [
          'Sign in with your phone number. The next time a call comes in and you cannot take it, tap AI Answer on the incoming call screen.',
        ],
      },
    ]}
    faqs={[
      {
        question: 'Does the caller know it is not me?',
        answer:
          'Yes. The assistant says up front that you are unavailable and that it is taking the call.',
      },
      {
        question: 'What do I get afterwards?',
        answer:
          'A written account of the conversation, so you can see who called, why, and whether they need a callback.',
      },
      {
        question: 'Can it answer every call automatically?',
        answer:
          'No. It only runs when you choose AI Answer on that specific incoming call.',
      },
    ]}
    relatedLinks={[
      {
        label: 'Live call translation',
        to: '/chatr/live-call-translation',
        description: 'Two people, two languages, one call.',
      },
      {
        label: 'Spam and scam call protection',
        to: '/chatr/spam-call-protection',
        description: 'See who is calling before you decide.',
      },
      {
        label: 'AI agents in Chatr',
        to: '/chatr/ai-agents',
        description: 'The same idea applied to messages instead of calls.',
      },
      {
        label: 'Download Chatr',
        to: '/download',
        description: 'Get the Android app or open it in a browser.',
      },
    ]}
    ctaLabel="Sign in to use AI Answer"
    ctaTo="/auth"
  />
);

export default AiCallAnswering;
