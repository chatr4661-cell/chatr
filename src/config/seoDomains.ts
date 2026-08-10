/**
 * CHATR — Domain registry for the SEO engine.
 *
 * Truth rule: a domain is only `owned: true` when THIS repository builds and
 * deploys the HTML served on it. Everything else is declared so Search Console
 * property mapping and future adapters have a place to live, but its URLs are
 * never emitted into this repository's sitemap or robots.txt.
 */

export type SeoDomainId = 'chatr.chat' | 'chatrchat.in' | 'talentxcel.in' | 'talentxcel.net';

export interface SeoDomain {
  id: SeoDomainId;
  origin: string;
  /** Does this repository render the HTML for this domain? */
  owned: boolean;
  /** Search Console property identifier, once verified. null = not verified here. */
  gscProperty: string | null;
  /** Audience/segment note — used only for internal organisation. */
  purpose: string;
  /** Content clusters this domain is responsible for. */
  clusters: string[];
}

export const SEO_DOMAINS: SeoDomain[] = [
  {
    id: 'chatr.chat',
    origin: 'https://chatr.chat',
    owned: true,
    gscProperty: 'https://chatr.chat/',
    purpose: 'Primary consumer + business product site built from this repository.',
    clusters: [
      'universal-inbox',
      'ai-messaging',
      'ai-assistant',
      'ai-agents',
      'business-communication',
      'whatsapp-candidate-screening',
      'recruitment-communication',
      'ai-productivity',
      'business-automation',
      'ai-workspace',
    ],
  },
  {
    id: 'chatrchat.in',
    origin: 'https://chatrchat.in',
    // Separate deployment. Shares the backend, not the frontend build.
    owned: false,
    gscProperty: null,
    purpose: 'India business surface. Separate repository/deployment.',
    clusters: ['business-communication', 'business-automation'],
  },
  {
    id: 'talentxcel.in',
    origin: 'https://talentxcel.in',
    owned: false,
    gscProperty: null,
    purpose: 'Recruitment product site. Separate repository/deployment.',
    clusters: [
      'ats-resume',
      'resume-builder',
      'ai-resume-parser',
      'candidate-screening',
      'recruitment-os',
      'recruiter-workflow',
      'fresher-hiring',
      'interview-preparation',
      'job-matching',
      'talent-acquisition',
    ],
  },
  {
    id: 'talentxcel.net',
    origin: 'https://talentxcel.net',
    owned: false,
    gscProperty: null,
    purpose: 'Corporate/global recruitment surface. Separate repository/deployment.',
    clusters: ['recruitment-os', 'talent-acquisition'],
  },
];

/** The one domain this build is allowed to emit URLs for. */
export const OWNED_DOMAIN = SEO_DOMAINS.find((d) => d.owned)!;

export const getDomain = (id: SeoDomainId): SeoDomain | undefined =>
  SEO_DOMAINS.find((d) => d.id === id);

/** Hostnames that must never appear in a canonical, sitemap or OG tag. */
export const FORBIDDEN_HOSTS = [
  'chatr.lovable.app',
  'lovable.app',
  'lovableproject.com',
  'localhost',
  '127.0.0.1',
  'vercel.app',
  'staging',
];
