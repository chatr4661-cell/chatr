import { SeoLandingLayout } from '@/components/seo/SeoLandingLayout';

const SpamCallProtection = () => (
  <SeoLandingLayout
    path="/chatr/spam-call-protection"
    breadcrumbLabel="Spam call protection"
    title="Spam and Scam Call Protection with Caller ID — Chatr"
    description="Look up an unknown number, see how many people reported it as spam or a scam, and report the ones that reach you. Chatr's caller ID is built from what the community reports."
    h1="Know who is calling before you answer"
    intro="Most unwanted calls are not new — someone else has already had the same call and reported it. Chatr turns that into caller ID: you can look up a number, see how often it has been reported and what people reported it as, and add your own report when a spam or scam call reaches you."
    sections={[
      {
        heading: 'Community reports, not a mystery score',
        paragraphs: [
          'When a call is reported in Chatr, the report is stored against the number with a reason. Look up a number and you see how many reports exist and what share of them call it spam, rather than a single opaque rating you cannot interrogate.',
        ],
        bullets: [
          'Search any phone number and see its reported history',
          'A list of the most-reported numbers, so you can recognise a pattern',
          'Report a caller as spam, a scam, a sales call or a wrong number',
          'Report counts and spam share shown together, so a single angry report cannot brand a number',
          'Numbers are stored in the standard international format, so the same number matches wherever it is dialled from',
        ],
      },
      {
        heading: 'Why crowd reporting works',
        paragraphs: [
          'Spam operations dial thousands of people from the same handful of numbers. The first few people who receive a call cannot know what it is — but once they report it, everyone after them can. Accuracy comes from volume: a number with many reports and a high spam share is a safe bet, while one report on its own is only a hint.',
        ],
      },
      {
        heading: 'What it is not',
        paragraphs: [
          'This is a community reporting system, not a directory of names and addresses, and not a blocklist maintained by a regulator. A number with no reports simply has no history yet — it is not a verdict that the call is safe.',
          'Reports describe behaviour, not identity. Use them to decide whether to answer, not as proof about a person.',
        ],
      },
      {
        heading: 'Looking a number up',
        paragraphs: [
          'Sign in with your phone number and open Caller ID to search a number or report one that just called you.',
        ],
      },
    ]}
    faqs={[
      {
        question: 'What happens when I report a number?',
        answer:
          'The report is added to that number\'s history with the reason you chose, so the next person who looks it up sees it.',
      },
      {
        question: 'Will it show the caller\'s name?',
        answer:
          'It shows what the community reported about the number, not a personal directory listing.',
      },
      {
        question: 'A number has no reports — is it safe?',
        answer:
          'It only means nobody has reported it yet. Treat an unknown number with no history as unknown.',
      },
    ]}
    relatedLinks={[
      {
        label: 'When AI answers the call for you',
        to: '/chatr/ai-call-answering',
        description: 'Screen a call you do not want to take blind.',
      },
      {
        label: 'Calls on slow networks',
        to: '/chatr/calls-on-slow-networks',
        description: 'Voice and video that survives a weak signal.',
      },
      {
        label: 'Live call translation',
        to: '/chatr/live-call-translation',
        description: 'Two languages on the same call.',
      },
      {
        label: 'Download Chatr',
        to: '/download',
        description: 'Get the Android app or open it in a browser.',
      },
    ]}
    ctaLabel="Sign in and look up a number"
    ctaTo="/auth"
  />
);

export default SpamCallProtection;
