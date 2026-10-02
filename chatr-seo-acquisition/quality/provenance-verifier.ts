/**
 * PROVENANCE CANONICALIZATION & CRYPTOGRAPHIC VERIFIER
 *
 * Implements deterministic RFC 8785 JSON Canonicalization Scheme (JCS)
 * to verify that evidence hashes are cryptographically computed from the
 * authoritative record attributes rather than arbitrary strings.
 *
 * Verification Pipeline:
 *  Official Source Record ──► Canonicalize (RFC 8785) ──► SHA-256(bytes) ──► Verify against evidenceHash
 */

import { createHash } from 'node:crypto';

/**
 * Deterministically sorts object keys recursively (RFC 8785 JCS).
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return `[${obj.map((item) => canonicalizeJson(item)).join(',')}]`;
  }

  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = sortedKeys.map((key) => {
    const val = (obj as Record<string, unknown>)[key];
    return `${JSON.stringify(key)}:${canonicalizeJson(val)}`;
  });

  return `{${pairs.join(',')}}`;
}

/**
 * Computes deterministic SHA-256 of a canonical record.
 */
export function computeCanonicalRecordHash(recordData: Record<string, unknown>): string {
  const canonicalString = canonicalizeJson(recordData);
  return createHash('sha256').update(canonicalString, 'utf8').digest('hex');
}

export interface ProvenanceAuditResult {
  passed: boolean;
  computedHash: string;
  expectedHash: string;
  sourceUrl: string;
  retrievedAt: string;
  error?: string;
}

/**
 * Verifies that a record's evidenceHash matches the SHA-256 of its canonical data attributes.
 */
export function verifyRecordProvenance(
  recordDataPoints: Record<string, unknown>,
  declaredEvidenceHash: string,
  sourceUrl: string,
  retrievedAt: string
): ProvenanceAuditResult {
  const computedHash = computeCanonicalRecordHash(recordDataPoints);
  const passed = computedHash === declaredEvidenceHash;

  return {
    passed,
    computedHash,
    expectedHash: declaredEvidenceHash,
    sourceUrl,
    retrievedAt,
    error: passed
      ? undefined
      : `Provenance verification mismatch: computed SHA-256 (${computedHash}) does not match declared evidenceHash (${declaredEvidenceHash}).`
  };
}
