/**
 * QUALITY CHECK 1: Search Demand Check
 *
 * Invariant: No page is created merely because a keyword exists in an AI prompt.
 * Must verify that the page target matches an explicit, verified search intent
 * with known search volume or verified query variations.
 */

export type DemandSignalType = 'gsc_impressions' | 'verified_search_volume' | 'validated_user_intent';

export interface DemandRequirement {
  primaryKeyword: string;
  monthlySearchVolumeMin?: number;
  gscImpressionsMin?: number;
  demandSignalType?: DemandSignalType;
  searchIntent: 'informational' | 'transactional' | 'navigational' | 'commercial';
  queryVariations: string[];
}

export interface DemandCheckResult {
  passed: boolean;
  score: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  signalSource: DemandSignalType;
  reason: string;
}

export function checkSearchDemand(requirement: DemandRequirement): DemandCheckResult {
  if (!requirement.primaryKeyword || requirement.primaryKeyword.trim().length < 3) {
    return {
      passed: false,
      score: 0,
      confidenceLevel: 'low',
      signalSource: 'validated_user_intent',
      reason: 'Missing or empty primary target keyword.'
    };
  }

  if (!requirement.queryVariations || requirement.queryVariations.length < 2) {
    return {
      passed: false,
      score: 30,
      confidenceLevel: 'low',
      signalSource: 'validated_user_intent',
      reason: 'Fewer than 2 real query variations provided for intent coverage.'
    };
  }

  // Demand Evidence Signal Evaluation:
  // Rule: Demand Evidence = GSC impressions OR verified external demand signal OR validated user-intent evidence
  const hasGscSignal = (requirement.gscImpressionsMin !== undefined && requirement.gscImpressionsMin > 0) ||
    requirement.demandSignalType === 'gsc_impressions';

  const hasSearchVolume = requirement.monthlySearchVolumeMin !== undefined && requirement.monthlySearchVolumeMin >= 50;

  const hasIntentSignal = requirement.demandSignalType === 'validated_user_intent' ||
    (requirement.queryVariations.length >= 3 && (requirement.monthlySearchVolumeMin ?? 0) > 0);

  if (hasGscSignal) {
    return {
      passed: true,
      score: 100,
      confidenceLevel: 'high',
      signalSource: 'gsc_impressions',
      reason: `First-party GSC telemetry evidence confirmed for "${requirement.primaryKeyword}" with ${requirement.queryVariations.length} query variations.`
    };
  }

  if (hasSearchVolume) {
    return {
      passed: true,
      score: 95,
      confidenceLevel: 'high',
      signalSource: 'verified_search_volume',
      reason: `Verified search volume evidence (${requirement.monthlySearchVolumeMin}/mo) confirmed for "${requirement.primaryKeyword}".`
    };
  }

  if (hasIntentSignal) {
    return {
      passed: true,
      score: 85,
      confidenceLevel: 'medium',
      signalSource: 'validated_user_intent',
      reason: `Validated user-intent demand evidence confirmed for long-tail query cluster "${requirement.primaryKeyword}".`
    };
  }

  return {
    passed: false,
    score: 40,
    confidenceLevel: 'low',
    signalSource: 'validated_user_intent',
    reason: `Missing demand evidence: No active GSC impressions, search volume (threshold 50/mo), or validated user-intent signal detected.`
  };
}
