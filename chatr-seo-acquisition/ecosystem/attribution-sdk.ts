/**
 * MULTI-DOMAIN GROWTH OS — ZERO-COST FIRST-PARTY ATTRIBUTION SDK
 * 
 * Lightweight, privacy-compliant, zero-dependency attribution client and schema.
 * Operates purely on the destination origin using sessionStorage and first-party cookies.
 * 
 * GUARANTEES:
 * 1. Zero external network calls: Never pings expensive third-party trackers (Segment, Mixpanel, etc.).
 * 2. Zero cross-domain leakage: Never shares cookies across distinct parent domains.
 * 3. Privacy-by-design: No fingerprinting, no PII capture, strictly ephemeral campaign attribution.
 * 4. Multi-touch attribution model: Captures First Touch (Discovery) and Last Touch (Immediate Prior Hop).
 */

export interface AttributionRecord {
  timestamp: string;
  referralCode: string;          // e.g. "eco_talentxcel_in_tx_jobs_multilingual_prep"
  utmSource?: string;            // e.g. "jobs.talentxcel.in"
  utmMedium?: string;            // e.g. "ecosystem_referral"
  utmCampaign?: string;          // e.g. "tx_jobs_multilingual_prep"
  utmContent?: string;
  landingPath: string;           // e.g. "/translate/en/hi"
  destinationHost: string;       // e.g. "chatr.chat"
  referrerUrl?: string;          // document.referrer
  isEcosystemHop: boolean;
}

export interface StoredEcosystemJourney {
  firstTouch: AttributionRecord;
  lastTouch: AttributionRecord;
  totalHops: number;
}

const STORAGE_KEY_FIRST_TOUCH = 'chatr_eco_first_touch';
const STORAGE_KEY_LAST_TOUCH = 'chatr_eco_last_touch';

/**
 * Parses query parameters and document referrer on landing.
 * Stores attribution data in sessionStorage on the current domain only.
 */
export function recordFirstPartyAttribution(currentLocation?: Location, documentReferrer?: string): AttributionRecord | null {
  if (typeof window === 'undefined' && !currentLocation) {
    return null;
  }

  const loc = currentLocation || window.location;
  const referrer = documentReferrer !== undefined ? documentReferrer : (typeof document !== 'undefined' ? document.referrer : '');
  const searchParams = new URLSearchParams(loc.search);

  const refCode = searchParams.get('ref') || searchParams.get('eco_ref');
  const utmSource = searchParams.get('utm_source');
  const utmMedium = searchParams.get('utm_medium');
  const utmCampaign = searchParams.get('utm_campaign');
  const utmContent = searchParams.get('utm_content');

  const isEcosystem = !!(
    (refCode && refCode.startsWith('eco_')) ||
    (utmMedium && utmMedium === 'ecosystem_referral') ||
    (referrer && (referrer.includes('talentxcel.') || referrer.includes('nutytales.') || referrer.includes('chatr.')))
  );

  if (!refCode && !utmSource && !isEcosystem) {
    return null;
  }

  const record: AttributionRecord = {
    timestamp: new Date().toISOString(),
    referralCode: refCode || (utmSource ? `utm_${utmSource}` : 'direct_organic'),
    utmSource: utmSource || undefined,
    utmMedium: utmMedium || undefined,
    utmCampaign: utmCampaign || undefined,
    utmContent: utmContent || undefined,
    landingPath: loc.pathname + loc.search,
    destinationHost: loc.hostname,
    referrerUrl: referrer || undefined,
    isEcosystemHop: isEcosystem,
  };

  try {
    if (typeof sessionStorage !== 'undefined') {
      const existingFirst = sessionStorage.getItem(STORAGE_KEY_FIRST_TOUCH);
      if (!existingFirst) {
        sessionStorage.setItem(STORAGE_KEY_FIRST_TOUCH, JSON.stringify(record));
      }
      sessionStorage.setItem(STORAGE_KEY_LAST_TOUCH, JSON.stringify(record));
    }
  } catch {
    // Storage quota or sandboxed iframe silently handled
  }

  return record;
}

/**
 * Retrieves the stored first-party journey on conversion (e.g. at signup or checkout).
 */
export function getAttributionJourney(): StoredEcosystemJourney | null {
  if (typeof sessionStorage === 'undefined') return null;

  try {
    const rawFirst = sessionStorage.getItem(STORAGE_KEY_FIRST_TOUCH);
    const rawLast = sessionStorage.getItem(STORAGE_KEY_LAST_TOUCH);

    if (!rawFirst && !rawLast) return null;

    const first: AttributionRecord = rawFirst ? JSON.parse(rawFirst) : (rawLast ? JSON.parse(rawLast) : null);
    const last: AttributionRecord = rawLast ? JSON.parse(rawLast) : first;

    return {
      firstTouch: first,
      lastTouch: last,
      totalHops: first.referralCode === last.referralCode ? 1 : 2,
    };
  } catch {
    return null;
  }
}
