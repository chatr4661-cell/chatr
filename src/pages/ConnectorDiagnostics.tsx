import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Activity, Clock, KeyRound, RefreshCw, Webhook, Gauge, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ConnectorDiagnostics,
  ConnectorRegistry,
  MATURITY_LABEL,
  maturityOf,
  type ConnectorDiagnostic,
} from '@/connectors';

function rel(iso?: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return '—';
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return `${Math.floor(hrs / 24)} d ago`;
}

function until(iso?: string | null): string {
  if (!iso) return 'no expiry';
  const diff = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(diff)) return 'unknown';
  if (diff <= 0) return 'expired';
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `in ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `in ${hrs} hr`;
  return `in ${Math.round(hrs / 24)} d`;
}

const HEALTH_DOT: Record<string, string> = {
  healthy: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  failing: 'bg-destructive',
  unknown: 'bg-muted-foreground/40',
};

export default function ConnectorDiagnosticsPage() {
  const navigate = useNavigate();
  const [probe, setProbe] = useState(false);

  const query = useQuery({
    queryKey: ['connector-diagnostics', probe],
    queryFn: () => ConnectorDiagnostics.load({ probe }),
    staleTime: 15_000,
  });

  const rows = query.data?.diagnostics ?? [];

  const summary = useMemo(() => {
    const healthy = rows.filter((r) => r.health === 'healthy').length;
    const reauth = rows.filter((r) => r.status === 'needs_reauth' || r.auth.token_expired).length;
    const noRefresh = rows.filter((r) => r.auth.kind === 'oauth2' && !r.auth.has_refresh_token).length;
    return { total: rows.length, healthy, reauth, noRefresh };
  }, [rows]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">Connector diagnostics</h1>
            <p className="truncate text-xs text-muted-foreground">
              {summary.total} connections · {summary.healthy} healthy · {summary.reauth} need re-auth
            </p>
          </div>
          <Button
            size="sm"
            variant={probe ? 'default' : 'secondary'}
            className="h-8 rounded-lg"
            onClick={() => setProbe((p) => !p)}
          >
            <Gauge className="h-4 w-4" />
            <span className="ml-1.5 text-xs">{probe ? 'Live probe on' : 'Live probe'}</span>
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => query.refetch()}
            aria-label="Refresh diagnostics"
          >
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-3 px-4 py-4">
        {query.isLoading && <p className="py-10 text-center text-sm text-muted-foreground">Collecting diagnostics…</p>}

        {!query.isLoading && rows.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No connections yet. Connect a provider to see diagnostics.
          </p>
        )}

        {summary.noRefresh > 0 && (
          <Card className="rounded-xl border-amber-500/40 p-3 text-xs">
            {summary.noRefresh} OAuth connection{summary.noRefresh === 1 ? '' : 's'} have no refresh token — they will
            need manual re-authorisation when the access token expires.
          </Card>
        )}

        {rows.map((row) => (
          <DiagnosticCard key={row.connection_id} row={row} />
        ))}

        {query.data?.generated_at && (
          <p className="pt-2 text-center text-[11px] text-muted-foreground">
            Snapshot {rel(query.data.generated_at)} · tokens are never returned to this device
          </p>
        )}
      </main>
    </div>
  );
}

function DiagnosticCard({ row }: { row: ConnectorDiagnostic }) {
  const definition = ConnectorRegistry.get(row.connector_id)?.definition;
  const lastRun = row.recent_runs?.[0];
  const failedRuns = (row.recent_runs ?? []).filter((r) => r.status === 'failed').length;

  return (
    <Card className="rounded-2xl border-border/60 p-4">
      <div className="flex items-start gap-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-primary-foreground"
          style={{ backgroundColor: definition?.brandColor ?? 'hsl(var(--primary))' }}
        >
          {(definition?.name ?? row.connector_id).slice(0, 1).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold">{definition?.name ?? row.connector_id}</h2>
            <span className="inline-flex items-center gap-1.5 text-[11px]">
              <span className={`h-1.5 w-1.5 rounded-full ${HEALTH_DOT[row.health] ?? HEALTH_DOT.unknown}`} />
              {row.health}
            </span>
            <Badge variant="secondary" className="h-5 text-[10px]">
              {row.status}
            </Badge>
            {definition && (
              <Badge variant="outline" className="h-5 text-[10px]">
                <ShieldCheck className="mr-1 h-3 w-3" />
                {MATURITY_LABEL[maturityOf(definition)]}
              </Badge>
            )}
          </div>

          <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.account ?? 'account unknown'}</p>

          <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] sm:grid-cols-3">
            <Metric icon={<KeyRound className="h-3 w-3" />} label="OAuth" value={row.auth.kind} />
            <Metric
              icon={<Clock className="h-3 w-3" />}
              label="Token expiry"
              value={until(row.auth.token_expires_at)}
              tone={row.auth.token_expired ? 'bad' : undefined}
            />
            <Metric
              icon={<RefreshCw className="h-3 w-3" />}
              label="Refresh token"
              value={row.auth.has_refresh_token ? 'present' : 'missing'}
              tone={row.auth.kind === 'oauth2' && !row.auth.has_refresh_token ? 'warn' : undefined}
            />
            <Metric icon={<Activity className="h-3 w-3" />} label="Last sync" value={rel(row.last_synced_at)} />
            <Metric
              icon={<Webhook className="h-3 w-3" />}
              label="Last webhook"
              value={row.webhooks.supported ? rel(row.webhooks.last_event_at) : 'not supported'}
            />
            <Metric
              icon={<Gauge className="h-3 w-3" />}
              label="API latency"
              value={row.latency_ms != null ? `${row.latency_ms} ms` : 'enable probe'}
              tone={row.probe_error ? 'bad' : undefined}
            />
            <Metric
              icon={<Gauge className="h-3 w-3" />}
              label="Rate limit"
              value={row.rate_limit_per_minute ? `${row.rate_limit_per_minute}/min` : 'unspecified'}
            />
            <Metric
              icon={<Activity className="h-3 w-3" />}
              label="Avg sync"
              value={row.avg_duration_ms != null ? `${row.avg_duration_ms} ms` : '—'}
            />
            <Metric
              icon={<Activity className="h-3 w-3" />}
              label="Failed runs (10)"
              value={String(failedRuns)}
              tone={failedRuns > 0 ? 'warn' : undefined}
            />
          </dl>

          {row.scopes?.length > 0 && (
            <details className="mt-2 text-[11px]">
              <summary className="cursor-pointer text-muted-foreground">Granted scopes ({row.scopes.length})</summary>
              <ul className="mt-1 space-y-0.5 font-mono text-muted-foreground">
                {row.scopes.map((s) => (
                  <li key={s} className="break-all">
                    {s}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {(row.last_error || row.probe_error || lastRun?.error) && (
            <details className="mt-2 rounded-lg bg-destructive/5 p-2 text-[11px]">
              <summary className="cursor-pointer font-medium text-destructive">Errors</summary>
              <ul className="mt-1 space-y-1 font-mono leading-snug text-muted-foreground">
                {row.last_error && <li className="break-all">connection: {row.last_error}</li>}
                {row.probe_error && <li className="break-all">probe: {row.probe_error}</li>}
                {lastRun?.error && <li className="break-all">last run: {lastRun.error}</li>}
              </ul>
            </details>
          )}
        </div>
      </div>
    </Card>
  );
}

function Metric({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: 'warn' | 'bad';
}) {
  const toneClass =
    tone === 'bad' ? 'text-destructive' : tone === 'warn' ? 'text-amber-600 dark:text-amber-400' : 'text-foreground';
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span className="truncate">{label}</span>
      </dt>
      <dd className={`truncate font-medium ${toneClass}`}>{value}</dd>
    </div>
  );
}
