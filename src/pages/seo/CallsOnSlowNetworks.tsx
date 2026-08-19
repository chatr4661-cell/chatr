import { SeoLandingLayout } from '@/components/seo/SeoLandingLayout';

const CallsOnSlowNetworks = () => (
  <SeoLandingLayout
    path="/chatr/calls-on-slow-networks"
    breadcrumbLabel="Calls on slow networks"
    title="Voice and Video Calls That Work on a Weak Signal — Chatr"
    description="Chatr calls are built for real Indian networks: low-bitrate audio for 2G, video quality that adapts as the signal moves, and a call that resumes instead of ending when the connection drops for a moment."
    h1="Calls built for a weak signal, not a perfect one"
    intro="Most calling apps are designed on office Wi-Fi and fall apart on a train, in a basement or on a village 2G cell. Chatr assumes the bad case: audio is encoded to survive very little bandwidth, video scales itself up and down as the signal moves, and a short drop is treated as an interruption to recover from rather than the end of the call."
    sections={[
      {
        heading: 'Audio first, at very low bitrates',
        paragraphs: [
          'Voice is the part that must never fail, so it is encoded with a low-bitrate speech codec and a buffer that adapts to how unstable the connection is. On a slow connection you lose fidelity, not the conversation.',
        ],
        bullets: [
          'Speech-optimised encoding that keeps working on very little bandwidth',
          'A jitter buffer that grows when packets arrive unevenly',
          'A signal indicator during the call, so a drop in quality is never a surprise',
          'Automatic step down from video to audio when there is not enough bandwidth for both',
          'A brief disconnection resumes the same call instead of forcing a redial',
        ],
      },
      {
        heading: 'Video that adapts instead of freezing',
        paragraphs: [
          'A video call starts at a resolution that connects quickly, then moves up if the connection can carry it and back down when it cannot. The aim is a call that keeps moving: reduced sharpness is far better than a frozen frame and a dropped call.',
        ],
      },
      {
        heading: 'Why the call survives a drop',
        paragraphs: [
          'Switching between mobile data and Wi-Fi, or crossing a dead patch, normally kills a call. Chatr keeps the call session alive for a short window and reconnects the media path, so both people come back to the same call.',
          'It is not magic: if the connection stays gone, the call ends. What changes is that a few seconds of no signal no longer costs you the conversation.',
        ],
      },
      {
        heading: 'Nothing to configure',
        paragraphs: [
          'Sign in with your phone number and call. The adaptation happens on its own; the indicator on the call screen tells you what the network is currently doing.',
        ],
      },
    ]}
    faqs={[
      {
        question: 'Will a video call work on 2G?',
        answer:
          'Audio is designed to work at very low bitrates. On a 2G-class connection Chatr will drop to audio rather than pretend video is viable.',
      },
      {
        question: 'What happens if I lose signal for a few seconds?',
        answer:
          'The call is held open for a short window and reconnects to the same conversation if the signal returns in time.',
      },
      {
        question: 'Can I see how good the connection is?',
        answer: 'Yes. The call screen shows a live signal quality indicator.',
      },
    ]}
    relatedLinks={[
      {
        label: 'Live call translation',
        to: '/chatr/live-call-translation',
        description: 'Both sides speak their own language.',
      },
      {
        label: 'When AI answers the call for you',
        to: '/chatr/ai-call-answering',
        description: 'Let an assistant take a call you cannot.',
      },
      {
        label: 'Spam and scam call protection',
        to: '/chatr/spam-call-protection',
        description: 'Community caller ID for unknown numbers.',
      },
      {
        label: 'Download Chatr',
        to: '/download',
        description: 'Get the Android app or open it in a browser.',
      },
    ]}
    ctaLabel="Sign in and make a call"
    ctaTo="/auth"
  />
);

export default CallsOnSlowNetworks;
