import { SeoLandingLayout } from '@/components/seo/SeoLandingLayout';

const LiveCallTranslation = () => (
  <SeoLandingLayout
    path="/chatr/live-call-translation"
    breadcrumbLabel="Live call translation"
    title="Live Call Translation Between Languages — Chatr"
    description="Speak your own language on a call and let the other person hear it in theirs. Chatr translates speech in both directions during a voice or video call, with captions you can read as you talk."
    h1="Speak Hindi, they hear Punjabi — translation during the call"
    intro="India is not a one-language country, and neither is a phone call. Chatr adds a translation layer to a normal voice or video call: you talk the way you always do, and the person on the other side hears the same thing in the language they set. Both directions run at once, so it is a conversation rather than a relay."
    sections={[
      {
        heading: 'How it works during a call',
        paragraphs: [
          'When translate mode is on, Chatr listens to short stretches of your speech, transcribes them, translates the text into the language the other person selected, and speaks it aloud on their device. The same happens in reverse for what they say. Each participant sets their own language, so neither of you has to agree on a common one.',
        ],
        bullets: [
          'Both directions translate at the same time — nobody waits their turn',
          'Each person picks their own language on their own device',
          'Captions appear alongside the spoken translation so you can re-read a line',
          'Works on a voice call and on a video call',
          'Off by default: you switch it on from the in-call controls',
        ],
      },
      {
        heading: 'Where people actually use it',
        paragraphs: [
          'A support agent in Delhi taking a call from a customer in Coimbatore. A recruiter speaking to a candidate who is far more fluent in Marathi than in English. A family spread across states. A field technician talking to a site supervisor. In each case the call already had to happen — translation just removes the part where one person struggles.',
        ],
      },
      {
        heading: 'What it is honest about',
        paragraphs: [
          'Live translation is speech recognition plus machine translation, so it is very good at ordinary conversation and weaker on names, slang, heavy background noise and technical jargon. Because the translated line is also shown as a caption, you can spot a wrong turn quickly and repeat yourself instead of discovering the mistake later.',
          'It needs a data connection for the recognition and translation steps. On a very slow connection, translation lags behind the audio, so you may prefer to turn it off and keep the call itself clear.',
        ],
      },
      {
        heading: 'Turning it on',
        paragraphs: [
          'Sign in with your phone number, start or answer a call, open the in-call controls and switch on translation. Set your language, and the other side sets theirs.',
        ],
      },
    ]}
    faqs={[
      {
        question: 'Does the other person need to change anything?',
        answer:
          'They set their own language on their own device. Nothing else on their side changes — it is the same call screen.',
      },
      {
        question: 'Can I read what was said as well as hear it?',
        answer:
          'Yes. Translated lines appear as captions during the call, which helps when a name or a number is easy to mishear.',
      },
      {
        question: 'Does it work on a video call?',
        answer: 'Yes, translation runs on both voice and video calls.',
      },
    ]}
    relatedLinks={[
      {
        label: 'When AI answers the call for you',
        to: '/chatr/ai-call-answering',
        description: 'Let an assistant take the call while you are busy.',
      },
      {
        label: 'Calls on slow networks',
        to: '/chatr/calls-on-slow-networks',
        description: 'How Chatr keeps a call up on 2G and weak signal.',
      },
      {
        label: 'AI messaging assistant',
        to: '/chatr/ai-messaging-assistant',
        description: 'Summaries, drafts and translation inside your chats.',
      },
      {
        label: 'Download Chatr',
        to: '/download',
        description: 'Get the Android app or open it in a browser.',
      },
    ]}
    ctaLabel="Sign in and try a translated call"
    ctaTo="/auth"
  />
);

export default LiveCallTranslation;
