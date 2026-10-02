/**
 * AUDIT PROVENANCE CLI
 *
 * Verifies or computes the exact canonical RFC 8785 SHA-256 hash for every
 * approved public record in the acquisition dataset.
 */

import { computeCanonicalRecordHash } from './provenance-verifier';
import {
  APPROVED_BUSINESSES,
  APPROVED_JOB_SCREENINGS,
  APPROVED_LANGUAGE_PAIRS,
  APPROVED_COMPARISONS,
  APPROVED_CITIES
} from '../data/approved-public-data';

export function auditApprovedProvenance(): { passed: boolean; mismatches: number; recordsChecked: number } {
  console.log('🛡️ Auditing Cryptographic Provenance Hashes across Approved Datasets...');
  let mismatches = 0;
  let totalChecked = 0;

  const checkRecord = (name: string, dataPoints: Record<string, unknown>, declaredHash: string) => {
    totalChecked++;
    const computed = computeCanonicalRecordHash(dataPoints);
    if (computed !== declaredHash) {
      mismatches++;
      console.warn(`⚠️ Provenance Hash Discrepancy for [${name}]:`);
      console.warn(`   Declared: ${declaredHash}`);
      console.warn(`   Computed: ${computed}`);
    } else {
      console.log(`✅ [${name}] Provenance Verified: ${computed.slice(0, 16)}...`);
    }
  };

  for (const b of APPROVED_BUSINESSES) {
    checkRecord(
      `Business: ${b.slug}`,
      { name: b.name, category: b.category, city: b.city, features: b.features },
      b.provenance.evidenceHash
    );
  }

  for (const j of APPROVED_JOB_SCREENINGS) {
    checkRecord(
      `Job: ${j.slug}`,
      { role: j.role, city: j.city, salary: j.typicalSalaryRange, screening: j.screeningQuestions },
      j.provenance.evidenceHash
    );
  }

  for (const lp of APPROVED_LANGUAGE_PAIRS) {
    checkRecord(
      `Language: ${lp.slug}`,
      { source: lp.sourceLanguage, target: lp.targetLanguage, phrases: lp.commonPhrases, linguistic: lp.linguisticNotes },
      lp.provenance.evidenceHash
    );
  }

  for (const c of APPROVED_COMPARISONS) {
    checkRecord(
      `Compare: ${c.slug}`,
      { competitor: c.competitor, dimensions: c.dimensions, title: c.comparisonTitle },
      c.provenance.evidenceHash
    );
  }

  for (const city of APPROVED_CITIES) {
    checkRecord(
      `City: ${city.slug}`,
      { city: city.cityName, state: city.state, languages: city.primaryLanguages, hubs: city.businessHubs },
      city.provenance.evidenceHash
    );
  }

  console.log(`\nProvenance Audit Summary: ${totalChecked - mismatches}/${totalChecked} records cryptographically verified.`);
  return { passed: mismatches === 0, mismatches, recordsChecked: totalChecked };
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('audit-provenance')) {
  auditApprovedProvenance();
}
