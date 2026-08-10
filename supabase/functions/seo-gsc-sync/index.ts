/**
 * CHATR — Search Console sync.
 *
 * Truth rules enforced here:
 *  - If no Search Console connection exists, the function reports
 *    `NOT_CONNECTED`. It never fabricates clicks, impressions or positions.
 *  - Metrics are stored exactly as Google reports them, with no rounding,
 *    smoothing, modelling or interpolation.
 *  - Sync is idempotent: rows are upserted on
 *    (site_url, metric_date, page, query, country, device).
 *  - Absent data is recorded as "no reported data", not as zero performance.
 *  - Property resolution follows list -> match -> select; multiple matches are
 *    returned to the caller for an explicit choice.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY = 'https://connector-gateway.lovable.dev/google_search_console';
const TARGET_ORIGIN = 'https://chatr.chat';

interface SiteEntry {
  siteUrl: string;
  permissionLevel?: string;
}

const coversTarget = (siteUrl: string, target: URL) => {
  if (siteUrl.startsWith('sc-domain:')) {
    const domain = siteUrl.slice('sc-domain:'.length).toLowerCase();
    const host = target.hostname.toLowerCase();
    return host === domain || host.endsWith(`.${domain}`);
  }
  try {
    return target.href.startsWith(new URL(siteUrl).href);
  } catch {
    return false;
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
  const connectionApiKey = Deno.env.get('GOOGLE_SEARCH_CONSOLE_API_KEY');

  // No connection: log the honest state and stop. Never invent data.
  if (!lovableApiKey || !connectionApiKey) {
    await supabase.from('seo_gsc_sync').insert({
      status: 'NOT_CONNECTED',
      error: 'No Google Search Console connection is configured for this project.',
      finished_at: new Date().toISOString(),
    });
    return json(
      {
        status: 'NOT_CONNECTED',
        message:
          'Search Console is not connected, so no search performance data is available. This is not evidence of zero traffic.',
      },
      200,
    );
  }

  const headers = {
    Authorization: `Bearer ${lovableApiKey}`,
    'X-Connection-Api-Key': connectionApiKey,
  };

  let body: { site_url?: string; days?: number } = {};
  try {
    body = req.method === 'POST' ? await req.json() : {};
  } catch {
    body = {};
  }
  const days = Math.min(Math.max(Number(body.days) || 28, 1), 90);

  const started = new Date().toISOString();

  try {
    // 1. list verified properties
    const sitesRes = await fetch(`${GATEWAY}/webmasters/v3/sites`, { headers });
    if (!sitesRes.ok) {
      const text = await sitesRes.text();
      await supabase.from('seo_gsc_sync').insert({
        status: 'ERROR',
        error: `sites list failed [${sitesRes.status}]: ${text}`,
        started_at: started,
        finished_at: new Date().toISOString(),
      });
      return json({ status: 'ERROR', http_status: sitesRes.status, details: text }, sitesRes.status);
    }

    const { siteEntry = [] } = (await sitesRes.json()) as { siteEntry?: SiteEntry[] };
    const target = new URL(TARGET_ORIGIN);
    const matches = siteEntry.filter(
      (entry) => entry.permissionLevel !== 'siteUnverifiedUser' && coversTarget(entry.siteUrl, target),
    );

    let siteUrl: string;
    if (body.site_url) {
      const selected = matches.find((m) => m.siteUrl === body.site_url);
      if (!selected) {
        return json(
          { status: 'ERROR', message: 'Selected property is not verified for chatr.chat.' },
          400,
        );
      }
      siteUrl = selected.siteUrl;
    } else if (matches.length === 0) {
      await supabase.from('seo_gsc_sync').insert({
        status: 'NO_PROPERTY',
        error: 'No verified Search Console property covers https://chatr.chat',
        started_at: started,
        finished_at: new Date().toISOString(),
      });
      return json({
        status: 'NO_PROPERTY',
        message:
          'No verified Search Console property covers chatr.chat, so no data can be read. This is unavailable evidence, not zero traffic.',
      });
    } else if (matches.length > 1) {
      return json({
        status: 'SELECTION_REQUIRED',
        candidates: matches.map((m) => m.siteUrl),
      });
    } else {
      siteUrl = matches[0].siteUrl;
    }

    // 2. query search analytics for the requested window
    const end = new Date();
    end.setUTCDate(end.getUTCDate() - 2); // Search Console lags ~2 days
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (days - 1));
    const iso = (d: Date) => d.toISOString().split('T')[0];

    const queryRes = await fetch(
      `${GATEWAY}/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: iso(start),
          endDate: iso(end),
          dimensions: ['date', 'page', 'query'],
          rowLimit: 25000,
        }),
      },
    );

    if (!queryRes.ok) {
      const text = await queryRes.text();
      await supabase.from('seo_gsc_sync').insert({
        site_url: siteUrl,
        range_start: iso(start),
        range_end: iso(end),
        status: queryRes.status === 403 ? 'FORBIDDEN' : 'ERROR',
        error: `searchAnalytics failed [${queryRes.status}]: ${text}`,
        started_at: started,
        finished_at: new Date().toISOString(),
      });
      return json({ status: 'ERROR', http_status: queryRes.status, details: text }, queryRes.status);
    }

    const { rows = [] } = (await queryRes.json()) as {
      rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>;
    };

    // 3. store verbatim, idempotently
    const records = rows.map((row) => ({
      site_url: siteUrl,
      metric_date: row.keys[0],
      page: row.keys[1] ?? '',
      query: row.keys[2] ?? '',
      country: '',
      device: '',
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      synced_at: new Date().toISOString(),
    }));

    let stored = 0;
    for (let i = 0; i < records.length; i += 500) {
      const chunk = records.slice(i, i + 500);
      const { error } = await supabase
        .from('seo_search_metrics')
        .upsert(chunk, { onConflict: 'site_url,metric_date,page,query,country,device' });
      if (error) throw new Error(error.message);
      stored += chunk.length;
    }

    await supabase.from('seo_gsc_sync').insert({
      site_url: siteUrl,
      range_start: iso(start),
      range_end: iso(end),
      status: records.length === 0 ? 'NO_REPORTED_DATA' : 'OK',
      rows_stored: stored,
      started_at: started,
      finished_at: new Date().toISOString(),
    });

    return json({
      status: records.length === 0 ? 'NO_REPORTED_DATA' : 'OK',
      site_url: siteUrl,
      range: { start: iso(start), end: iso(end) },
      rows_stored: stored,
      note:
        records.length === 0
          ? 'Search Console reported no rows for this window. Low-volume queries are often omitted; treat this as no reported data.'
          : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await supabase.from('seo_gsc_sync').insert({
      status: 'ERROR',
      error: message,
      started_at: started,
      finished_at: new Date().toISOString(),
    });
    return json({ status: 'ERROR', error: message }, 500);
  }
});
