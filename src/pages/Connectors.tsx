import { useMemo, useState } from 'react';
import { ArrowLeft, Check, Loader2, Plug, RefreshCw, ShieldCheck, Unplug } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  PermissionManager,
  certifyConnector,
  maturityOf,
  MATURITY_BLURB,
  MATURITY_LABEL,
  type CapabilityGroup,
} from '@/connectors';

import { CAPABILITY_GROUPS, useConnectors } from '@/hooks/useConnectors';
import { describeConnector, isConfigurationError } from '@/components/connectors/connectorStatus';


export default function Connectors() {
  const navigate = useNavigate();
  const { definitions, counts, byConnector, busyId, callbackResult, connect, disconnect, sync, health } =
    useConnectors();
  const [group, setGroup] = useState<CapabilityGroup | 'all'>('all');
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return definitions.filter((d) => {
      const inGroup = group === 'all' || d.groups.includes(group);
      const matches =
        !q ||
        d.name.toLowerCase().includes(q) ||
        d.summary.toLowerCase().includes(q) ||
        d.capabilities.some((c) => PermissionManager.describe(c).toLowerCase().includes(q));
      return inGroup && matches;
    });
  }, [definitions, group, query]);

  const connectedCount = byConnector.size;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">Integrations</h1>
            <p className="truncate text-xs text-muted-foreground">
              {connectedCount} connected · {counts.available} available · {counts.coming_soon} coming soon
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 pb-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to do? e.g. read email, see files"
            className="h-10 rounded-xl bg-muted/50"
          />
        </div>

        <ScrollArea className="w-full">
          <div className="mx-auto flex max-w-3xl gap-2 px-4 pb-3">
            <GroupChip active={group === 'all'} onClick={() => setGroup('all')} label="All" />
            {CAPABILITY_GROUPS.map((g) => (
              <GroupChip key={g.id} active={group === g.id} onClick={() => setGroup(g.id)} label={g.label} />
            ))}
          </div>
        </ScrollArea>
      </header>

      <main className="mx-auto max-w-3xl space-y-3 px-4 py-4">
        {callbackResult && (
          <Card
            className={`flex items-center gap-2 rounded-xl p-3 text-sm ${
              callbackResult.ok ? 'border-primary/40 text-foreground' : 'border-destructive/40 text-destructive'
            }`}
          >
            {callbackResult.ok ? <Check className="h-4 w-4" /> : <Unplug className="h-4 w-4" />}
            <span>
              {callbackResult.ok
                ? `${callbackResult.connectorId ?? 'Account'} connected.`
                : callbackResult.error ?? 'Connection was cancelled.'}
            </span>
          </Card>
        )}

        {group !== 'all' && (
          <p className="px-1 text-xs text-muted-foreground">
            {CAPABILITY_GROUPS.find((g) => g.id === group)?.blurb}
          </p>
        )}

        {visible.map((definition) => {
          const connection = byConnector.get(definition.id);
          const busy = busyId === definition.id;
          const comingSoon = definition.availability !== 'available';
          const status = describeConnector(connection, { busy });
          const needsReconnect = status.state === 'action_required' || status.state === 'failed';


          return (
            <Card key={definition.id} className="rounded-2xl border-border/60 p-4">
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-primary-foreground"
                  style={{ backgroundColor: definition.brandColor ?? 'hsl(var(--primary))' }}
                >
                  {definition.name.slice(0, 1)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-sm font-semibold">{definition.name}</h2>
                    <Badge
                      variant={maturityOf(definition) === 'production' ? 'default' : 'secondary'}
                      className="h-5 text-[10px]"
                      title={MATURITY_BLURB[maturityOf(definition)]}
                    >
                      {MATURITY_LABEL[maturityOf(definition)]}
                    </Badge>
                    {comingSoon && (
                      <Badge variant="secondary" className="h-5 text-[10px]">
                        {definition.availability === 'community' ? 'Community' : 'Coming soon'}
                      </Badge>
                    )}
                    {connection && status.state === 'connected' && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="h-3 w-3" /> Healthy
                      </span>
                    )}

                    {(() => {
                      const report = certifyConnector(definition);
                      return report.passed ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground"
                          title="Passes the connector certification contract"
                        >
                          <ShieldCheck className="h-3 w-3" /> Certified
                        </span>
                      ) : null;
                    })()}
                  </div>

                  <p className="mt-0.5 text-xs text-muted-foreground">{definition.summary}</p>

                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {definition.capabilities.map((capability) => (
                      <li
                        key={capability}
                        className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {PermissionManager.describe(capability)}
                      </li>
                    ))}
                  </ul>

                  {/* Health strip — only what a customer can act on. */}
                  {connection && (
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-muted/40 px-2.5 py-1.5 text-[11px]">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} />
                        {status.label}
                      </span>
                      <span className="text-muted-foreground">{status.hint}</span>
                      <span className="text-muted-foreground">
                        {definition.capabilities.length} capabilit
                        {definition.capabilities.length === 1 ? 'y' : 'ies'}
                      </span>
                    </div>
                  )}

                  


                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {connection ? (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 rounded-lg"
                          disabled={busy}
                          onClick={() => sync(connection)}
                        >
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                          <span className="ml-1.5 text-xs">Sync now</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-lg text-destructive"
                          disabled={busy}
                          onClick={() => disconnect(connection)}
                        >
                          <Unplug className="h-4 w-4" />
                          <span className="ml-1.5 text-xs">Disconnect</span>
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className="h-8 rounded-lg"
                        disabled={busy || comingSoon}
                        onClick={() => connect(definition.id)}
                      >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                        <span className="ml-1.5 text-xs">{comingSoon ? 'Not yet available' : 'Connect'}</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}

        {visible.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Nothing matches that yet.</p>
        )}

        <div className="flex items-start gap-2 rounded-xl bg-muted/40 p-3 text-[11px] text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Access tokens are stored server-side in the credential vault and never reach this device. We request the
            smallest set of permissions each capability needs, and you can disconnect at any time.
          </span>
        </div>
      </main>
    </div>
  );
}

function GroupChip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}
    >
      {label}
    </button>
  );
}
