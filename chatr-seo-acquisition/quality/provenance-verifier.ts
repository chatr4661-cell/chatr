/**
 * PROVENANCE CANONICALIZATION & CRYPTOGRAPHIC VERIFIER
 *
 * Implements a deterministic JCS-compatible (RFC 8785 subset) canonicalizer
 * to verify that evidence hashes are cryptographically computed from
 * authoritative record attributes rather than arbitrary strings.
 *
 * Technical Scope:
 *  - Deterministic key ordering (lexicographical sorting by UTF-16 code units)
 *  - Strict whitespace elimination
 *  - IEEE 754 zero normalization (-0 normalized to 0, finite validation)
 *  - Strict omission of undefined properties in objects and normalization in arrays
 *
 * Verification Pipeline:
 *  Official Source Record ──► Canonicalize (JCS) ──► SHA-256(bytes) ──► Verify against evidenceHash
 */

import { createHash } from 'node:crypto';

/**
 * Deterministically sorts object keys recursively (JCS / RFC 8785 compatible).
 */
export function canonicalizeJson(obj: unknown): string {
  if (obj === null) {
    return 'null';
  }

  if (typeof obj === 'number') {
    if (!Number.isFinite(obj)) {
      throw new TypeError('Canonical JSON does not permit non-finite numbers (NaN, Infinity).');
    }
    // Normalize -0 to 0 according to RFC 8785 Section 3.2.2.3
    return Object.is(obj, -0) ? '0' : JSON.stringify(obj);
  }

  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    const items = obj.map((item) => {
      if (item === undefined || typeof item === 'function' || typeof item === 'symbol') {
        return 'null';
      }
      return canonicalizeJson(item);
    });
    return `[${items.join(',')}]`;
  }

  const rawObj = obj as Record<string, unknown>;
  const sortedKeys = Object.keys(rawObj).sort();
  const pairs: string[] = [];

  for (const key of sortedKeys) {
    const val = rawObj[key];
    if (val === undefined || typeof val === 'function' || typeof val === 'symbol') {
      continue;
    }
    pairs.push(`${JSON.stringify(key)}:${canonicalizeJson(val)}`);
  }

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
