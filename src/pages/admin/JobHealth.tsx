import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, CheckCircle2, Clock, RefreshCw, Timer, XCircle, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { CronExpressionParser } from "cron-parser";

type RunDetail = {
  runid: number;
  status: string | null;
  return_message: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_ms: number | null;
};

type JobHealth = {
  jobid: number;
  jobname: string;
  schedule: string;
  active: boolean;
  last_run: RunDetail | null;
  recent_runs: RunDetail[];
  failures_24h: number;
  runs_24h: number;
  currently_running: number;
};

function parseCronToInterval(schedule: string): number | null {
  // returns expected seconds between runs based on minutes/hours fields in 5-field cron
  // Supports patterns like "0 */3 * * *" (every 3 hours)
  try {
    const parts = schedule.trim().split(/\s+/);
    if (parts.length < 5) return null;
    const [, hour] = parts;
    const stepMatch = hour.match(/^\*\/(\d+)$/);
    if (stepMatch) return parseInt(stepMatch[1], 10) * 3600;
    const minStep = parts[0].match(/^\*\/(\d+)$/);
    if (minStep) return parseInt(minStep[1], 10) * 60;
    return null;
  } catch {
    return null;
  }
}

function nextRunFromCron(schedule: string): Date | null {
  try {
    const it = CronExpressionParser.parse(schedule, { tz: "UTC" });
    return it.next().toDate();
  } catch {
    return null;
  }
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const abs = Math.abs(diff);
  const sign = diff >= 0 ? "ago" : "from now";
  if (abs < 60_000) return `${Math.round(abs / 1000)}s ${sign}`;
  if (abs < 3_600_000) return `${Math.round(abs / 60_000)}m ${sign}`;
  if (abs < 86_400_000) return `${Math.round(abs / 3_600_000)}h ${sign}`;
  return `${Math.round(abs / 86_400_000)}d ${sign}`;
}

function fmtDuration(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)} s`;
  return `${(ms / 60_000).toFixed(2)} min`;
}

export default function JobHealth() {
  const [jobs, setJobs] = useState<JobHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const { data, error } = await supabase.rpc("get_cron_jobs_health" as any, {
      name_filter: "%digest%",
    });
    if (error) {
      toast.error(error.message || "Failed to load job health");
      setJobs([]);
    } else {
      setJobs((data as JobHealth[]) ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    const i = setInterval(load, 30_000);
    return () => clearInterval(i);
  }, [load]);

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Job Health</h1>
          <p className="text-muted-foreground">
            Status of scheduled digest notification jobs.
          </p>
        </div>
        <Button onClick={load} disabled={refreshing} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Loading…</CardContent></Card>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            No digest cron jobs found. Ensure the schedule is registered.
          </CardContent>
        </Card>
      ) : (
        jobs.map((j) => <JobCard key={j.jobid} job={j} />)
      )}
    </div>
  );
}

function JobCard({ job }: { job: JobHealth }) {
  const next = useMemo(() => nextRunFromCron(job.schedule), [job.schedule]);
  const expectedIntervalSec = useMemo(() => parseCronToInterval(job.schedule), [job.schedule]);

  const lastRunAt = job.last_run?.start_time ? new Date(job.last_run.start_time) : null;
  const sinceLastSec = lastRunAt ? Math.round((Date.now() - lastRunAt.getTime()) / 1000) : null;

  // Backlog = haven't run in > 1.5x expected interval
  const isBacklogged =
    expectedIntervalSec != null &&
    sinceLastSec != null &&
    sinceLastSec > expectedIntervalSec * 1.5;

  const isFailing = (job.last_run?.status === "failed") || job.failures_24h > 0;
  const isHealthy = !isFailing && !isBacklogged && job.active;

  let statusBadge;
  if (!job.active) {
    statusBadge = <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Disabled</Badge>;
  } else if (isFailing) {
    statusBadge = <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Failing</Badge>;
  } else if (isBacklogged) {
    statusBadge = <Badge className="bg-amber-500 hover:bg-amber-500/90 text-white"><Clock className="h-3 w-3 mr-1" />Backlogged</Badge>;
  } else {
    statusBadge = <Badge className="bg-emerald-500 hover:bg-emerald-500/90 text-white"><CheckCircle2 className="h-3 w-3 mr-1" />Healthy</Badge>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              {job.jobname}
            </CardTitle>
            <CardDescription>
              Schedule: <code className="text-xs">{job.schedule}</code>
            </CardDescription>
          </div>
          {statusBadge}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat icon={<Clock className="h-4 w-4" />} label="Last Run" value={fmtRelative(job.last_run?.start_time ?? null)} sub={lastRunAt ? lastRunAt.toUTCString() : "—"} />
          <Stat icon={<CalendarClock className="h-4 w-4" />} label="Next Run" value={next ? fmtRelative(next.toISOString()) : "—"} sub={next ? next.toUTCString() : "—"} />
          <Stat icon={<Timer className="h-4 w-4" />} label="Last Duration" value={fmtDuration(job.last_run?.duration_ms ?? null)} sub={job.last_run?.status ?? "—"} />
          <Stat icon={<AlertTriangle className="h-4 w-4" />} label="Failures (24h)" value={`${job.failures_24h} / ${job.runs_24h}`} sub={job.currently_running > 0 ? `${job.currently_running} running now` : "no active runs"} />
        </div>

        {job.last_run?.return_message && (
          <div className="rounded-md border bg-muted/40 p-3 text-xs font-mono whitespace-pre-wrap break-words">
            {job.last_run.return_message}
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold mb-2">Recent Runs</h4>
          <div className="border rounded-md divide-y">
            {(job.recent_runs ?? []).slice(0, 10).map((r) => (
              <div key={r.runid} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {r.status === "succeeded" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  ) : r.status === "failed" ? (
                    <XCircle className="h-4 w-4 text-destructive shrink-0" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <span className="truncate">{r.start_time ? new Date(r.start_time).toLocaleString() : "—"}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground text-xs shrink-0">
                  <span>{fmtDuration(r.duration_ms)}</span>
                  <span className="capitalize">{r.status ?? "—"}</span>
                </div>
              </div>
            ))}
            {(!job.recent_runs || job.recent_runs.length === 0) && (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">No runs recorded yet.</div>
            )}
          </div>
        </div>

        {isHealthy && (
          <p className="text-xs text-muted-foreground">
            Auto-refreshes every 30 seconds.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}<span>{label}</span></div>
      <div className="text-lg font-semibold mt-1">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground truncate">{sub}</div>}
    </div>
  );
}
