/**
 * QUALITY CHECK 1: Search Demand Check
 *
 * Invariant: No page is created merely because a keyword exists in an AI prompt.
 * Must verify that the page target matches an explicit, verified search intent
 * with known search volume or verified query variations.
 */

export interface DemandRequirement {
  primaryKeyword: string;
  monthlySearchVolumeMin: number;
  searchIntent: 'informational' | 'transactional' | 'navigational' | 'commercial';
  queryVariations: string[];
}

export interface DemandCheckResult {
  passed: boolean;
  score: number;
  reason: string;
}

export function checkSearchDemand(requirement: DemandRequirement): DemandCheckResult {
  if (!requirement.primaryKeyword || requirement.primaryKeyword.trim().length < 3) {
    return {
      passed: false,
      score: 0,
      reason: 'Missing or empty primary target keyword.'
    };
  }

  if (requirement.queryVariations.length < 2) {
    return {
      passed: false,
      score: 30,
      reason: 'Fewer than 2 real query variations provided for intent coverage.'
    };
  }

  if (requirement.monthlySearchVolumeMin < 50) {
    return {
      passed: false,
      score: 40,
      reason: `Search volume threshold (${requirement.monthlySearchVolumeMin}) is below minimum viable threshold (50/mo).`
    };
  }

  return {
    passed: true,
    score: 100,
    reason: `Verified demand for "${requirement.primaryKeyword}" with ${requirement.queryVariations.length} query variations.`
  };
}
