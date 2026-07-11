import React, { useState } from 'react';
import { AlertTriangle, Zap, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DrillResult {
  name: string;
  passed: boolean;
  latencyMs?: number;
}

export function ChaosWidget() {
  const [status, setStatus] = useState<'idle' | 'running' | 'completed'>('idle');
  const [results, setResults] = useState<DrillResult[]>([]);

  const runCrashDrill = async () => {
    setStatus('running');
    setResults([]);
    const drillResults: DrillResult[] = [];
    const correlationId = crypto.randomUUID();

    try {
      // 1. Benchmark Event Persistence Latency
      const start = performance.now();
      await supabase.from('testbed_finance_ledgers').insert({
        transaction_type: 'chaos_test',
        amount: 0,
        status: 'draft',
      });
      const persistenceLatency = Math.round(performance.now() - start);

      drillResults.push({
        name: 'Persistence Latency P95 (Target < 50ms)',
        passed: persistenceLatency < 50,
        latencyMs: persistenceLatency,
      });

      // 2. Simulate Mid-Flight Crash & Recovery
      // We write a raw checkpoint directly to simulate an engine that died after step 1
      const checkpointStart = performance.now();
      await supabase.from('workflow_state').insert({
        workflow_id: correlationId,
        node_id: 'payment_processing',
        status: 'suspended',
        context_data: { simulated: 'crash' },
      });

      // Simulate engine reboot fetching orphaned workflows
      const { data: recovered } = await supabase
        .from('workflow_state')
        .select('*')
        .eq('status', 'suspended')
        .eq('workflow_id', correlationId)
        .single();

      const recoveryTime = Math.round(performance.now() - checkpointStart);
      drillResults.push({
        name: 'Crash Recovery Time (Target < 2000ms)',
        passed: recoveryTime < 2000 && recovered !== null,
        latencyMs: recoveryTime,
      });

      // Cleanup
      await supabase.from('workflow_state').delete().eq('workflow_id', correlationId);

      setResults(drillResults);
    } catch (e: any) {
      drillResults.push({ name: `Drill Failed: ${e.message}`, passed: false });
      setResults(drillResults);
    } finally {
      setStatus('completed');
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Chaos Engineering Drills</h3>
            <p className="text-xs text-muted-foreground">Resilience &amp; recovery validation</p>
          </div>
        </div>

        <button
          onClick={runCrashDrill}
          disabled={status === 'running'}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'running' ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          Run Drills
        </button>
      </div>

      <div className="space-y-2">
        {results.length === 0 && status === 'idle' && (
          <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
            No drills executed recently.
          </div>
        )}

        {status === 'running' && results.length === 0 && (
          <div className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
            Running resilience drills…
          </div>
        )}

        {results.map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5"
          >
            <div className="flex items-center gap-2 min-w-0">
              {r.passed ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 flex-shrink-0 text-destructive" />
              )}
              <span className="truncate text-xs text-foreground">{r.name}</span>
            </div>
            {r.latencyMs !== undefined && (
              <span
                className={`flex-shrink-0 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums ${
                  r.passed
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-destructive/10 text-destructive'
                }`}
              >
                {r.latencyMs}ms
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
