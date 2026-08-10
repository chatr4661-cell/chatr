import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Activity, AlertTriangle, CheckCircle2, Globe, Link2, RefreshCw, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { SEO_DOMAINS } from '@/config/seoDomains';
import { CHATR_CLUSTERS, findOrphanPages } from '@/config/seoClusters';
import { getSitemapData } from '@/utils/sitemapGenerator';

interface SyncRow {
  id: string;
  site_url: string | null;
  status: string;
  rows_stored: number;
  error: string | null;
  started_at: string;
  range_start: string | null;
  range_end: string | null;
}

interface AttributionRow {
  landing_path: string;
  referrer_host: string | null;
  utm_source: string | null;
  search_query: string | null;
  created_at: string;
}

const StatusBadge = ({ status }: { status: string }) => {
  const tone =
    status === 'OK'
      ? 'default'
      : status === 'NO_REPORTED_DATA' || status === 'NOT_CONNECTED' || status === 'NO_PROPERTY'
        ? 'secondary'
        : 'destructive';
  return <Badge variant={tone as 'default' | 'secondary' | 'destructive'}>{status}</Badge>;
};

const SeoControlTower = () => {
  const sitemap = useMemo(() => getSitemapData(), []);
  const orphans = useMemo(() => findOrphanPages(), []);
  const [syncs, setSyncs] = useState<SyncRow[]>([]);
  const [attribution, setAttribution] = useState<AttributionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [syncRes, attrRes] = await Promise.all([
      supabase
        .from('seo_gsc_sync')
        .select('id, site_url, status, rows_stored, error, started_at, range_start, range_end')
        .order('started_at', { ascending: false })
        .limit(10),
      supabase
        .from('seo_attribution')
        .select('landing_path, referrer_host, utm_source, search_query, created_at')
        .order('created_at', { ascending: false })
        .limit(25),
    ]);
    setSyncs((syncRes.data as SyncRow[]) ?? []);
    setAttribution((attrRes.data as AttributionRow[]) ?? []);
    setReadError(syncRes.error?.message ?? attrRes.error?.message ?? null);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const runSync = async () => {
    setSyncing(true);
    await supabase.functions.invoke('seo-gsc-sync', { body: { days: 28 } });
    setSyncing(false);
    void load();
  };

  const latest = syncs[0];
  const gscConnected = Boolean(latest && !['NOT_CONNECTED', 'NO_PROPERTY'].includes(latest.status));

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Helmet>
        <title>SEO Control Tower — Chatr internal</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">SEO Control Tower</h1>
        <p className="text-sm text-muted-foreground">
          Only measured state is shown. Anything unmeasured is labelled unavailable rather than
          estimated.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Indexable URLs</CardDescription>
            <CardTitle className="text-3xl">{sitemap.indexableCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {sitemap.partitionCount} sitemap partition(s), {sitemap.usesIndex ? 'index' : 'single urlset'}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Blocked prefixes</CardDescription>
            <CardTitle className="text-3xl">{sitemap.noindexPrefixCount}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Private, transactional and utility routes
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Clusters</CardDescription>
            <CardTitle className="text-3xl">{CHATR_CLUSTERS.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            {orphans.length === 0 ? 'No orphan pages' : `${orphans.length} orphan page(s)`}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Search Console</CardDescription>
            <CardTitle className="flex items-center gap-2 text-lg">
              {gscConnected ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              )}
              {latest ? latest.status : 'NEVER SYNCED'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button size="sm" variant="outline" onClick={runSync} disabled={syncing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync now
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" /> Domains
            </CardTitle>
            <CardDescription>Only the owned domain emits URLs from this build.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {SEO_DOMAINS.map((domain) => (
              <div key={domain.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{domain.origin}</p>
                  <p className="text-xs text-muted-foreground">{domain.purpose}</p>
                </div>
                <Badge variant={domain.owned ? 'default' : 'secondary'}>
                  {domain.owned ? 'built here' : 'separate deploy'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Search className="h-4 w-4" /> Search Console sync log
            </CardTitle>
            <CardDescription>
              Raw outcomes. Missing data is reported as such — never as zero visibility.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {readError && (
              <p className="text-sm text-muted-foreground">
                You do not have access to these records ({readError}).
              </p>
            )}
            {!loading && !readError && syncs.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No sync has run yet, so there is no Search Console data to report.
              </p>
            )}
            {syncs.map((row) => (
              <div key={row.id} className="rounded-lg border p-3 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <StatusBadge status={row.status} />
                  <span className="text-muted-foreground">
                    {new Date(row.started_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {row.site_url ?? 'no property'} · {row.rows_stored} row(s)
                  {row.range_start ? ` · ${row.range_start} → ${row.range_end}` : ''}
                </p>
                {row.error && <p className="mt-1 text-destructive">{row.error}</p>}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" /> Observed arrivals
            </CardTitle>
            <CardDescription>
              Real referrer and campaign signals captured on landing. No modelled attribution.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!loading && attribution.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No arrivals with an external signal recorded yet.
              </p>
            )}
            <div className="space-y-1">
              {attribution.map((row, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-xs">
                  <Link2 className="h-3 w-3 text-muted-foreground" />
                  <span className="font-medium">{row.landing_path}</span>
                  <span className="text-muted-foreground">
                    {row.referrer_host ?? 'direct / no referrer'}
                  </span>
                  {row.utm_source && <Badge variant="secondary">{row.utm_source}</Badge>}
                  {row.search_query && <span className="italic">“{row.search_query}”</span>}
                  <span className="ml-auto text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SeoControlTower;
