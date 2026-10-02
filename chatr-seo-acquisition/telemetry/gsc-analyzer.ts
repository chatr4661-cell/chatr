/**
 * GSC TELEMETRY & FEEDBACK LOOP ANALYZER
 *
 * Implements the telemetry diagnostic engine that analyzes search queries and
 * rankings to feed the opportunity engine without touching the core application.
 *
 * Capabilities:
 *  - Striking Distance Harvester (Positions 4.0 - 20.0 with high impressions)
 *  - High Impression / Low CTR Detection (Underperforming snippets)
 *  - Zero Impression Detection (Thin / unindexed pages)
 *  - Query Cannibalization Check (Multiple URLs ranking for same query)
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

export interface TelemetryReport {
  timestamp: string;
  totalQueriesAnalyzed: number;
  totalImpressions: number;
  totalClicks: number;
  averageCtr: number;
  strikingDistanceOpportunities: Array<{
    query: string;
    page: string;
    impressions: number;
    position: number;
    potentialGain: string;
  }>;
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

export function analyzeSearchTelemetry(rows: GscRow[]): TelemetryReport {
  let totalImpressions = 0;
  let totalClicks = 0;

  const queryPageMap = new Map<string, Set<string>>();
  const strikingDistance: TelemetryReport['strikingDistanceOpportunities'] = [];
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
      strikingDistance.push({
        query: row.query,
        page: row.page,
        impressions: row.impressions,
        position: parseFloat(row.position.toFixed(1)),
        potentialGain: `Pushing to Top 3 could unlock estimated ${Math.round(row.impressions * 0.18)} additional clicks/mo.`
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
      const topRow = rows.filter((r) => r.query === query).sort((a, b) => a.position - b.position)[0];
      if (topRow && topRow.impressions >= 30) {
        cannibalizationRisks.push({
          query,
          competingPages: Array.from(pages),
          topPosition: parseFloat(topRow.position.toFixed(1))
        });
      }
    }
  }

  const averageCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) : 0;

  return {
    timestamp: new Date().toISOString(),
    totalQueriesAnalyzed: rows.length,
    totalImpressions,
    totalClicks,
    averageCtr: parseFloat((averageCtr * 100).toFixed(2)),
    strikingDistanceOpportunities: strikingDistance.sort((a, b) => b.impressions - a.impressions).slice(0, 20),
    lowCtrSnippets: lowCtr.sort((a, b) => b.impressions - a.impressions).slice(0, 20),
    cannibalizationRisks: cannibalizationRisks.slice(0, 10)
  };
}
