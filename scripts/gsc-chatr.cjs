#!/usr/bin/env node
const fs = require('fs');
const { createSign } = require('crypto');

function getPrivateKey() {
  const env = fs.readFileSync('C:\\Users\\Arshid.Wani\\chatrchat\\.env', 'utf8');
  const line = env.split('\n').find(l => l.startsWith('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY='));
  if (!line) throw new Error('Private key not found in chatrchat/.env');
  let rawKey = line.slice('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY='.length).trim();
  if (rawKey.startsWith('"') && rawKey.endsWith('"')) rawKey = rawKey.slice(1, -1);
  return rawKey.replace(/\\n/g, '\n');
}

async function getAccessToken(scope = 'https://www.googleapis.com/auth/webmasters') {
  const email = 'antigravity-search@talentxcel-login.iam.gserviceaccount.com';
  const privateKey = getPrivateKey();
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: email,
    scope: scope,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');

  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const jwt = `${header}.${payload}.${sign.sign(privateKey, 'base64url')}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await tokenRes.json();
  if (!data.access_token) {
    throw new Error('Failed to get token: ' + JSON.stringify(data));
  }
  return data.access_token;
}

async function inspectUrl(token, inspectionUrl, siteUrl) {
  const endpoint = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inspectionUrl: inspectionUrl,
      siteUrl: siteUrl,
      languageCode: 'en-US'
    })
  });

  if (!res.ok) {
    const err = await res.text();
    return { error: `HTTP ${res.status}: ${err}` };
  }
  return await res.json();
}

async function querySearchAnalytics(token, siteUrl) {
  const siteUrlEnc = encodeURIComponent(siteUrl);
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${siteUrlEnc}/searchAnalytics/query`;
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      startDate: startDate,
      endDate: endDate,
      dimensions: ['query'],
      rowLimit: 10
    })
  });

  if (!res.ok) {
    const err = await res.text();
    return { error: `HTTP ${res.status}: ${err}` };
  }
  return await res.json();
}

async function main() {
  const token = await getAccessToken('https://www.googleapis.com/auth/webmasters https://www.googleapis.com/auth/webmasters.readonly');
  console.log('✅ Google API Access token obtained successfully');

  const site = 'sc-domain:chatr.chat';
  console.log(`\n=== 1. SEARCH ANALYTICS (Last 28 Days) for ${site} ===`);
  const analytics = await querySearchAnalytics(token, site);
  if (analytics.rows && analytics.rows.length > 0) {
    console.log('Top Queries:');
    for (const r of analytics.rows) {
      console.log(` - "${r.keys[0]}": ${r.clicks} clicks, ${r.impressions} impressions, CTR: ${(r.ctr * 100).toFixed(1)}%, Position: ${r.position.toFixed(1)}`);
    }
  } else {
    console.log('Search analytics result:', JSON.stringify(analytics, null, 2));
  }

  console.log(`\n=== 2. URL INSPECTION for Key Pages ===`);
  const testUrls = [
    'https://chatr.chat/',
    'https://chatr.chat/chatr/live-call-translation/mumbai',
    'https://chatr.chat/chatr/live-call-translation/delhi',
    'https://chatr.chat/chatr/translate/hindi-to-punjabi',
    'https://chatr.chat/about'
  ];

  for (const u of testUrls) {
    console.log(`\nInspecting: ${u}`);
    const insp = await inspectUrl(token, u, site);
    if (insp.error) {
      console.log('Inspection Error:', insp.error);
    } else {
      const result = insp.inspectionResult || {};
      const indexStatus = result.indexStatusResult || {};
      console.log(`  Verdict: ${indexStatus.verdict || 'N/A'}`);
      console.log(`  Coverage State: ${indexStatus.coverageState || 'N/A'}`);
      console.log(`  Robots.txt State: ${indexStatus.robotsTxtState || 'N/A'}`);
      console.log(`  Indexing State: ${indexStatus.indexingState || 'N/A'}`);
      console.log(`  Last Crawl Time: ${indexStatus.lastCrawlTime || 'Never'}`);
      console.log(`  Page Fetch State: ${indexStatus.pageFetchState || 'N/A'}`);
      console.log(`  Google Canonical: ${indexStatus.googleCanonical || 'N/A'}`);
      console.log(`  User Canonical: ${indexStatus.userCanonical || 'N/A'}`);
    }
  }
}

main().catch(console.error);
