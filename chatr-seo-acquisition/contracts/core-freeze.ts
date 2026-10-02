/**
 * CHATR SEO ACQUISITION LAYER — CRYPTOGRAPHIC CORE FREEZE GATE
 *
 * INVARIANT:
 * The existing CHATR application is production-frozen. The SEO Acquisition
 * Layer MUST NOT modify:
 *  - Authentication, signup, login
 *  - Chat & messaging logic
 *  - Voice & video calling (WebRTC)
 *  - SI personal intelligence
 *  - Supabase schemas & migrations
 *  - Existing UI/UX & application routes
 *  - Pricing or business logic
 *
 * This gate validates the live file system against a pinned SHA-256 baseline
 * manifest (core-freeze-baseline.json). It detects modified files, deleted files,
 * or newly inserted files in any frozen directory, regardless of Git commit state.
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { FROZEN_DIRECTORIES, type CoreFreezeBaseline } from './generate-freeze-baseline';

export interface CoreFreezeReport {
  passed: boolean;
  timestamp: string;
  baselineCommit: string;
  totalBaselineFiles: number;
  modifiedFiles: Array<{ path: string; expectedHash: string; actualHash: string }>;
  deletedFiles: string[];
  unexpectedFiles: string[];
  statusMessage: string;
}

function computeFileSha256(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

function scanDirectory(dirPath: string, rootDir: string): Map<string, { sha256: string; sizeBytes: number }> {
  const map = new Map<string, { sha256: string; sizeBytes: number }>();
  if (!existsSync(dirPath)) return map;

  const entries = readdirSync(dirPath);
  for (const entry of entries) {
    if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist') continue;

    const fullPath = resolve(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      const sub = scanDirectory(fullPath, rootDir);
      for (const [k, v] of sub.entries()) {
        map.set(k, v);
      }
    } else if (stat.isFile()) {
      const relPath = relative(rootDir, fullPath).replace(/\\/g, '/');
      map.set(relPath, {
        sha256: computeFileSha256(fullPath),
        sizeBytes: stat.size
      });
    }
  }

  return map;
}

export const EXPECTED_BASELINE_COMMIT = '17e461cb';
export const EXPECTED_BASELINE_MANIFEST_SHA256 = 'dc422c26ae7a4ad0f546673b198fdb8541a442e3651dbc56df82d9cd406d0b11';

export function verifyCoreFreeze(rootDir: string = process.cwd()): CoreFreezeReport {
  const timestamp = new Date().toISOString();
  const baselinePath = resolve(rootDir, 'chatr-seo-acquisition/contracts/core-freeze-baseline.json');

  if (!existsSync(baselinePath)) {
    return {
      passed: false,
      timestamp,
      baselineCommit: 'UNKNOWN',
      totalBaselineFiles: 0,
      modifiedFiles: [],
      deletedFiles: [],
      unexpectedFiles: [],
      statusMessage: `❌ CORE FREEZE GATE ERROR: Baseline manifest missing at ${baselinePath}. Cannot verify core freeze.`
    };
  }

  // Cryptographic Trust Anchor Check: Validate the baseline manifest itself
  const manifestBytes = readFileSync(baselinePath);
  const actualManifestSha256 = createHash('sha256').update(manifestBytes).digest('hex');

  if (actualManifestSha256 !== EXPECTED_BASELINE_MANIFEST_SHA256) {
    return {
      passed: false,
      timestamp,
      baselineCommit: 'TAMPERED',
      totalBaselineFiles: 0,
      modifiedFiles: [],
      deletedFiles: [],
      unexpectedFiles: [],
      statusMessage: `❌ CORE FREEZE TRUST ANCHOR VIOLATION: Baseline manifest has been modified!\n` +
        `   Expected SHA-256: ${EXPECTED_BASELINE_MANIFEST_SHA256}\n` +
        `   Actual SHA-256:   ${actualManifestSha256}\n` +
        `   The baseline manifest is cryptographically pinned and must never be altered during SEO workflows.`
    };
  }

  const baseline: CoreFreezeBaseline = JSON.parse(manifestBytes.toString('utf8'));

  if (baseline.baselineCommit !== EXPECTED_BASELINE_COMMIT) {
    return {
      passed: false,
      timestamp,
      baselineCommit: baseline.baselineCommit,
      totalBaselineFiles: baseline.totalFilesTracked,
      modifiedFiles: [],
      deletedFiles: [],
      unexpectedFiles: [],
      statusMessage: `❌ CORE FREEZE TRUST ANCHOR VIOLATION: Baseline commit mismatch!\n` +
        `   Expected Commit: ${EXPECTED_BASELINE_COMMIT}\n` +
        `   Manifest Commit: ${baseline.baselineCommit}`
    };
  }

  const baselineFiles = baseline.files;

  // Scan current disk state across all frozen directories
  const currentFiles = new Map<string, { sha256: string; sizeBytes: number }>();
  for (const dir of FROZEN_DIRECTORIES) {
    const fullDirPath = resolve(rootDir, dir);
    const scanned = scanDirectory(fullDirPath, rootDir);
    for (const [k, v] of scanned.entries()) {
      currentFiles.set(k, v);
    }
  }

  const modifiedFiles: CoreFreezeReport['modifiedFiles'] = [];
  const deletedFiles: string[] = [];
  const unexpectedFiles: string[] = [];

  // Check 1: Verify all baseline files exist and match their exact SHA-256 hash
  for (const [expectedPath, meta] of Object.entries(baselineFiles)) {
    const current = currentFiles.get(expectedPath);
    if (!current) {
      deletedFiles.push(expectedPath);
    } else if (current.sha256 !== meta.sha256) {
      modifiedFiles.push({
        path: expectedPath,
        expectedHash: meta.sha256.slice(0, 12),
        actualHash: current.sha256.slice(0, 12)
      });
    }
  }

  // Check 2: Verify no unexpected new files were added to frozen directories
  for (const currentPath of currentFiles.keys()) {
    if (!baselineFiles[currentPath]) {
      unexpectedFiles.push(currentPath);
    }
  }

  const passed = modifiedFiles.length === 0 && deletedFiles.length === 0 && unexpectedFiles.length === 0;

  let statusMessage = '';
  if (passed) {
    statusMessage = `✅ CORE FREEZE GATE PASSED: Cryptographically verified ${baseline.totalFilesTracked} files against baseline ${baseline.baselineCommit}. Zero modifications detected.`;
  } else {
    statusMessage = `❌ CORE FREEZE GATE VIOLATION (Pinned Baseline: ${baseline.baselineCommit}):\n` +
      (modifiedFiles.length > 0 ? `   Modified (${modifiedFiles.length}):\n${modifiedFiles.map((f) => `     - ${f.path} [expected: ${f.expectedHash}, actual: ${f.actualHash}]`).join('\n')}\n` : '') +
      (deletedFiles.length > 0 ? `   Deleted (${deletedFiles.length}):\n${deletedFiles.map((p) => `     - ${p}`).join('\n')}\n` : '') +
      (unexpectedFiles.length > 0 ? `   Unauthorized Additions (${unexpectedFiles.length}):\n${unexpectedFiles.map((p) => `     - ${p}`).join('\n')}` : '');
  }

  return {
    passed,
    timestamp,
    baselineCommit: baseline.baselineCommit,
    totalBaselineFiles: baseline.totalFilesTracked,
    modifiedFiles,
    deletedFiles,
    unexpectedFiles,
    statusMessage
  };
}

// Direct CLI execution
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('core-freeze')) {
  const report = verifyCoreFreeze();
  console.log(report.statusMessage);
  if (!report.passed) {
    console.error('\nBuild blocked by Core Freeze Contract. Revert core modifications before proceeding.');
    process.exit(1);
  }
}
