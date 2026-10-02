/**
 * QUALITY GATE ORCHESTRATOR
 *
 * Implements the formula:
 * REAL SEARCH DEMAND
 *        +
 * REAL INFORMATION
 *        +
 * UNIQUE USER VALUE
 *        +
 * INDEXABLE HTML
 *        +
 * INTERNAL LINKS
 *        +
 * VALID STRUCTURED DATA
 *        +
 * CLEAR CHATR CTA
 *        =
 * PUBLISH
 */

import { checkSearchDemand, type DemandRequirement, type DemandCheckResult } from './demand-check';
import { checkEvidence, type EvidenceRecord, type EvidenceCheckResult } from './evidence-check';
import { checkUniqueness, type UniquenessCheckResult } from './uniqueness-check';
import { checkStructuredData, type SchemaCheckResult } from './schema-check';
import { checkIndexability, type PageMetadata, type IndexabilityCheckResult } from './indexability-check';

export interface PageCandidate {
  slug: string;
  demand: DemandRequirement;
  evidence: EvidenceRecord;
  metadata: PageMetadata;
  bodyText: string;
  schemaData: Record<string, unknown> | Array<Record<string, unknown>>;
  clusterSampleTexts?: string[];
}

export interface QualityGateEvaluation {
  slug: string;
  canPublish: boolean;
  score: number;
  checks: {
    demand: DemandCheckResult;
    evidence: EvidenceCheckResult;
    uniqueness: UniquenessCheckResult;
    schema: SchemaCheckResult;
    indexability: IndexabilityCheckResult;
  };
  rejectionReasons: string[];
}

export function evaluateQualityGate(candidate: PageCandidate): QualityGateEvaluation {
  const demand = checkSearchDemand(candidate.demand);
  const evidence = checkEvidence(candidate.evidence, candidate.bodyText);
  const uniqueness = checkUniqueness(candidate.bodyText, candidate.clusterSampleTexts || []);
  const schema = checkStructuredData(candidate.schemaData);
  const indexability = checkIndexability(candidate.metadata);

  const rejectionReasons: string[] = [];

  if (!demand.passed) rejectionReasons.push(`[Demand] ${demand.reason}`);
  if (!evidence.passed) rejectionReasons.push(`[Evidence] ${evidence.reason}`);
  if (!uniqueness.passed) rejectionReasons.push(`[Uniqueness] ${uniqueness.reason}`);
  if (!schema.passed) rejectionReasons.push(`[Schema] ${schema.errors.join('; ')}`);
  if (!indexability.passed) rejectionReasons.push(`[Indexability] ${indexability.errors.join('; ')}`);

  const canPublish = rejectionReasons.length === 0;

  // Composite score (0-100)
  const score = Math.round(
    (demand.score * 0.2) +
    (evidence.score * 0.25) +
    (uniqueness.uniquenessRatio * 100 * 0.25) +
    (schema.passed ? 15 : 0) +
    (indexability.passed ? 15 : 0)
  );

  return {
    slug: candidate.slug,
    canPublish,
    score,
    checks: {
      demand,
      evidence,
      uniqueness,
      schema,
      indexability
    },
    rejectionReasons
  };
}
