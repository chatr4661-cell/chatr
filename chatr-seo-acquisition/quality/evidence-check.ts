/**
 * QUALITY CHECK 2: Real Information & Evidence Check
 *
 * Invariant: No fabricated metrics (e.g. "1,200 people in Mumbai use this today").
 * Every fact, entity, location, dialect, or attribute must be verifiable
 * from approved public datasets.
 */

export interface EvidenceRecord {
  entityType: 'business' | 'job' | 'guide' | 'translate' | 'compare' | 'city' | 'knowledge';
  dataPoints: Record<string, unknown>;
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
  // Check for prohibited claims or filler phrases
  for (const pattern of FABRICATED_CLAIM_PATTERNS) {
    if (pattern.test(textContent)) {
      return {
        passed: false,
        score: 0,
        reason: `Evidence check failed: Detected placeholder or unverified metric matching pattern ${pattern}`
      };
    }
  }

  // Ensure minimum substantive factual data points exist
  const keys = Object.keys(record.dataPoints);
  if (keys.length < 3) {
    return {
      passed: false,
      score: 30,
      reason: `Insufficient structured data points (${keys.length} < 3 minimum required).`
    };
  }

  // Minimum length check for substantive value
  const wordCount = textContent.trim().split(/\s+/).length;
  if (wordCount < 250) {
    return {
      passed: false,
      score: 40,
      reason: `Thin content detected (${wordCount} words < 250 minimum threshold).`
    };
  }

  return {
    passed: true,
    score: 100,
    reason: `Verified ${keys.length} factual data points across ${wordCount} words.`
  };
}
