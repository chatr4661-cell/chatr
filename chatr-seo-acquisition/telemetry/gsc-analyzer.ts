/**
 * GSC TELEMETRY & FEEDBACK LOOP ANALYZER (CALIBRATED MODEL)
 *
 * Implements calibrated search analytics diagnostics to feed the opportunity
 * engine without touching the core application.
 *
 * Methodological Safeguards:
 *  - Striking Distance Gain is explicitly labeled as an EXPERIMENTAL HEURISTIC
 *    with low, expected, and high confidence bounds (not a promised outcome).
 *  - Supports site-specific historical CTR calibration curves rather than
 *    hardcoded blanket multipliers.
 *  - SERP feature volatility (AI Overviews, featured snippets, local 3-packs)
 *    is acknowledged in all opportunity scoring.
 */

export interface GscRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  country?: string;
  device?: string;
}

export interface SiteCtrCalibrationProfile {
  top3BaselineCtr: {
    conservative: number; // e.g. 0.08 (8%)
    expected: number;     // e.g. 0.15 (15%)
    optimistic: number;   // e.g. 0.22 (22%)
  };
  calibratedAgainstHistoricalDays: number;
}

export const DEFAULT_CALIBRATION_PROFILE: SiteCtrCalibrationProfile = {
  top3BaselineCtr: {
    conservative: 0.08,
    expected: 0.14,
    optimistic: 0.20
  },
  calibratedAgainstHistoricalDays: 90
};

export type QueryIntentCategory =
  | 'navigational_brand'
  | 'product_action'
  | 'informational'
  | 'commercial'
  | 'ambiguous'
  | 'unresolved';

export type AutomationEligibility = 'observe' | 'eligible';

export interface QueryIntentClassification {
  intent: QueryIntentCategory;
  automation: AutomationEligibility;
  rationale: string;
}

export function classifyQueryIntent(query: string): QueryIntentClassification {
  const q = query.toLowerCase().trim();

  // Pure brand single-word tokens or typological misspellings: Intent is unresolved/ambiguous
  const pureBrandOrTypoPattern = /^(chatr|www\.chatr|"chatr"|chatr\.|chatr\+|chatr\[|chatr\]|chatr\}|chater|cahtr|xhatr|chatrr|chatre|vhatr|cchatr|chjatr|cjatr|cghatr|cahatr|chatcr|chatrn|chaetr|chatnr|chat\s?r|\$chtr)$/i;
  if (pureBrandOrTypoPattern.test(q)) {
    return {
      intent: 'ambiguous',
      automation: 'observe',
      rationale: 'Ambiguous brand/query token with unresolved intent (could be brand discovery, competitor telco, or generic search). Do NOT auto-optimize; observe and collect further evidence.'
    };
  }

  // Explicit product or action intent
  if (/\b(app|download|apk|install|video\s?chat|voice\s?call|web|free\s?download|desktop|ios|android)\b/i.test(q)) {
    return {
      intent: 'product_action',
      automation: 'eligible',
      rationale: 'Explicit product/action intent seeking mobile/desktop application, downloading, or calling capabilities. Eligible for snippet and CTA alignment.'
    };
  }

  // Informational intent
  if (/\b(how\s?to|what\s?is|meaning|guide|tutorial|setup|translate|language|caller\s?defense)\b/i.test(q)) {
    return {
      intent: 'informational',
      automation: 'eligible',
      rationale: 'Informational intent seeking answers, translation, or instructions. Eligible for content and structured FAQ enrichment.'
    };
  }

  // Commercial intent
  if (/\b(business|crm|doctor|clinic|delivery|logistics|jobs|career|pricing|compare|vs|alternative)\b/i.test(q)) {
    return {
      intent: 'commercial',
      automation: 'eligible',
      rationale: 'Commercial intent evaluating business solutions, services, or alternatives.'
    };
  }

  // Navigational verified brand
  if (/\b(chatr\s?plus|chatr\s?official|chatr\s?chat|talentxcel|noida\s?startups)\b/i.test(q)) {
    return {
      intent: 'navigational_brand',
      automation: 'eligible',
      rationale: 'Navigational search directly targeting the Chatr / Chatr+ product entity. Optimize brand and entity clarity.'
    };
  }

  return {
    intent: 'unresolved',
    automation: 'observe',
    rationale: 'Unresolved query intent with insufficient intent markers. Collect further empirical telemetry before intervention.'
  };
}

export type SampleConfidenceLevel =
  | 'insufficient_sample'
  | 'weak_signal'
  | 'candidate_evidence'
  | 'strong_evidence';

export interface SampleThresholdConfig {
  insufficientThreshold: number; // default: 20
  weakThreshold: number;         // default: 100
  strongThreshold: number;       // default: 500
}

export const DEFAULT_SAMPLE_THRESHOLDS: SampleThresholdConfig = {
  insufficientThreshold: 20,
  weakThreshold: 100,
  strongThreshold: 500
};

export interface SampleConfidence {
  level: SampleConfidenceLevel;
  impressions: number;
  label: string;
  eligibleForOptimization: boolean;
}

export function evaluateSampleConfidence(
  impressions: number,
  config: SampleThresholdConfig = DEFAULT_SAMPLE_THRESHOLDS
): SampleConfidence {
  if (impressions < config.insufficientThreshold) {
    return {
      level: 'insufficient_sample',
      impressions,
      label: `Tiny sample size (${impressions} impr < ${config.insufficientThreshold}). Promising directional observation, but statistically insufficient for optimization.`,
      eligibleForOptimization: false
    };
  }
  if (impressions < config.weakThreshold) {
    return {
      level: 'weak_signal',
      impressions,
      label: `Early directional signal (${impressions} impr). Monitor for stability before committing changes.`,
      eligibleForOptimization: false
    };
  }
  if (impressions < config.strongThreshold) {
    return {
      level: 'candidate_evidence',
      impressions,
      label: `Moderate sample size (${impressions} impr). Candidate for controlled optimization.`,
      eligibleForOptimization: true
    };
  }
  return {
    level: 'strong_evidence',
    impressions,
    label: `Robust sample size (${impressions} impr >= ${config.strongThreshold}). High-confidence empirical evidence.`,
    eligibleForOptimization: true
  };
}

export interface StrikingDistanceOpportunity {
  query: string;
  page: string;
  impressions: number;
  position: number;
  currentClicks: number;
  intent: QueryIntentClassification;
  sampleConfidence: SampleConfidence;
  experimentalEstimatedGain: {
    conservativeClicks: number;
    expectedClicks: number;
    optimisticClicks: number;
    label: string;
    caveat: string;
  };
}

export interface TelemetryReport {
  timestamp: string;
  totalQueriesAnalyzed: number;
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  calibrationProfileUsed: SiteCtrCalibrationProfile;
  sampleThresholdsUsed: SampleThresholdConfig;
  strikingDistanceOpportunities: StrikingDistanceOpportunity[];
  lowCtrSnippets: Array<{
    query: string;
    page: string;
    impressions: number;
    clicks: number;
    position: number;
    ctr: number;
    intent: QueryIntentClassification;
    sampleConfidence: SampleConfidence;
    recommendedAction: string;
  }>;
  cannibalizationRisks: Array<{
    query: string;
    competingPages: string[];
    topPosition: number;
    totalImpressions: number;
  }>;
}

export function analyzeSearchTelemetry(
  rows: GscRow[],
  calibration: SiteCtrCalibrationProfile = DEFAULT_CALIBRATION_PROFILE
): TelemetryReport {
  let totalImpressions = 0;
  let totalClicks = 0;

  // Step 1: Consolidate dimensional slices (query x page x country x device) into unique (query, page) tuples
  interface ConsolidatedQueryPage {
    query: string;
    page: string;
    impressions: number;
    clicks: number;
    posSum: number;
  }

  const queryPageMap = new Map<string, ConsolidatedQueryPage>();
  const queryToPagesMap = new Map<string, Map<string, { impressions: number; clicks: number; posSum: number }>>();

  for (const row of rows) {
    totalImpressions += row.impressions;
    totalClicks += row.clicks;

    const pairKey = `${row.query}:::${row.page}`;
    if (!queryPageMap.has(pairKey)) {
      queryPageMap.set(pairKey, {
        query: row.query,
        page: row.page,
        impressions: 0,
        clicks: 0,
        posSum: 0
      });
    }
    const pair = queryPageMap.get(pairKey)!;
    pair.impressions += row.impressions;
    pair.clicks += row.clicks;
    pair.posSum += row.position * row.impressions;

    // Track for cannibalization
    if (!queryToPagesMap.has(row.query)) {
      queryToPagesMap.set(row.query, new Map());
    }
    const pMap = queryToPagesMap.get(row.query)!;
    if (!pMap.has(row.page)) {
      pMap.set(row.page, { impressions: 0, clicks: 0, posSum: 0 });
    }
    const pEntry = pMap.get(row.page)!;
    pEntry.impressions += row.impressions;
    pEntry.clicks += row.clicks;
    pEntry.posSum += row.position * row.impressions;
  }

  const strikingDistance: StrikingDistanceOpportunity[] = [];
  const lowCtr: TelemetryReport['lowCtrSnippets'] = [];

  // Step 2: Evaluate unique (query, page) pairs
  for (const pair of queryPageMap.values()) {
    const avgPosition = pair.impressions > 0 ? pair.posSum / pair.impressions : 0;
    const ctr = pair.impressions > 0 ? (pair.clicks / pair.impressions) : 0;
    const intent = classifyQueryIntent(pair.query);
    const sampleConfidence = evaluateSampleConfidence(pair.impressions);

    // Striking Distance: weighted position between 3.5 and 20.0 with >= 20 impressions (captures observable signals)
    if (avgPosition >= 3.5 && avgPosition <= 20.0 && pair.impressions >= 20) {
      const currentClicks = pair.clicks;
      const c = calibration.top3BaselineCtr;

      const conservative = Math.max(0, Math.round(pair.impressions * c.conservative - currentClicks));
      const expected = Math.max(0, Math.round(pair.impressions * c.expected - currentClicks));
      const optimistic = Math.max(0, Math.round(pair.impressions * c.optimistic - currentClicks));

      strikingDistance.push({
        query: pair.query,
        page: pair.page,
        impressions: pair.impressions,
        position: parseFloat(avgPosition.toFixed(1)),
        currentClicks,
        intent,
        sampleConfidence,
        experimentalEstimatedGain: {
          conservativeClicks: conservative,
          expectedClicks: expected,
          optimisticClicks: optimistic,
          label: `[Experimental Model] If elevated to Top 3: Est. +${expected} clicks/mo (Range: +${conservative} to +${optimistic}).`,
          caveat: 'Heuristic estimate based on aggregate SERP CTR curve. Realized clicks depend on query intent, SERP AI Overviews, and competitor position changes.'
        }
      });
    }

    // High impressions but low CTR (< 2.5% for top 10 position, >= 20 impressions)
    if (avgPosition <= 10.0 && pair.impressions >= 20 && ctr < 0.025) {
      lowCtr.push({
        query: pair.query,
        page: pair.page,
        impressions: pair.impressions,
        clicks: pair.clicks,
        position: parseFloat(avgPosition.toFixed(1)),
        ctr: parseFloat((ctr * 100).toFixed(3)),
        intent,
        sampleConfidence,
        recommendedAction: intent.automation === 'eligible' && sampleConfidence.eligibleForOptimization
          ? 'Rewrite Title tag and Meta description to match high-intent search query and improve CTR.'
          : `[Observe Only] Intent is ${intent.intent.toUpperCase()} (${intent.rationale}). ${sampleConfidence.label}`
      });
    }
  }

  // Step 3: Cannibalization check across consolidated pages
  const cannibalizationRisks: TelemetryReport['cannibalizationRisks'] = [];
  for (const [query, pMap] of queryToPagesMap.entries()) {
    if (pMap.size > 1) {
      let queryTotalImpr = 0;
      let topPosition = 100;
      const competingPages: Array<{ page: string; impressions: number; avgPos: number }> = [];

      for (const [page, pData] of pMap.entries()) {
        queryTotalImpr += pData.impressions;
        const pageAvgPos = pData.impressions > 0 ? pData.posSum / pData.impressions : 100;
        if (pageAvgPos < topPosition) topPosition = pageAvgPos;
        competingPages.push({ page, impressions: pData.impressions, avgPos: pageAvgPos });
      }

      if (queryTotalImpr >= 30) {
        // Sort competing pages by impressions descending
        competingPages.sort((a, b) => b.impressions - a.impressions);
        cannibalizationRisks.push({
          query,
          competingPages: competingPages.map((cp) => cp.page),
          topPosition: parseFloat(topPosition.toFixed(1)),
          totalImpressions: queryTotalImpr
        });
      }
    }
  }

  cannibalizationRisks.sort((a, b) => b.totalImpressions - a.totalImpressions);

  const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return {
    timestamp: new Date().toISOString(),
    totalQueriesAnalyzed: queryPageMap.size,
    totalImpressions,
    totalClicks,
    averageCtr: parseFloat(averageCtr.toFixed(4)),
    calibrationProfileUsed: calibration,
    sampleThresholdsUsed: DEFAULT_SAMPLE_THRESHOLDS,
    strikingDistanceOpportunities: strikingDistance.sort((a, b) => b.impressions - a.impressions).slice(0, 20),
    lowCtrSnippets: lowCtr.sort((a, b) => b.impressions - a.impressions).slice(0, 20),
    cannibalizationRisks: cannibalizationRisks.slice(0, 10)
  };
}
