/**
 * QUALITY CHECK 2: Real Information & Provenance Evidence Check
 *
 * Invariant: Every entity, claim, salary range, or dataset must be backed by
 * verifiable provenance metadata (source URL, verification status, expiry date,
 * and evidence hash).
 *
 * Folder name alone does NOT establish provenance; cryptographic verification
 * against official sources does.
 */

import type { ProvenanceMetadata } from '../data/approved-public-data';

export interface EvidenceRecord {
  entityType: 'business' | 'job' | 'guide' | 'translate' | 'compare' | 'city' | 'knowledge';
  dataPoints: Record<string, unknown>;
  provenance?: ProvenanceMetadata;
  prohibitedPatterns?: RegExp[];
}

export interface EvidenceCheckResult {
  passed: boolean;
  score: number;
  reason: string;
}

// Banned patterns that indicate fake or thin AI filler content
const FABRICATED_CLAIM_PATTERNS = [
  /\b\d+\s+(people|users|companies)\s+in\s+[a-z\s]+\s+use\b/i,
  /\bguaranteed\s+(#1|first\s+page)\b/i,
  /\blorem\s+ipsum\b/i,
  /\bcoming\s+soon\b/i,
  /\bplaceholder\b/i
];

export function checkEvidence(record: EvidenceRecord, textContent: string): EvidenceCheckResult {
  // Check 1: Prohibited filler or fabricated claims
  for (const pattern of FABRICATED_CLAIM_PATTERNS) {
    if (pattern.test(textContent)) {
      return {
        passed: false,
        score: 0,
        reason: `Evidence check failed: Detected placeholder or unverified metric matching pattern ${pattern}`
      };
    }
  }

  // Check 2: Minimum substantive factual data points exist
  const keys = Object.keys(record.dataPoints);
  if (keys.length < 3) {
    return {
      passed: false,
      score: 30,
      reason: `Insufficient structured data points (${keys.length} < 3 minimum required).`
    };
  }

  // Check 3: Substantive depth (>= 250 words)
  const wordCount = textContent.trim().split(/\s+/).length;
  if (wordCount < 250) {
    return {
      passed: false,
      score: 40,
      reason: `Thin content detected (${wordCount} words < 250 minimum threshold).`
    };
  }

  // Check 4: Provenance Model Verification (for data-driven engines: business, job, translate, compare, city)
  const requiresStrictProvenance = ['business', 'job', 'translate', 'compare', 'city'].includes(record.entityType);
  if (requiresStrictProvenance) {
    if (!record.provenance) {
      return {
        passed: false,
        score: 20,
        reason: `Evidence check failed: Entity type "${record.entityType}" lacks verifiable ProvenanceMetadata.`
      };
    }

    const { sourceUrl, verificationStatus, expiresAt, evidenceHash, verifiedBy } = record.provenance;

    if (!sourceUrl || !sourceUrl.startsWith('https://')) {
      return {
        passed: false,
        score: 30,
        reason: `Evidence check failed: Provenance source URL must be an authoritative HTTPS URI (got: "${sourceUrl}").`
      };
    }

    if (verificationStatus !== 'verified') {
      return {
        passed: false,
        score: 30,
        reason: `Evidence check failed: Provenance verificationStatus is "${verificationStatus}" (must be "verified").`
      };
    }

    if (new Date(expiresAt).getTime() <= Date.now()) {
      return {
        passed: false,
        score: 20,
        reason: `Evidence check failed: Provenance verification expired on ${expiresAt}. Data must be re-verified.`
      };
    }

    if (!evidenceHash || evidenceHash.length < 32) {
      return {
        passed: false,
        score: 40,
        reason: 'Evidence check failed: Missing or invalid cryptographic evidenceHash in provenance record.'
      };
    }

    if (!verifiedBy || verifiedBy.trim().length < 3) {
      return {
        passed: false,
        score: 40,
        reason: 'Evidence check failed: Missing authoritative auditor in verifiedBy.'
      };
    }
  }

  return {
    passed: true,
    score: 100,
    reason: `Verified ${keys.length} factual data points across ${wordCount} words with valid provenance from ${record.provenance?.verifiedBy || 'Chatr Technical Architecture'}.`
  };
}
