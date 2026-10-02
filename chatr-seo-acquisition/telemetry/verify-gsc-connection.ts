/**
 * CHATR SEO ACQUISITION — OPERATIONAL GSC CONNECTION VERIFICATION
 *
 * Dedicated verification tool to test live Google Search Console credentials,
 * OAuth2 RS256 token exchange, Search Console property permissions, and data retrieval.
 *
 * Usage:
 *  npm run seo:gsc:verify
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  loadServiceAccountCredentials,
  parseConfiguredRowLimit,
  queryGscSearchAnalytics,
  type GscRow
} from './gsc-ingestion';

async function fetchGoogleAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const { createSign } = await import('node:crypto');
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now
  };

  const base64Url = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const unsignedToken = `${base64Url(header)}.${base64Url(claimSet)}`;
  const formattedKey = privateKeyPem.includes('\\n')
    ? privateKeyPem.replace(/\\n/g, '\n')
    : privateKeyPem;

  const sign = createSign('RSA-SHA256');
  sign.update(unsignedToken);
  sign.end();
  const signature = sign
    .sign(formattedKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${unsignedToken}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    }).toString()
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google OAuth2 Token exchange failed [${res.status}]: ${errorText}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function verifyGscConnection(rootDir: string = process.cwd()): Promise<boolean> {
  console.log('════════════════════════════════════════════════════════════════════════');
  console.log('📡 CHATR SEO — GOOGLE SEARCH CONSOLE LIVE OPERATIONAL VERIFIER');
  console.log('════════════════════════════════════════════════════════════════════════\n');

  const siteUrl = process.env.GSC_SITE_URL || 'https://chatr.chat/';
  const rowLimit = parseConfiguredRowLimit();
  const credentials = loadServiceAccountCredentials(rootDir);

  if (!credentials) {
    console.log('ℹ️ OPERATIONAL STATUS: Service Account Credentials Pending\n');
    console.log('The GSC API client is fully implemented and ready. To execute a live production run:');
    console.log('────────────────────────────────────────────────────────────────────────');
    console.log('1. In Google Cloud Console:');
    console.log('   - Create a Service Account (e.g., chatr-seo-telemetry@project.iam.gserviceaccount.com)');
    console.log('   - Create and download an RS256 JSON key file.\n');
    console.log('2. In Google Search Console:');
    console.log(`   - Navigate to property: ${siteUrl}`);
    console.log('   - Go to Settings ──► Users and permissions ──► Add user');
    console.log('   - Add the Service Account email with Permission: "Restricted" (or "Full").\n');
    console.log('3. Supply credentials to the environment:');
    console.log('   Option A (Environment Variables):');
    console.log('     export GSC_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"');
    console.log('     export GSC_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n..."\n');
    console.log('   Option B (Key File - Strictly Gitignored):');
    console.log('     Place your downloaded key file at:');
    console.log('     chatr-seo-acquisition/config/gsc-service-account.json\n');
    console.log('4. Run this verification command again:');
    console.log('     npm run seo:gsc:verify');
    console.log('────────────────────────────────────────────────────────────────────────');
    return false;
  }

  const today = new Date();
  const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(today.getTime() - 33 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    console.log(`🔌 Authenticating with Google Search Console API...`);
    console.log(`   Account: ${credentials.clientEmail}`);
    console.log(`   Source:  ${credentials.source}${credentials.filePath ? ` (${credentials.filePath})` : ''}`);

    const accessToken = await fetchGoogleAccessToken(credentials.clientEmail, credentials.privateKey);
    console.log('🔑 OAuth2 token successfully acquired.');

    console.log(`\n📡 Querying Search Analytics API...`);
    console.log(`   Property:   ${siteUrl}`);
    console.log(`   Date Range: ${thirtyDaysAgo} ──► ${threeDaysAgo}`);

    const rowLimit = parseConfiguredRowLimit();
    console.log(`   Row Target: ${rowLimit} max rows`);

    const rows: GscRow[] = await queryGscSearchAnalytics(accessToken, siteUrl, {
      startDate: thirtyDaysAgo,
      endDate: threeDaysAgo,
      rowLimit
    });

    console.log(`\n✅ LIVE TELEMETRY VERIFIED: Retrieved ${rows.length} real query records from Google Search Console.`);

    // Persist snapshot with deterministic SHA-256 integrity digest
    const exportsDir = resolve(rootDir, 'chatr-seo-acquisition/data/gsc-exports');
    mkdirSync(exportsDir, { recursive: true });
    const snapshotFilename = `telemetry-${today.toISOString().split('T')[0]}.json`;
    const snapshotPath = resolve(exportsDir, snapshotFilename);

    const { canonicalizeJson } = await import('../quality/provenance-verifier');
    const { createHash } = await import('node:crypto');
    const rowsSha256 = createHash('sha256').update(canonicalizeJson(rows), 'utf8').digest('hex');

    const snapshotPayload = {
      metadata: {
        retrievedAt: today.toISOString(),
        source: 'gsc_live_api',
        siteUrl,
        startDate: thirtyDaysAgo,
        endDate: threeDaysAgo,
        rowCount: rows.length,
        schemaVersion: 1,
        sha256: rowsSha256
      },
      rows
    };
    writeFileSync(snapshotPath, JSON.stringify(snapshotPayload, null, 2), 'utf8');
    console.log(`💾 Persisted production telemetry snapshot (SHA-256 integrity digest: ${rowsSha256.slice(0, 16)}...) to:\n   ${snapshotPath}\n`);

    if (rows.length > 0) {
      console.log('📊 Top Queries by Impressions:');
      const topRows = [...rows].sort((a, b) => b.impressions - a.impressions).slice(0, 5);
      topRows.forEach((r, idx) => {
        console.log(`   ${idx + 1}. "${r.query}" — ${r.impressions} impr, ${r.clicks} clicks, pos: ${r.position.toFixed(1)}`);
      });
    } else {
      console.log('ℹ️ Property currently returned 0 query rows for this date range (new property or no search impressions yet).');
    }

    return true;
  } catch (error) {
    console.error('\n❌ LIVE GSC CONNECTION FAILED:');
    console.error(error instanceof Error ? error.message : error);
    console.log('\nTroubleshooting Checklist:');
    console.log('1. Verify that the Service Account email is added as a user on the Search Console property.');
    console.log(`2. Verify that the property URL ("${siteUrl}") matches exactly (e.g. "https://chatr.chat/" vs "sc-domain:chatr.chat").`);
    console.log('3. Ensure the Search Console API ("Google Search Console API" / Webmasters API) is enabled in Google Cloud Console.');
    return false;
  }
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('verify-gsc-connection')) {
  verifyGscConnection();
}
