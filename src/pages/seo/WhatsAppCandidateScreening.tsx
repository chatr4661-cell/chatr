import { SeoLandingLayout } from '@/components/seo/SeoLandingLayout';

const WhatsAppCandidateScreening = () => (
  <SeoLandingLayout
    path="/chatr/whatsapp-candidate-screening"
    breadcrumbLabel="WhatsApp candidate screening"
    title="WhatsApp Candidate Screening with AI — Chatr+"
    description="Screen job applicants over WhatsApp with an AI agent that asks your qualifying questions, records answers and hands qualified candidates to your recruiters."
    h1="WhatsApp candidate screening with an AI agent"
    intro="Most applicants reply on WhatsApp, not email. Chatr+ connects a WhatsApp Business number to an AI screening agent that asks your qualifying questions, collects the answers in a structured form and passes only the candidates who match to your recruiters."
    sections={[
      {
        heading: 'Why screening moves to WhatsApp',
        paragraphs: [
          'For high-volume hiring in India — retail, delivery, field sales, nursing assistants, support roles — a WhatsApp message gets answered within minutes while a screening call often goes unanswered and an email is never opened.',
          'The problem is volume. One recruiter cannot ask the same six questions to four hundred applicants. That repetition is exactly what an AI screening agent handles well, because the questions are fixed and the answers are checkable.',
        ],
      },
      {
        heading: 'How it works in Chatr+',
        paragraphs: [
          'You connect a WhatsApp Business number to Chatr+, write your screening questions once, and define what a qualified answer looks like — minimum experience, location, shift availability, language, documents.',
        ],
        bullets: [
          'A candidate applies or messages your WhatsApp number and the agent opens the screening conversation.',
          'The agent asks your questions one at a time, in the language the candidate replies in, and re-asks when an answer is unclear.',
          'Answers are saved against the candidate record, so a recruiter reads a summary instead of scrolling a chat.',
          'Candidates who meet your criteria are routed to a recruiter; the rest get a clear, polite reply.',
          'A recruiter can take over the same conversation at any point — the agent stops when a human joins.',
        ],
      },
      {
        heading: 'What stays with a human',
        paragraphs: [
          'The agent screens; it does not decide. Hiring judgement, salary discussion, offer conversations and anything sensitive stay with your recruiters. Every AI-collected answer remains visible next to the original message, so a recruiter can check what the candidate actually said.',
        ],
      },
      {
        heading: 'What you need to start',
        paragraphs: [
          'A WhatsApp Business number connected through the WhatsApp Cloud API, your screening questions, and the roles you are hiring for. WhatsApp does not allow automation on personal accounts, so screening runs on a business number only.',
        ],
      },
    ]}
    faqs={[
      {
        question: 'Does this work with a personal WhatsApp account?',
        answer:
          'No. Meta only permits automated messaging through the WhatsApp Business Cloud API, so screening requires a WhatsApp Business number.',
      },
      {
        question: 'Which languages can the agent screen in?',
        answer:
          'The agent replies in the language the candidate writes in, including Hindi and English, and mixed Hinglish messages.',
      },
      {
        question: 'Can a recruiter take over mid-conversation?',
        answer:
          'Yes. When a recruiter replies in the conversation the agent stops responding and the thread continues as a normal human chat.',
      },
    ]}
    ctaLabel="Set up AI screening"
    ctaTo="/ai-agents"
    relatedLinks={[
      {
        label: 'AI Agents',
        to: '/ai-agents',
        description: 'Build the agent that runs your screening questions.',
      },
      {
        label: 'Universal inbox with AI',
        to: '/chatr/universal-inbox-ai',
        description: 'Bring WhatsApp, email and chat channels into one inbox.',
      },
      {
        label: 'Jobs on Chatr+',
        to: '/jobs',
        description: 'Post roles and receive applications inside Chatr+.',
      },
      {
        label: 'AI Assistant',
        to: '/ai-assistant',
        description: 'Draft replies and summarise long candidate threads.',
      },
    ]}
  />
);

export default WhatsAppCandidateScreening;
