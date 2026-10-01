#!/usr/bin/env node
/**
 * Direct GSC-to-Supabase Sync Pipeline
 * Pulls all queries, clicks, impressions, CTR and position from Google Search Console
 * and stores them in Supabase database tables: `gsc_queries` and `seo_search_metrics`.
 */
const fs = require('fs');
const { createSign } = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_PAT = process.env.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_PAT || '';
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'nuuuqazaoaozgblmvkzn';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nuuuqazaoaozgblmvkzn.supabase.co';

async function getSupabaseServiceRoleKey() {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/api-keys`, {
    headers: { Authorization: `Bearer ${SUPABASE_PAT}` }
  });
  const keys = await res.json();
  const sr = keys.find(k => k.name === 'service_role');
  if (!sr) throw new Error('Service role key not found');
  return sr.api_key;
}

function getPrivateKey() {
  const env = fs.readFileSync('C:\\Users\\Arshid.Wani\\chatrchat\\.env', 'utf8');
  const line = env.split('\n').find(l => l.startsWith('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY='));
  if (!line) throw new Error('Private key not found in chatrchat/.env');
  let rawKey = line.slice('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY='.length).trim();
  if (rawKey.startsWith('"') && rawKey.endsWith('"')) rawKey = rawKey.slice(1, -1);
  return rawKey.replace(/\\n/g, '\n');
}

async function getGoogleToken() {
  const email = 'antigravity-search@talentxcel-login.iam.gserviceaccount.com';
  const privateKey = getPrivateKey();
  const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    iss: email,
    scope: SCOPE,
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
  if (!data.access_token) throw new Error('Google auth failed: ' + JSON.stringify(data));
  return data.access_token;
}

async function fetchGSCData(googleToken, siteUrl, dimensions, rowLimit = 25000) {
  const encodedSite = encodeURIComponent(siteUrl);
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`;
  const endDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${googleToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions,
      rowLimit,
      dataState: 'final'
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`GSC query failed for ${dimensions.join(',')}:`, err);
    return [];
  }
  const json = await res.json();
  return json.rows || [];
}

async function main() {
  console.log('🔄 Initializing GSC to Supabase sync pipeline...');

  const [serviceRoleKey, googleToken] = await Promise.all([
    getSupabaseServiceRoleKey(),
    getGoogleToken()
  ]);
  console.log('✅ Obtained Supabase Service Role & Google API tokens');

  const supabase = createClient(SUPABASE_URL, serviceRoleKey);
  const siteUrl = 'sc-domain:chatr.chat';
  const syncDate = new Date().toISOString().split('T')[0];

  // Ensure property exists in gsc_properties
  await supabase.from('gsc_properties').upsert({
    property_id: siteUrl,
    display_name: 'chatr.chat (Domain Property)',
    auth_status: 'CONNECTED',
    updated_at: new Date().toISOString()
  }, { onConflict: 'property_id' });

  // 1. Fetch query + page data
  console.log('📊 Fetching query + page search performance from GSC...');
  const queryPageRows = await fetchGSCData(googleToken, siteUrl, ['query', 'page']);
  console.log(`Received ${queryPageRows.length} query+page rows from GSC`);

  let upsertedCount = 0;
  for (const row of queryPageRows) {
    const query = row.keys[0] || '';
    const page = row.keys[1] || '';
    if (!query) continue;

    // Upsert into gsc_queries
    const { error: qErr } = await supabase.from('gsc_queries').upsert({
      property_id: siteUrl,
      sync_date: syncDate,
      query,
      page,
      country: 'ALL',
      device: 'ALL',
      clicks: Math.round(row.clicks || 0),
      impressions: Math.round(row.impressions || 0),
      ctr: row.ctr || 0,
      position: row.position || 0,
      data_source: 'gsc_api',
      synced_at: new Date().toISOString()
    }, { onConflict: 'property_id,query,country,device' });

    if (qErr) {
      console.warn(`gsc_queries upsert notice for '${query}':`, qErr.message);
    } else {
      upsertedCount++;
    }

    // Upsert into seo_search_metrics
    await supabase.from('seo_search_metrics').upsert({
      site_url: siteUrl,
      metric_date: syncDate,
      page,
      query,
      country: 'ALL',
      device: 'ALL',
      clicks: Math.round(row.clicks || 0),
      impressions: Math.round(row.impressions || 0),
      ctr: row.ctr || 0,
      position: row.position || 0,
      synced_at: new Date().toISOString()
    }, { onConflict: 'site_url,metric_date,page,query,country,device' });
  }

  console.log(`✅ Successfully stored ${upsertedCount} search queries in Supabase database!`);

  // 2. Trigger calculate_gsc_opportunities if RPC exists
  try {
    const { error: rpcErr } = await supabase.rpc('calculate_gsc_opportunities', {
      p_property_id: siteUrl
    });
    if (rpcErr) {
      console.log('Notice on calculate_gsc_opportunities:', rpcErr.message);
    } else {
      console.log('✅ Recalculated GSC opportunities for high-impression keywords');
    }
  } catch (err) {
    console.log('RPC check:', err.message);
  }

  // 3. Print Top Search Acquisition Opportunities
  console.log('\n=== TOP CUSTOMER ACQUISITION SEARCH TERMS FROM GSC ===');
  const sorted = [...queryPageRows].sort((a, b) => (b.impressions || 0) - (a.impressions || 0)).slice(0, 15);
  for (const r of sorted) {
    console.log(` 🎯 "${r.keys[0]}": ${r.impressions} impressions | ${r.clicks} clicks | ${(r.ctr * 100).toFixed(1)}% CTR | Pos: ${r.position.toFixed(1)} | Page: ${r.keys[1]}`);
  }
}

main().catch(console.error);
