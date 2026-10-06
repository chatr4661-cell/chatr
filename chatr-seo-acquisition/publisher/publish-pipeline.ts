/**
 * MASTER PUBLISHING PIPELINE FOR CHATR SEO ACQUISITION LAYER
 *
 * Execution Steps:
 *  1. Execute Core Freeze CI Gate (hard invariant)
 *  2. Ingest approved public data records
 *  3. Generate candidate pages across all 7 engines
 *  4. Execute Quality Gate on every candidate page
 *  5. Emit static HTML to isolated output directory (dist-seo/)
 *  6. Generate partitioned XML sitemaps
 *  7. Print diagnostic telemetry report
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { verifyCoreFreeze } from '../contracts/core-freeze';
import { evaluateQualityGate, type PageCandidate, type QualityGateEvaluation } from '../quality/quality-gate';
import { generateBusinessPages } from '../engines/business';
import { generateJobPages } from '../engines/jobs';
import { generateTranslatePages } from '../engines/translate';
import { generateComparePages } from '../engines/compare';
import { generateCityPages } from '../engines/city';
import { generateGuidePages } from '../engines/guides';
import { generateKnowledgePages } from '../engines/knowledge';
import { generateXmlSitemap, generateSitemapIndex, type SitemapUrlEntry } from '../sitemap/sitemap-generator';

const OUTPUT_DIR = resolve('dist-seo');

export interface PublishResult {
  coreFreezePassed: boolean;
  totalPagesGenerated: number;
  totalPassedQualityGate: number;
  totalRejected: number;
  sitemapsEmitted: string[];
}

export function runPublishPipeline(): PublishResult {
  console.log('🚀 CHATR SEO ACQUISITION LAYER — INDEPENDENT PUBLISHING PIPELINE');
  console.log('─────────────────────────────────────────────────────────────────');

  // STEP 1: Verify Core Freeze Contract
  console.log('🔒 Step 1: Checking Core Freeze Contract...');
  const freezeReport = verifyCoreFreeze();
  console.log(freezeReport.statusMessage);

  if (!freezeReport.passed) {
    console.error('❌ Build Aborted: Core Freeze Contract violated. Core product code must remain untouched.');
    process.exit(1);
  }

  // STEP 2: Ingest candidates from all 7 engines
  console.log('\n📦 Step 2: Generating candidates across 7 quality-gated engines...');
  const allEnginePages = [
    ...generateBusinessPages().map((p) => ({ ...p, engine: 'business' })),
    ...generateJobPages().map((p) => ({ ...p, engine: 'jobs' })),
    ...generateTranslatePages().map((p) => ({ ...p, engine: 'translate' })),
    ...generateComparePages().map((p) => ({ ...p, engine: 'compare' })),
    ...generateCityPages().map((p) => ({ ...p, engine: 'city' })),
    ...generateGuidePages().map((p) => ({ ...p, engine: 'guides' })),
    ...generateKnowledgePages().map((p) => ({ ...p, engine: 'knowledge' }))
  ];

  console.log(`   Generated ${allEnginePages.length} candidate pages across 7 engines.`);

  // STEP 3: Quality Gate Evaluation
  console.log('\n🛡️ Step 3: Executing Quality Gate evaluations...');
  const passedPages: Array<(typeof allEnginePages)[0] & { evaluation: QualityGateEvaluation }> = [];
  const rejectedPages: Array<(typeof allEnginePages)[0] & { evaluation: QualityGateEvaluation }> = [];

  const sitemapPartitions: Record<string, SitemapUrlEntry[]> = {
    business: [],
    jobs: [],
    translate: [],
    compare: [],
    city: [],
    guides: [],
    knowledge: []
  };

  for (const page of allEnginePages) {
    const evaluation = evaluateQualityGate(page.candidate);
    if (evaluation.canPublish) {
      passedPages.push({ ...page, evaluation });
      sitemapPartitions[page.engine]?.push({
        url: page.candidate.metadata.canonicalUrl,
        lastmod: new Date().toISOString().split('T')[0],
        changefreq: 'weekly',
        priority: 0.8
      });
    } else {
      rejectedPages.push({ ...page, evaluation });
      console.warn(`   ⚠️ REJECTED: /${page.candidate.slug}`);
      evaluation.rejectionReasons.forEach((r) => console.warn(`      └─ ${r}`));
    }
  }

  console.log(`   ✅ Passed Quality Gate: ${passedPages.length}/${allEnginePages.length}`);
  if (rejectedPages.length > 0) {
    console.log(`   ❌ Rejected: ${rejectedPages.length} pages did not satisfy quality criteria.`);
  }

  // STEP 4: Write pre-rendered HTML to isolated output directory
  console.log(`\n💾 Step 4: Emitting static HTML to ${OUTPUT_DIR}...`);
  mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const page of passedPages) {
    const destPath = resolve(OUTPUT_DIR, page.relativePath);
    mkdirSync(dirname(destPath), { recursive: true });
    writeFileSync(destPath, page.html, 'utf8');
  }

  // STEP 5: Generate Partitioned XML Sitemaps
  console.log('\n🗺️ Step 5: Generating partitioned XML sitemaps...');
  const sitemapsEmitted: string[] = [];

  for (const [engineKey, entries] of Object.entries(sitemapPartitions)) {
    if (entries.length > 0) {
      const sitemapName = `sitemap-${engineKey}.xml`;
      const sitemapXml = generateXmlSitemap(entries);
      const sitemapPath = resolve(OUTPUT_DIR, sitemapName);
      writeFileSync(sitemapPath, sitemapXml, 'utf8');
      sitemapsEmitted.push(sitemapName);
      console.log(`   Created ${sitemapName} (${entries.length} URLs)`);
    }
  }

  // Master Sitemap Index
  const indexXml = generateSitemapIndex(
    sitemapsEmitted.map((s) => `https://chatr.chat/${s}`)
  );
  writeFileSync(resolve(OUTPUT_DIR, 'sitemap-index.xml'), indexXml, 'utf8');
  sitemapsEmitted.push('sitemap-index.xml');
  console.log('   Created master sitemap-index.xml');

  // STEP 6: Mirror to dist/ for production serving if dist directory exists
  const DIST_DIR = resolve('dist');
  if (existsSync(DIST_DIR)) {
    console.log(`\n🌐 Step 6: Syncing published SEO assets to ${DIST_DIR} for production edge serving...`);
    for (const page of passedPages) {
      const distDest = resolve(DIST_DIR, page.relativePath);
      mkdirSync(dirname(distDest), { recursive: true });
      writeFileSync(distDest, page.html, 'utf8');
    }
    for (const sitemap of sitemapsEmitted) {
      const srcFile = resolve(OUTPUT_DIR, sitemap);
      const distFile = resolve(DIST_DIR, sitemap);
      if (existsSync(srcFile)) {
        writeFileSync(distFile, readFileSync(srcFile));
      }
    }
    console.log(`   Synchronized ${passedPages.length} HTML pages and ${sitemapsEmitted.length} sitemaps into dist/.`);
  }

  console.log('\n─────────────────────────────────────────────────────────────────');
  console.log('🎯 PUBLISHING PIPELINE COMPLETE:');
  console.log(`   • Core Freeze Status:    VERIFIED UNTOUCHED (100% IMMUTABLE)`);
  console.log(`   • Total Pages Published: ${passedPages.length}`);
  console.log(`   • Total Sitemaps Built:  ${sitemapsEmitted.length}`);
  console.log(`   • Output Location:       dist-seo/`);
  console.log('─────────────────────────────────────────────────────────────────\n');

  return {
    coreFreezePassed: true,
    totalPagesGenerated: allEnginePages.length,
    totalPassedQualityGate: passedPages.length,
    totalRejected: rejectedPages.length,
    sitemapsEmitted
  };
}

// Direct CLI execution
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('publish-pipeline')) {
  runPublishPipeline();
}
