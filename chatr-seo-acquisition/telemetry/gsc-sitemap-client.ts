import { createSign } from 'node:crypto';
import { loadServiceAccountCredentials } from './gsc-ingestion';

export async function getGscFullAccessToken(): Promise<string> {
  const creds = loadServiceAccountCredentials();
  if (!creds) {
    throw new Error('Google Search Console service account credentials not found');
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: creds.clientEmail,
    scope: 'https://www.googleapis.com/auth/webmasters',
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
  const formattedKey = creds.privateKey.includes('\\n')
    ? creds.privateKey.replace(/\\n/g, '\n')
    : creds.privateKey;

  const sign = createSign('RSA-SHA256');
  sign.update(unsignedToken);
  sign.end();
  const signature = sign
    .sign(formattedKey, 'base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const jwt = `${unsignedToken}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    }).toString()
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    throw new Error(`Google OAuth2 Token exchange failed [${tokenRes.status}]: ${errorText}`);
  }

  const data = (await tokenRes.json()) as { access_token: string };
  return data.access_token;
}

export async function listSites(token: string) {
  const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to list sites [${res.status}]: ${text}`);
  }
  return res.json();
}

export async function listSitemaps(token: string, siteUrl: string) {
  const encoded = encodeURIComponent(siteUrl);
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encoded}/sitemaps`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to list sitemaps for ${siteUrl} [${res.status}]: ${text}`);
  }
  return res.json();
}

export async function submitSitemap(token: string, siteUrl: string, feedpath: string) {
  const encodedSite = encodeURIComponent(siteUrl);
  const encodedFeed = encodeURIComponent(feedpath);
  const res = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodedSite}/sitemaps/${encodedFeed}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to submit sitemap ${feedpath} [${res.status}]: ${text}`);
  }
  return { status: res.status, ok: true };
}

export async function inspectUrl(token: string, siteUrl: string, inspectionUrl: string) {
  const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      inspectionUrl,
      siteUrl
    })
  });
  if (!res.ok) {
    const text = await res.text();
    return { error: `HTTP ${res.status}: ${text}` };
  }
  return res.json();
}

async function run() {
  console.log('🔑 Authenticating with Google Search Console API...');
  const token = await getGscFullAccessToken();
  console.log('✅ Authenticated.');

  console.log('\n🌐 Discovering verified properties...');
  const sitesResponse = await listSites(token);
  const siteEntries = sitesResponse.siteEntry || [];
  console.log(`Found ${siteEntries.length} verified site(s):`);
  for (const s of siteEntries) {
    console.log(`  - ${s.siteUrl} (permission: ${s.permissionLevel})`);
  }

  // Iterate over sites to list and submit sitemaps
  for (const s of siteEntries) {
    const siteUrl = s.siteUrl;
    console.log(`\n─────────────────────────────────────────────────────────────────`);
    console.log(`📡 Inspecting Sitemaps for property: ${siteUrl}`);
    
    try {
      const currentSitemaps = await listSitemaps(token, siteUrl);
      console.log('Current sitemaps in GSC:', JSON.stringify(currentSitemaps, null, 2));
    } catch (e: any) {
      console.warn(`Could not list sitemaps: ${e.message}`);
    }

    // Determine sitemaps to submit based on property domain
    const isChatrChat = siteUrl.includes('chatr.chat');
    const isChatrChatIn = siteUrl.includes('chatrchat.in');

    const sitemapsToSubmit = isChatrChat
      ? ['https://chatr.chat/sitemap.xml', 'https://chatr.chat/sitemap-index.xml']
      : isChatrChatIn
      ? ['https://www.chatrchat.in/sitemap.xml']
      : [];

    for (const feed of sitemapsToSubmit) {
      console.log(`\n🚀 Submitting sitemap feed: ${feed} to ${siteUrl}...`);
      try {
        const sub = await submitSitemap(token, siteUrl, feed);
        console.log(`✅ Successfully submitted: ${feed} (HTTP ${sub.status})`);
      } catch (err: any) {
        console.error(`❌ Submission failed for ${feed}: ${err.message}`);
      }
    }

    // Run URL Inspection for key URLs
    console.log(`\n🔍 Querying Google URL Inspection API on ${siteUrl}...`);
    const urlsToInspect = isChatrChat
      ? ['https://chatr.chat/', 'https://chatr.chat/download']
      : isChatrChatIn
      ? ['https://www.chatrchat.in/']
      : [];

    for (const url of urlsToInspect) {
      console.log(`  Inspecting: ${url}`);
      try {
        const report = await inspectUrl(token, siteUrl, url);
        if (report.inspectionResult) {
          const res = report.inspectionResult;
          console.log(`    Coverage State:  ${res.indexStatusResult?.coverageState}`);
          console.log(`    Indexing State:  ${res.indexStatusResult?.indexingState}`);
          console.log(`    Last Crawl Time: ${res.indexStatusResult?.lastCrawlTime}`);
          console.log(`    Robots Verdict:  ${res.indexStatusResult?.robotsTxtState}`);
          console.log(`    Page Fetch:      ${res.indexStatusResult?.pageFetchState}`);
        } else {
          console.log('    Response:', JSON.stringify(report, null, 2));
        }
      } catch (e: any) {
        console.warn(`    Inspection failed: ${e.message}`);
      }
    }
  }
}

if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes('gsc-sitemap-client')) {
  run().catch(console.error);
}
