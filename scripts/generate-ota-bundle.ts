/**
 * CHATR OS — LIVE OTA BUNDLE PACKAGER
 *
 * Packages the production `dist/` build into an immutable, checksummed zip bundle
 * for Over-The-Air deployment to native iOS and Android shells.
 *
 * Uses native child_process with cross-platform zip compression.
 *
 * Usage:
 *   npx tsx scripts/generate-ota-bundle.ts [version]
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

async function main() {
  const rootDir = process.cwd();
  const distDir = resolve(rootDir, 'dist');
  const otaDir = resolve(rootDir, 'dist-ota');

  if (!existsSync(distDir)) {
    console.error('❌ dist/ directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  if (!existsSync(otaDir)) {
    mkdirSync(otaDir, { recursive: true });
  }

  const pkg = JSON.parse(readFileSync(resolve(rootDir, 'package.json'), 'utf8'));
  const version = process.argv[2] || `${pkg.version || '1.0.0'}-${Date.now()}`;
  const zipName = `chatr-bundle-${version}.zip`;
  const zipPath = resolve(otaDir, zipName);

  console.log(`📦 Packaging production bundle for Live OTA: ${zipName}...`);

  // Cross-platform zip command (PowerShell on Windows, zip utility on Linux/macOS)
  if (process.platform === 'win32') {
    const psCmd = `Compress-Archive -Path "${distDir}\\*" -DestinationPath "${zipPath}" -Force`;
    execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: 'inherit' });
  } else {
    execSync(`cd "${distDir}" && zip -r "${zipPath}" ./*`, { stdio: 'inherit' });
  }

  const zipBytes = readFileSync(zipPath);
  const checksum = createHash('sha256').update(zipBytes).digest('hex');

  const manifest = {
    version,
    buildNumber: Date.now(),
    bundleName: zipName,
    downloadUrl: `https://chatr.chat/ota/${zipName}`,
    checksumSha256: checksum,
    sizeBytes: zipBytes.length,
    publishedAt: new Date().toISOString(),
    isMandatory: false,
    minShellVersion: '1.0.0'
  };

  const manifestPath = resolve(otaDir, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log('✅ Live OTA Bundle successfully created!');
  console.log(`   • Version:     ${version}`);
  console.log(`   • Size:        ${(zipBytes.length / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`   • SHA-256:     ${checksum}`);
  console.log(`   • Manifest:    ${manifestPath}`);
  console.log(`   • Zip output:  ${zipPath}`);
}

main().catch((err) => {
  console.error('❌ OTA bundling failed:', err);
  process.exit(1);
});
