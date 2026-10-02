/**
 * BASELINE GENERATOR FOR CHATR CORE FREEZE CONTRACT
 *
 * Scans all files across the frozen directories and generates a cryptographic
 * SHA-256 checksum manifest (core-freeze-baseline.json).
 *
 * This baseline is the immutable reference of truth. Any subsequent run of the
 * Core Freeze Gate validates against this pinned manifest, preventing bypasses
 * even if unauthorized edits were committed to Git.
 */

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';

export const FROZEN_DIRECTORIES = [
  'src/auth',
  'src/components',
  'src/contexts',
  'src/hooks',
  'src/integrations',
  'src/layouts',
  'src/pages',
  'src/routes',
  'supabase/migrations',
  'supabase/functions',
  'android',
  'ios'
];

export interface FileChecksumEntry {
  path: string;
  sha256: string;
  sizeBytes: number;
}

export interface CoreFreezeBaseline {
  generatedAt: string;
  baselineCommit: string;
  totalFilesTracked: number;
  files: Record<string, { sha256: string; sizeBytes: number }>;
}

function computeFileSha256(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

function scanDirectory(dirPath: string, rootDir: string): FileChecksumEntry[] {
  const results: FileChecksumEntry[] = [];
  if (!existsSync(dirPath)) return results;

  const entries = readdirSync(dirPath);
  for (const entry of entries) {
    // Skip temporary or cache files
    if (entry.startsWith('.') || entry === 'node_modules' || entry === 'dist') continue;

    const fullPath = resolve(dirPath, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      results.push(...scanDirectory(fullPath, rootDir));
    } else if (stat.isFile()) {
      const relPath = relative(rootDir, fullPath).replace(/\\/g, '/');
      results.push({
        path: relPath,
        sha256: computeFileSha256(fullPath),
        sizeBytes: stat.size
      });
    }
  }

  return results;
}

export function generateFreezeBaseline(rootDir: string = process.cwd(), commitHash: string = '17e461cb'): CoreFreezeBaseline {
  const filesRecord: Record<string, { sha256: string; sizeBytes: number }> = {};
  let totalCount = 0;

  for (const frozenDir of FROZEN_DIRECTORIES) {
    const fullDirPath = resolve(rootDir, frozenDir);
    const files = scanDirectory(fullDirPath, rootDir);
    for (const f of files) {
      filesRecord[f.path] = { sha256: f.sha256, sizeBytes: f.sizeBytes };
      totalCount++;
    }
  }

  const baseline: CoreFreezeBaseline = {
    generatedAt: new Date().toISOString(),
    baselineCommit: commitHash,
    totalFilesTracked: totalCount,
    files: filesRecord
  };

  const outputPath = resolve(rootDir, 'chatr-seo-acquisition/contracts/core-freeze-baseline.json');
  
  if (existsSync(outputPath) && process.env.ALLOW_BASELINE_MUTATION !== '1') {
    throw new Error(
      '🔒 SECURITY ERROR: Baseline manifest core-freeze-baseline.json is cryptographically immutable.\n' +
      '   To regenerate the baseline, set ALLOW_BASELINE_MUTATION=1 and pass --allow-baseline-overwrite-break-glass-only.'
    );
  }

  writeFileSync(outputPath, JSON.stringify(baseline, null, 2), 'utf8');
  console.log(`✅ Generated Core Freeze Baseline: ${totalCount} files cryptographically pinned to ${commitHash}.`);
  console.log(`   Saved manifest to: ${outputPath}`);

  return baseline;
}

// Direct CLI execution
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('generate-freeze-baseline')) {
  if (!process.argv.includes('--allow-baseline-overwrite-break-glass-only')) {
    console.error('🔒 Refused: Missing required --allow-baseline-overwrite-break-glass-only flag.');
    process.exit(1);
  }
  generateFreezeBaseline();
}
