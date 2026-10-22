import type { CommercialCampaign } from './types';

/**
 * CHATR COMMERCIAL GATEWAY — CAMPAIGN REGISTRY
 * 
 * Central registry of all 7 verified commercial destinations.
 * Invariants:
 * - 100% verified live destinations.
 * - Truthful headlines and value propositions extracted directly from verified production services.
 * - Zero fabricated customer numbers, discounts, or unverified claims.
 * - Standardized first-party campaign attribution parameters.
 */

export const COMMERCIAL_CAMPAIGNS: CommercialCampaign[] = [
  // ── 1. TalentXcel.in ──────────────────────────────────────────────────────────
  {
    id: 'talentxcel_in',
    brandName: 'TalentXcel.in',
    destinationUrl: 'https://talentxcel.in',
    displayHostname: 'talentxcel.in',
    category: 'CAREERS',
    categoryLabel: 'Career Pathways & Growth',
    headline: 'Careers, Skills & Professional Growth',
    valueProposition: 'Connect with tech and leadership networks, build your verified Career Passport, and benchmark your market trajectory.',
    ctaText: 'Explore Talent Network',
    badgeText: 'Career Network',
    accentColor: '#3B82F6',
    gradient: 'from-blue-600 via-indigo-600 to-sky-700',
    cardBgLight: 'bg-blue-50/80 hover:bg-blue-50',
    tags: ['Career Passport', 'Global Talent', 'AI Pathways'],
    weight: 9,
    enabled: true,
  },

  // ── 2. TalentXcel.net ─────────────────────────────────────────────────────────
  {
    id: 'talentxcel_net',
    brandName: 'TalentXcel Academy',
    destinationUrl: 'https://talentxcel.net',
    displayHostname: 'talentxcel.net',
    category: 'ACADEMY',
    categoryLabel: 'Practical AI & Tech Education',
    headline: 'Practical AI, Tech & Business Education',
    valueProposition: 'Master real-world AI development, healthcare technology, and computational thinking with intelligent tutoring.',
    ctaText: 'View Academy Catalog',
    badgeText: 'Global Academy',
    accentColor: '#8B5CF6',
    gradient: 'from-purple-600 via-indigo-700 to-violet-900',
    cardBgLight: 'bg-purple-50/80 hover:bg-purple-50',
    tags: ['AI Development', 'Integrated Foundation', 'Code Workbench'],
    weight: 8,
    enabled: true,
  },

  // ── 3. CHATR Business (chatrchat.in) ──────────────────────────────────────────
  {
    id: 'chatr_business',
    brandName: 'CHATR Business',
    destinationUrl: 'https://chatrchat.in',
    displayHostname: 'chatrchat.in',
    category: 'BUSINESS',
    categoryLabel: 'Customer Conversation OS',
    headline: 'Business Communication & Customer OS',
    valueProposition: 'Handle customer inquiries, free browser calling, shared team inboxes, and WhatsApp AI automation in one workspace.',
    ctaText: 'Discover Business OS',
    badgeText: 'B2B Platform',
    accentColor: '#10B981',
    gradient: 'from-emerald-600 via-teal-600 to-green-700',
    cardBgLight: 'bg-emerald-50/80 hover:bg-emerald-50',
    tags: ['Shared Inbox', 'WhatsApp AI', 'Browser Calling'],
    weight: 10,
    enabled: true,
  },

  // ── 4. Nuty Tales (nutytales.com) ─────────────────────────────────────────────
  {
    id: 'nutytales_apex',
    brandName: 'Nuty Tales',
    destinationUrl: 'https://nutytales.com',
    displayHostname: 'nutytales.com',
    category: 'GOURMET',
    categoryLabel: 'Single-Origin Gourmet',
    headline: 'Certified Kashmiri Harvest & Crafts',
    valueProposition: 'Direct-from-orchard Kagzi walnuts, Pampore Mongra saffron, high-oil Mamra almonds, and GI-certified artisanal crafts.',
    ctaText: 'Shop Gourmet Harvest',
    badgeText: 'Artisanal Harvest',
    accentColor: '#F59E0B',
    gradient: 'from-amber-600 via-orange-600 to-amber-800',
    cardBgLight: 'bg-amber-50/80 hover:bg-amber-50',
    tags: ['Single-Origin', 'Pampore Saffron', 'Kagzi Walnuts'],
    weight: 9,
    enabled: true,
  },

  // ── 5. NRI Nuty Tales (nri.nutytales.com) ─────────────────────────────────────
  {
    id: 'nutytales_nri',
    brandName: 'NRI Nuty Tales',
    destinationUrl: 'https://nri.nutytales.com',
    displayHostname: 'nri.nutytales.com',
    category: 'DIASPORA',
    categoryLabel: 'Global Diaspora Care',
    headline: 'India, Handled. From Anywhere in the World',
    valueProposition: 'Deliver bespoke gourmet gift hampers and verified care packages to family back home in India with door-to-door assurance.',
    ctaText: 'Send Hampers Home',
    badgeText: 'Diaspora Gifting',
    accentColor: '#EC4899',
    gradient: 'from-pink-600 via-rose-600 to-rose-800',
    cardBgLight: 'bg-pink-50/80 hover:bg-pink-50',
    tags: ['Parent Care Hampers', 'Worldwide Delivery', 'Verified Dispatch'],
    weight: 8,
    enabled: true,
  },

  // ── 6. Resume Builder (resume.talentxcel.in) ──────────────────────────────────
  {
    id: 'talentxcel_resume',
    brandName: 'Resume Builder',
    destinationUrl: 'https://resume.talentxcel.in',
    displayHostname: 'resume.talentxcel.in',
    category: 'TOOLS',
    categoryLabel: 'AI Resume Optimization',
    headline: 'Create a Resume That Gets You Noticed',
    valueProposition: 'Build ATS-friendly resumes, strengthen keyword scores, and export recruiter-approved PDF applications in minutes.',
    ctaText: 'Build ATS Resume Free',
    badgeText: 'Career Tool',
    accentColor: '#06B6D4',
    gradient: 'from-cyan-600 via-teal-600 to-sky-700',
    cardBgLight: 'bg-cyan-50/80 hover:bg-cyan-50',
    tags: ['ATS Parser', 'PDF Export', 'Recruiter Formats'],
    weight: 9,
    enabled: true,
  },

  // ── 7. Jobs (jobs.talentxcel.in) ──────────────────────────────────────────────
  {
    id: 'talentxcel_jobs',
    brandName: 'TalentXcel Jobs',
    destinationUrl: 'https://jobs.talentxcel.in',
    displayHostname: 'jobs.talentxcel.in',
    category: 'CAREERS',
    categoryLabel: 'Verified Job Opportunities',
    headline: 'Discover Jobs That Match Your Ambition',
    valueProposition: 'Search tech, remote, executive, and fresher opportunities directly from verified employers across India and overseas.',
    ctaText: 'Search Verified Jobs',
    badgeText: 'Verified Openings',
    accentColor: '#4F46E5',
    gradient: 'from-indigo-600 via-blue-700 to-indigo-900',
    cardBgLight: 'bg-indigo-50/80 hover:bg-indigo-50',
    tags: ['Verified Employers', 'Remote & Tech', '1-Click Apply'],
    weight: 10,
    enabled: true,
  },
];

/**
 * Generates attributed destination URL with consistent campaign parameters.
 */
export function getAttributedUrl(
  campaign: CommercialCampaign,
  placementContext: string = 'carousel'
): string {
  try {
    const url = new URL(campaign.destinationUrl);
    url.searchParams.set('utm_source', 'chatr');
    url.searchParams.set('utm_medium', 'owned_promotion');
    url.searchParams.set('utm_campaign', 'ecosystem_showcase');
    url.searchParams.set('utm_content', campaign.id);
    url.searchParams.set('utm_term', placementContext);
    url.searchParams.set('ref', `eco_chatr_${campaign.id}`);
    return url.toString();
  } catch {
    return campaign.destinationUrl;
  }
}

/**
 * Returns active campaigns ordered by weight.
 */
export function getActiveCampaigns(): CommercialCampaign[] {
  return COMMERCIAL_CAMPAIGNS
    .filter(c => c.enabled)
    .sort((a, b) => b.weight - a.weight);
}

/**
 * Kill-switch helper to check if commercial engine is enabled.
 */
export function isCommercialGatewayEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem('chatr_commercial_gateway_disabled') !== 'true';
  } catch {
    return true;
  }
}
