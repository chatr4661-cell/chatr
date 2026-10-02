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
import {
  analyzeSearchTelemetry,
  classifyQueryIntent,
  evaluateSampleConfidence,
  type TelemetryReport,
  type StrikingDistanceOpportunity,
  type QueryIntentCategory,
  type AutomationEligibility,
  type SampleConfidenceLevel
} from './gsc-analyzer';

export interface OptimizationDirective {
  type: 'STRIKING_DISTANCE_BOOST' | 'SNIPPET_CTR_REWRITE' | 'CANNIBALIZATION_CONSOLIDATION' | 'NEW_DEMAND_DISCOVERY';
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'OBSERVATION';
  intent: QueryIntentCategory;
  secondarySignals: QueryIntentCategory[];
  automation: AutomationEligibility;
  volumeTier: SampleConfidenceLevel;
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

  // Directive 1: Striking Distance Boosts (Positions 3.5 - 20.0)
  for (const opp of report.strikingDistanceOpportunities) {
    const isEligible = opp.intent.automation === 'eligible' && opp.sampleConfidence.eligibleForOptimization;

    directives.push({
      type: 'STRIKING_DISTANCE_BOOST',
      priority: !isEligible ? 'OBSERVATION' : opp.impressions >= 100 ? 'HIGH' : 'MEDIUM',
      intent: opp.intent.primaryIntent,
      secondarySignals: opp.intent.secondarySignals,
      automation: opp.intent.automation,
      volumeTier: opp.sampleConfidence.level,
      targetQuery: opp.query,
      targetPage: opp.page,
      currentMetrics: {
        impressions: opp.impressions,
        clicks: opp.currentClicks,
        position: opp.position,
        ctr: opp.impressions > 0 ? opp.currentClicks / opp.impressions : 0
      },
      recommendedAction: !isEligible
        ? `[OBSERVE ONLY] Query "${opp.query}" has ${opp.intent.primaryIntent.toUpperCase()} intent (${opp.intent.rationale}). Do NOT auto-modify page body. Monitor search stability.`
        : `Enrich page body with specific answers to query "${opp.query}". Add targeted FAQ structured data in JSON-LD.`,
      rationale: `${opp.experimentalEstimatedGain.label} [Volume Tier: ${opp.sampleConfidence.level}, Primary Intent: ${opp.intent.primaryIntent}${opp.intent.secondarySignals.length > 0 ? ` (+${opp.intent.secondarySignals.join(',')})` : ''}]`
    });
  }

  // Directive 2: Snippet CTR Rewrites (Top 10 positions with CTR < 2.5%)
  for (const low of report.lowCtrSnippets) {
    const isEligible = low.intent.automation === 'eligible' && low.sampleConfidence.eligibleForOptimization;

    directives.push({
      type: 'SNIPPET_CTR_REWRITE',
      priority: !isEligible ? 'OBSERVATION' : 'HIGH',
      intent: low.intent.primaryIntent,
      secondarySignals: low.intent.secondarySignals,
      automation: low.intent.automation,
      volumeTier: low.sampleConfidence.level,
      targetQuery: low.query,
      targetPage: low.page,
      currentMetrics: {
        impressions: low.impressions,
        clicks: low.clicks,
        position: low.position,
        ctr: low.ctr
      },
      recommendedAction: !isEligible
        ? `[OBSERVE ONLY] Query "${low.query}" on ${low.page} has ${low.intent.primaryIntent.toUpperCase()}${low.intent.secondarySignals.length > 0 ? ` (+${low.intent.secondarySignals.join(',')})` : ''} intent (${low.intent.rationale}). Do NOT rewrite snippet automatically.`
        : `Rewrite Title tag and Meta description on ${low.page} to address explicit search intent "${low.query}".`,
      rationale: `Ranking at position ${low.position.toFixed(1)} with ${low.impressions.toLocaleString()} impressions but achieving only ${low.ctr}% CTR [Volume Tier: ${low.sampleConfidence.level}, Primary Intent: ${low.intent.primaryIntent}].`
    });
  }

  // Directive 3: Cannibalization Consolidations
  for (const can of report.cannibalizationRisks) {
    const queryIntent = classifyQueryIntent(can.query);
    const sampleConf = evaluateSampleConfidence(can.totalImpressions);

    directives.push({
      type: 'CANNIBALIZATION_CONSOLIDATION',
      priority: can.totalImpressions >= 1000 ? 'HIGH' : 'MEDIUM',
      intent: queryIntent.primaryIntent,
      secondarySignals: queryIntent.secondarySignals,
      automation: 'eligible',
      volumeTier: sampleConf.level,
      targetQuery: can.query,
      targetPage: can.competingPages[0],
      currentMetrics: {
        impressions: can.totalImpressions,
        clicks: 0,
        position: can.topPosition,
        ctr: 0
      },
      recommendedAction: `Consolidate internal linking and canonical directives. Direct ranking signals to primary URL "${can.competingPages[0]}" over competing URLs: ${can.competingPages.slice(1).join(', ')}`,
      rationale: `Multiple pages are splitting ${can.totalImpressions.toLocaleString()} search impressions for query "${can.query}". [Volume Tier: ${sampleConf.level}]`
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
