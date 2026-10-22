/**
 * MULTI-DOMAIN GROWTH OS — CONTEXTUAL CROSS-DISCOVERY MATRIX
 * 
 * Defines approved, high-utility, value-additive crossover journeys between
 * CHATR, TalentXcel (.in & .net), and Nuty Tales.
 * 
 * STRICT COMPLIANCE RULES:
 * 1. Zero forced redirects: Navigation is always explicitly user-initiated.
 * 2. Zero session sharing / silent SSO: Each property maintains isolated authentication.
 * 3. Zero sensitive data transmission: No PII or candidate resumes passed across domains.
 * 4. Contextual relevance threshold: Only displayed when intent directly bridges both domains.
 * 5. Deterministic first-party referral tagging: Format ?ref=eco_{source}_{campaign}_{placement}.
 */

export interface DiscoveryJourneyRule {
  id: string;
  sourceEntity: string;
  sourceDomain: string;
  sourceRoutePattern: RegExp;
  targetEntity: string;
  targetDomain: string;
  targetLandingPath: string;
  userContext: string;
  userValueProposition: string;
  ctaText: string;
  referralCampaign: string;
  placementLocation: 'FOOTER_ECOSYSTEM' | 'INLINE_CALLOUT' | 'SIDEBAR_RESOURCE' | 'POST_CONVERSION_BADGE';
  relevanceConfidenceScore: number; // 0.00 to 1.00
}

export const CROSS_DISCOVERY_RULES: DiscoveryJourneyRule[] = [
  // ── Journey 1: Job Seekers needing Multilingual / International Communication ──
  {
    id: 'TX_CANDIDATE_TO_CHATR_TRANSLATE',
    sourceEntity: 'TALENTXCEL_IN',
    sourceDomain: 'jobs.talentxcel.in',
    sourceRoutePattern: /^\/jobs\/(international|remote|multilingual|gulf|japan|germany|dubai)/i,
    targetEntity: 'CHATR_GLOBAL',
    targetDomain: 'chatr.chat',
    targetLandingPath: '/translate/en/hi',
    userContext: 'Candidate browsing global or bilingual job roles requiring cross-language fluency',
    userValueProposition: 'Prepare for multilingual client interviews with free, zero-latency real-time voice and text translation.',
    ctaText: 'Practice with CHATR Live Translation →',
    referralCampaign: 'tx_jobs_multilingual_prep',
    placementLocation: 'SIDEBAR_RESOURCE',
    relevanceConfidenceScore: 0.94,
  },

  // ── Journey 2: Employers posting jobs needing Corporate Gifting / Hampers ──────
  {
    id: 'TX_EMPLOYER_TO_NUTY_GIFTING',
    sourceEntity: 'TALENTXCEL_IN',
    sourceDomain: 'employers.talentxcel.in',
    sourceRoutePattern: /^\/(onboarding|welcome-kits|employer-branding|company)/i,
    targetEntity: 'NUTY_TALES',
    targetDomain: 'gifting.nutytales.com',
    targetLandingPath: '/',
    userContext: 'Hiring managers and HR teams designing new hire welcome packages or executive anniversary gifts',
    userValueProposition: 'Source premium organic Kashmiri dry fruit hampers and customized executive onboarding boxes.',
    ctaText: 'Explore Corporate Gifting by Nuty Tales →',
    referralCampaign: 'tx_employers_welcome_hampers',
    placementLocation: 'INLINE_CALLOUT',
    relevanceConfidenceScore: 0.91,
  },

  // ── Journey 3: CHATR Business Directory Merchants needing Local Hiring ─────────
  {
    id: 'CHATR_BUSINESS_TO_TX_EMPLOYERS',
    sourceEntity: 'CHATR_INDIA_B2B',
    sourceDomain: 'chatrchat.in',
    sourceRoutePattern: /^\/business\/(directory|merchant-tools|retail|logistics)/i,
    targetEntity: 'TALENTXCEL_IN',
    targetDomain: 'employers.talentxcel.in',
    targetLandingPath: '/',
    userContext: 'Growing retail businesses and MSMEs experiencing operational scaling on CHATR Business OS',
    userValueProposition: 'Hire verified local sales, billing, and logistics staff with zero recruiter commission on TalentXcel.',
    ctaText: 'Post Local Jobs on TalentXcel →',
    referralCampaign: 'chatr_b2b_hire_staff',
    placementLocation: 'INLINE_CALLOUT',
    relevanceConfidenceScore: 0.89,
  },

  // ── Journey 4: TalentXcel Students seeking Global AI Academy Degrees ───────────
  {
    id: 'TX_IN_STUDENT_TO_TX_NET_ACADEMY',
    sourceEntity: 'TALENTXCEL_IN',
    sourceDomain: 'learning.talentxcel.in',
    sourceRoutePattern: /^\/courses\/(artificial-intelligence|deep-learning|llm|data-science)/i,
    targetEntity: 'TALENTXCEL_NET',
    targetDomain: 'talentxcel.net',
    targetLandingPath: '/programmes/ai-development',
    userContext: 'Top-tier tech students completing domestic skill modules and seeking advanced global AI fellow accreditation',
    userValueProposition: 'Apply for the selective global TalentXcel Academy AI Fellow Programme with live code evaluation workbench.',
    ctaText: 'Explore TalentXcel Global Academy →',
    referralCampaign: 'tx_in_advanced_ai_pathway',
    placementLocation: 'SIDEBAR_RESOURCE',
    relevanceConfidenceScore: 0.96,
  },

  // ── Journey 5: Nuty Tales NRI Customers needing Zero-Cost Home Calling ─────────
  {
    id: 'NUTY_NRI_TO_CHATR_CALLS',
    sourceEntity: 'NUTY_TALES',
    sourceDomain: 'nri.nutytales.com',
    sourceRoutePattern: /^\/(checkout\/success|order-confirmation|heritage)/i,
    targetEntity: 'CHATR_GLOBAL',
    targetDomain: 'chatr.chat',
    targetLandingPath: '/calls',
    userContext: 'Diaspora customers sending luxury dry fruit gift boxes to aging parents and family in India',
    userValueProposition: 'Stay connected with crystal-clear, zero-cost, end-to-end encrypted WebRTC audio and video calling to family.',
    ctaText: 'Call Home Free with CHATR →',
    referralCampaign: 'nuty_nri_family_calling',
    placementLocation: 'POST_CONVERSION_BADGE',
    relevanceConfidenceScore: 0.93,
  },

  // ── Journey 6: Nuty Tales Luxury Wedding Visitors needing Destination Travel ────
  {
    id: 'NUTY_WEDDING_TO_NUTY_STAYS_TRAVEL',
    sourceEntity: 'NUTY_TALES',
    sourceDomain: 'weddings.nutytales.com',
    sourceRoutePattern: /^\/(venues|destinations|planning)/i,
    targetEntity: 'NUTY_TALES',
    targetDomain: 'stays.nutytales.com',
    targetLandingPath: '/',
    userContext: 'Wedding party coordinators planning destination wedding guests accommodations in Kashmir',
    userValueProposition: 'Reserve private heritage orchard estates and luxury riverside boutique chalets for bridal party guests.',
    ctaText: 'Book Orchard Estates on Nuty Tales Stays →',
    referralCampaign: 'nuty_weddings_orchard_stays',
    placementLocation: 'SIDEBAR_RESOURCE',
    relevanceConfidenceScore: 0.95,
  },

  // ── Journey 7: TalentXcel Academy Global Students using CHATR SI Assistant ─────
  {
    id: 'TX_NET_STUDENT_TO_CHATR_SI',
    sourceEntity: 'TALENTXCEL_NET',
    sourceDomain: 'talentxcel.net',
    sourceRoutePattern: /^\/laptop-requirements|how-it-works/i,
    targetEntity: 'CHATR_GLOBAL',
    targetDomain: 'chatr.chat',
    targetLandingPath: '/',
    userContext: 'Remote academy fellows looking for zero-latency peer study group chat and AI copilot sync',
    userValueProposition: 'Use CHATR Personal Intelligence (SI) to study collaboratively with global classmates in your browser.',
    ctaText: 'Collaborate with CHATR SI →',
    referralCampaign: 'tx_net_study_group_si',
    placementLocation: 'FOOTER_ECOSYSTEM',
    relevanceConfidenceScore: 0.88,
  },
];

/**
 * Generates an attributed cross-discovery destination URL.
 */
export function buildAttributedCrossUrl(rule: DiscoveryJourneyRule): string {
  const url = new URL(rule.targetLandingPath, `https://${rule.targetDomain}`);
  url.searchParams.set('ref', `eco_${rule.sourceEntity.toLowerCase()}_${rule.referralCampaign}`);
  url.searchParams.set('utm_source', rule.sourceDomain);
  url.searchParams.set('utm_medium', 'ecosystem_referral');
  url.searchParams.set('utm_campaign', rule.referralCampaign);
  return url.toString();
}

/**
 * Finds all approved crossover rules for a given current page URL.
 */
export function matchCrossDiscoveryRules(currentHostname: string, currentPath: string): DiscoveryJourneyRule[] {
  const cleanHost = currentHostname.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return CROSS_DISCOVERY_RULES.filter(rule => {
    if (rule.sourceDomain !== cleanHost) return false;
    return rule.sourceRoutePattern.test(currentPath);
  });
}
