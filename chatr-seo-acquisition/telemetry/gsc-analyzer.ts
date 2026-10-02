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

export interface StrikingDistanceOpportunity {
  query: string;
  page: string;
  impressions: number;
  position: number;
  currentClicks: number;
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
  strikingDistanceOpportunities: StrikingDistanceOpportunity[];
  lowCtrSnippets: Array<{
    query: string;
    page: string;
    impressions: number;
    ctr: number;
    recommendedAction: string;
  }>;
  cannibalizationRisks: Array<{
    query: string;
    competingPages: string[];
    topPosition: number;
  }>;
}

export function analyzeSearchTelemetry(
  rows: GscRow[],
  calibration: SiteCtrCalibrationProfile = DEFAULT_CALIBRATION_PROFILE
): TelemetryReport {
  let totalImpressions = 0;
  let totalClicks = 0;

  const queryPageMap = new Map<string, Set<string>>();
  const strikingDistance: StrikingDistanceOpportunity[] = [];
  const lowCtr: TelemetryReport['lowCtrSnippets'] = [];

  for (const row of rows) {
    totalImpressions += row.impressions;
    totalClicks += row.clicks;

    // Track query -> pages for cannibalization
    if (!queryPageMap.has(row.query)) {
      queryPageMap.set(row.query, new Set());
    }
    queryPageMap.get(row.query)!.add(row.page);

    // Striking Distance: position between 4.0 and 20.0 with substantial impressions
    if (row.position >= 4.0 && row.position <= 20.0 && row.impressions >= 50) {
      const currentClicks = row.clicks;
      const c = calibration.top3BaselineCtr;

      // Incremental estimated gain over current clicks
      const conservative = Math.max(0, Math.round(row.impressions * c.conservative - currentClicks));
      const expected = Math.max(0, Math.round(row.impressions * c.expected - currentClicks));
      const optimistic = Math.max(0, Math.round(row.impressions * c.optimistic - currentClicks));

      strikingDistance.push({
        query: row.query,
        page: row.page,
        impressions: row.impressions,
        position: parseFloat(row.position.toFixed(1)),
        currentClicks,
        experimentalEstimatedGain: {
          conservativeClicks: conservative,
          expectedClicks: expected,
          optimisticClicks: optimistic,
          label: `[Experimental Model] If elevated to Top 3: Est. +${expected} clicks/mo (Range: +${conservative} to +${optimistic}).`,
          caveat: 'Heuristic estimate based on aggregate SERP CTR curve. Realized clicks depend on query intent, SERP AI Overviews, and competitor position changes.'
        }
      });
    }

    // High impressions but low CTR (< 2.5% for top 10 position)
    if (row.position <= 10.0 && row.impressions >= 100 && row.ctr < 0.025) {
      lowCtr.push({
        query: row.query,
        page: row.page,
        impressions: row.impressions,
        ctr: parseFloat((row.ctr * 100).toFixed(2)),
        recommendedAction: 'Rewrite Title tag and Meta description to match high-intent search query and improve CTR.'
      });
    }
  }

  // Cannibalization check: Queries where 2 or more distinct pages receive impressions
  const cannibalizationRisks: TelemetryReport['cannibalizationRisks'] = [];
  for (const [query, pages] of queryPageMap.entries()) {
    if (pages.size > 1) {
      const matchingRows = rows.filter((r) => r.query === query).sort((a, b) => a.position - b.position);
      const topRow = matchingRows[0];
      if (topRow && topRow.impressions >= 30) {
        cannibalizationRisks.push({
          query,
          competingPages: Array.from(pages),
          topPosition: parseFloat(topRow.position.toFixed(1))
        });
      }
    }
  }

  const averageCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

  return {
    timestamp: new Date().toISOString(),
    totalQueriesAnalyzed: rows.length,
    totalImpressions,
    totalClicks,
    averageCtr: parseFloat((averageCtr * 100).toFixed(2)),
    calibrationProfileUsed: calibration,
    strikingDistanceOpportunities: strikingDistance.sort((a, b) => b.impressions - a.impressions).slice(0, 20),
    lowCtrSnippets: lowCtr.sort((a, b) => b.impressions - a.impressions).slice(0, 20),
    cannibalizationRisks: cannibalizationRisks.slice(0, 10)
  };
}
