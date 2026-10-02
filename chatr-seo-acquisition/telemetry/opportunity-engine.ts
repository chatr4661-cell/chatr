/**
 * AUTONOMOUS OPPORTUNITY ENGINE FOR SEO ACQUISITION
 *
 * Consumes telemetry from GSC ingestion and classifies opportunities into
 * actionable optimization directives:
 *  - Striking Distance (P4-20): Add deeper FAQs & entities to push into Top 3
 *  - Low CTR (Top 10 with CTR < 2.5%): Optimize title tag & meta description
 *  - Cannibalization: Identify pages splitting SERP impressions
 *  - Rising Demand: Detect newly emerging search queries lacking dedicated hubs
 */

import { ingestGscTelemetry, type IngestionResult } from './gsc-ingestion';
import { analyzeSearchTelemetry, type TelemetryReport, type StrikingDistanceOpportunity } from './gsc-analyzer';

export interface OptimizationDirective {
  type: 'STRIKING_DISTANCE_BOOST' | 'SNIPPET_CTR_REWRITE' | 'CANNIBALIZATION_CONSOLIDATION' | 'NEW_DEMAND_DISCOVERY';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  targetQuery: string;
  targetPage: string;
  currentMetrics: {
    impressions: number;
    clicks: number;
    position: number;
    ctr: number;
  };
  recommendedAction: string;
  rationale: string;
}

export interface OpportunityEngineResult {
  generatedAt: string;
  telemetrySource: string;
  totalDirectives: number;
  directives: OptimizationDirective[];
  telemetryReport: TelemetryReport;
}

export async function runOpportunityEngine(rootDir: string = process.cwd()): Promise<OpportunityEngineResult> {
  console.log('🔍 Running Autonomous SEO Opportunity Engine...');

  const ingestion = await ingestGscTelemetry(rootDir);
  const report = analyzeSearchTelemetry(ingestion.rows);

  const directives: OptimizationDirective[] = [];

  // Directive 1: Striking Distance Boosts (Positions 4.0 - 20.0 with high impressions)
  for (const opp of report.strikingDistanceOpportunities) {
    directives.push({
      type: 'STRIKING_DISTANCE_BOOST',
      priority: opp.impressions >= 1000 ? 'HIGH' : 'MEDIUM',
      targetQuery: opp.query,
      targetPage: opp.page,
      currentMetrics: {
        impressions: opp.impressions,
        clicks: opp.currentClicks,
        position: opp.position,
        ctr: opp.impressions > 0 ? opp.currentClicks / opp.impressions : 0
      },
      recommendedAction: `Enrich page body with specific answers to query "${opp.query}". Add targeted FAQ structured data in JSON-LD.`,
      rationale: opp.experimentalEstimatedGain.label
    });
  }

  // Directive 2: Snippet CTR Rewrites (Top 10 positions with CTR < 2.5%)
  for (const low of report.lowCtrSnippets) {
    directives.push({
      type: 'SNIPPET_CTR_REWRITE',
      priority: 'HIGH',
      targetQuery: low.query,
      targetPage: low.page,
      currentMetrics: {
        impressions: low.impressions,
        clicks: low.clicks,
        position: low.position,
        ctr: low.ctr
      },
      recommendedAction: low.recommendedAction,
      rationale: `Ranking at position ${low.position.toFixed(1)} with ${low.impressions.toLocaleString()} impressions but achieving only ${low.ctr}% CTR due to unaligned title, meta snippet, or intent mismatch.`
    });
  }

  // Directive 3: Cannibalization Consolidations
  for (const can of report.cannibalizationRisks) {
    directives.push({
      type: 'CANNIBALIZATION_CONSOLIDATION',
      priority: can.totalImpressions >= 1000 ? 'HIGH' : 'MEDIUM',
      targetQuery: can.query,
      targetPage: can.competingPages[0],
      currentMetrics: {
        impressions: can.totalImpressions,
        clicks: 0,
        position: can.topPosition,
        ctr: 0
      },
      recommendedAction: `Consolidate internal linking and canonical directives. Direct ranking signals to primary URL "${can.competingPages[0]}" over competing URLs: ${can.competingPages.slice(1).join(', ')}`,
      rationale: `Multiple pages are splitting ${can.totalImpressions.toLocaleString()} search impressions for query "${can.query}".`
    });
  }

  console.log(`✅ Opportunity Engine generated ${directives.length} prioritized optimization directives.`);

  return {
    generatedAt: new Date().toISOString(),
    telemetrySource: ingestion.source,
    totalDirectives: directives.length,
    directives,
    telemetryReport: report
  };
}

// Direct CLI execution
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('opportunity-engine')) {
  runOpportunityEngine().then((res) => {
    console.log('\n--- PRIORITIZED DIRECTIVES ---');
    res.directives.forEach((d, idx) => {
      console.log(`\n[#${idx + 1}] [${d.priority}] ${d.type}`);
      console.log(`  Query:  ${d.targetQuery}`);
      console.log(`  Page:   ${d.targetPage}`);
      console.log(`  Action: ${d.recommendedAction}`);
    });
  });
}
