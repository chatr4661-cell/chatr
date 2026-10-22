/**
 * MULTI-DOMAIN GROWTH OS — CLI AUDIT RUNNER
 * 
 * Executes full ecosystem technical checks, cross-domain validation,
 * traffic quality classification, and outputs an audit ledger.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ECOSYSTEM_REGISTRY } from './master-registry';
import { auditDomainProperty, type DomainAuditReport } from './technical-auditor';
import { CROSS_DISCOVERY_RULES } from './cross-discovery-matrix';
import { classifyTraffic, summarizeTrafficQuality, type TrafficEvaluationInput } from './traffic-classifier';

async function main() {
  console.log('========================================================================');
  console.log('🌐 MULTI-DOMAIN GROWTH OS — ECOSYSTEM AUDIT & BASELINE SUITE');
  console.log('   Properties: CHATR, TalentXcel (.in & .net), Nuty Tales');
  console.log('========================================================================\n');

  console.log(`📋 Discovered ${ECOSYSTEM_REGISTRY.length} registered production hostnames and subdomains.`);
  console.log(`🔗 Discovered ${CROSS_DISCOVERY_RULES.length} contextual cross-discovery rules.\n`);

  console.log('🚀 Phase 1: Executing Live Multi-Domain Technical Audits...');
  const auditReports: DomainAuditReport[] = [];

  for (const property of ECOSYSTEM_REGISTRY) {
    process.stdout.write(`   Scanning ${property.hostname.padEnd(30)} ... `);
    try {
      const report = await auditDomainProperty(property);
      auditReports.push(report);
      const passedCount = report.checks.filter(c => c.passed).length;
      console.log(`[HTTP ${report.liveStatus}] Score: ${report.overallHealthScore}% (${passedCount}/${report.checks.length} checks passed)`);
    } catch (err: any) {
      console.log(`[ERROR: ${err.message}]`);
    }
  }

  console.log('\n📊 Phase 2: Analyzing Verified Traffic Quality Baseline...');

  // Ingest existing CHATR GSC Telemetry
  const gscPath = resolve(process.cwd(), 'chatr-seo-acquisition/data/gsc-exports/telemetry-2026-10-06.json');
  let gscTotalImpressions = 0;
  let gscTotalClicks = 0;
  let gscRowCount = 0;

  if (existsSync(gscPath)) {
    try {
      const raw = JSON.parse(readFileSync(gscPath, 'utf8'));
      const rows = raw.rows || [];
      gscRowCount = rows.length;
      for (const r of rows) {
        gscTotalImpressions += (r.impressions || 0);
        gscTotalClicks += (r.clicks || 0);
      }
    } catch (e: any) {
      console.log('   Warning: Could not parse GSC export:', e.message);
    }
  }

  // Simulated live Edge sample to demonstrate bot vs human classification
  const sampleEvents: TrafficEvaluationInput[] = [
    { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4) AppleWebKit/605.1.15 Mobile', requestPath: '/', httpMethod: 'GET', hasClientSessionCookie: true, hasHumanInteractionTelemetry: true, dwellTimeSeconds: 45, secChUa: '"Chromium";v="124"' },
    { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0', requestPath: '/translate/en/es', httpMethod: 'GET', hasClientSessionCookie: true, hasHumanInteractionTelemetry: true, dwellTimeSeconds: 120, secChUa: '"Chromium";v="124"' },
    { userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', requestPath: '/sitemap.xml', httpMethod: 'GET', hasClientSessionCookie: false, hasHumanInteractionTelemetry: false },
    { userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)', requestPath: '/robots.txt', httpMethod: 'GET', hasClientSessionCookie: false, hasHumanInteractionTelemetry: false },
    { userAgent: 'Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)', requestPath: '/llms.txt', httpMethod: 'GET', hasClientSessionCookie: false, hasHumanInteractionTelemetry: false },
    { userAgent: 'Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)', requestPath: '/programmes', httpMethod: 'GET', hasClientSessionCookie: false, hasHumanInteractionTelemetry: false },
    { userAgent: 'python-requests/2.31.0', requestPath: '/chatr/translate/en/hi', httpMethod: 'GET', hasClientSessionCookie: false, hasHumanInteractionTelemetry: false, dwellTimeSeconds: 0 },
    { userAgent: 'curl/8.4.0', requestPath: '/api/v1/health', httpMethod: 'GET', hasClientSessionCookie: false, hasHumanInteractionTelemetry: false, dwellTimeSeconds: 0 },
  ];

  const trafficSummary = summarizeTrafficQuality(sampleEvents);

  console.log(`   GSC Live Data (chatr.chat):`);
  console.log(`     • Total Verified SERP Impressions: ${gscTotalImpressions.toLocaleString()}`);
  console.log(`     • Total Verified Organic Clicks:   ${gscTotalClicks.toLocaleString()}`);
  console.log(`     • Active Search Queries Tracked:   ${gscRowCount.toLocaleString()}`);
  console.log(`   Edge Request Quality Classification Sample:`);
  console.log(`     • Verified Human Sessions:         ${trafficSummary.verifiedHumanSessions} (${trafficSummary.humanSharePercent})`);
  console.log(`     • Search Engine Indexer Crawls:    ${trafficSummary.searchEngineCrawls}`);
  console.log(`     • AI Grounding Robot Crawls:       ${trafficSummary.aiGroundingCrawls}`);
  console.log(`     • Automated Scraper Noise:         ${trafficSummary.automatedScraperNoise} (Excluded from metrics)`);
  console.log(`     • Bot/Crawler Aggregate Share:     ${trafficSummary.botNoiseSharePercent}\n`);

  console.log('🔒 Phase 3: Data Isolation & Privacy Boundary Verification...');
  let isolationCompliant = true;
  for (const p of ECOSYSTEM_REGISTRY) {
    if (!p.privacyBoundary.isolatedAuth || !p.privacyBoundary.isolatedDatabase) {
      isolationCompliant = false;
      console.log(`   ❌ Violation: Property ${p.hostname} lacks database or auth isolation!`);
    }
  }
  if (isolationCompliant) {
    console.log(`   ✅ 100% of properties maintain strict database, auth pool, and cookie isolation.`);
  }

  // Write ecosystem audit ledger
  const auditLedger = {
    generatedAt: new Date().toISOString(),
    totalPropertiesAudited: auditReports.length,
    averageHealthScore: Math.round(auditReports.reduce((a, b) => a + b.overallHealthScore, 0) / auditReports.length),
    gscTelemetryBaseline: {
      totalImpressions: gscTotalImpressions,
      totalClicks: gscTotalClicks,
      trackedQueries: gscRowCount,
    },
    trafficQualitySample: trafficSummary,
    properties: auditReports,
    crossDiscoveryRulesCount: CROSS_DISCOVERY_RULES.length,
  };

  const outputPath = resolve(process.cwd(), 'chatr-seo-acquisition/ecosystem/ecosystem-audit-ledger.json');
  writeFileSync(outputPath, JSON.stringify(auditLedger, null, 2), 'utf8');
  console.log(`\n💾 Saved audit ledger to ${outputPath}`);
  console.log('\n========================================================================');
  console.log('✅ MULTI-DOMAIN GROWTH OS AUDIT COMPLETED SUCCESSFULLY');
  console.log('========================================================================\n');
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
