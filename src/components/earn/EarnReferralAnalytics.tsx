import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, IndianRupee, TrendingUp, Activity } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface NetworkRow {
  user_id: string;
  level: number;
  display_name: string | null;
  joined_at: string;
}

interface LevelStats {
  level: number;
  invites: number;
  coins: number;
}

const LEVEL_COIN_RATE: Record<number, number> = { 1: 500, 2: 150, 3: 75, 4: 25 };
const COIN_TO_RUPEE = 0.1; // 10 coins = ₹1 (matches GROWTH_SYSTEM_COMPLETE.md)

export function EarnReferralAnalytics() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [directInvites, setDirectInvites] = useState<NetworkRow[]>([]);
  const [networkRows, setNetworkRows] = useState<NetworkRow[]>([]);
  const [referralCoins, setReferralCoins] = useState(0);

  // Initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (!mounted) return;
      setUserId(uid);
      if (!uid) { setLoading(false); return; }
      await loadAll(uid, mounted, {
        setDirectInvites,
        setNetworkRows,
        setReferralCoins,
        setLoading,
      });
    })();
    return () => { mounted = false; };
  }, []);

  // Realtime: refresh whenever a referral or coin txn lands for this user
  useEffect(() => {
    if (!userId) return;
    const refresh = () => loadAll(userId, true, {
      setDirectInvites,
      setNetworkRows,
      setReferralCoins,
      setLoading: () => {},
    });

    const ch = supabase
      .channel(`earn-analytics-${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'chatr_referrals', filter: `referrer_id=eq.${userId}` },
        refresh)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'chatr_referral_network', filter: `root_user_id=eq.${userId}` },
        refresh)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chatr_coin_transactions', filter: `user_id=eq.${userId}` },
        refresh)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  const stats = useMemo<LevelStats[]>(() => {
    const map = new Map<number, LevelStats>();
    [1, 2, 3, 4].forEach(l => map.set(l, { level: l, invites: 0, coins: 0 }));
    networkRows.forEach(r => {
      const s = map.get(r.level);
      if (s) {
        s.invites += 1;
        s.coins += LEVEL_COIN_RATE[r.level] || 0;
      }
    });
    return Array.from(map.values());
  }, [networkRows]);

  const totalInvites = networkRows.length;
  const directSignups = directInvites.length;
  const estimatedRupees = (referralCoins || stats.reduce((s, x) => s + x.coins, 0)) * COIN_TO_RUPEE;

  if (!userId) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Referral Analytics
          </span>
          <Badge variant="secondary" className="text-[10px] gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Top stat row */}
        {loading ? (
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <Stat icon={Users} label="Direct" value={directSignups.toString()} tone="primary" />
            <Stat icon={TrendingUp} label="Network" value={totalInvites.toString()} tone="emerald" />
            <Stat icon={IndianRupee} label="Earned" value={`₹${estimatedRupees.toFixed(0)}`} tone="amber" />
          </div>
        )}

        {/* Per-level breakdown */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Per-Level Earnings
          </div>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)
          ) : (
            stats.map(s => {
              const max = Math.max(...stats.map(x => x.invites), 1);
              const pct = (s.invites / max) * 100;
              return (
                <div key={s.level} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <Badge variant="outline" className="h-4 px-1 text-[10px]">L{s.level}</Badge>
                      <span className="text-muted-foreground">{s.invites} invite{s.invites === 1 ? '' : 's'}</span>
                    </span>
                    <span className="font-semibold tabular-nums">{s.coins.toLocaleString()} coins</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-emerald-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Recent invites */}
        {!loading && directInvites.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Recent Invites
            </div>
            <div className="space-y-1">
              {directInvites.slice(0, 4).map(inv => (
                <div key={inv.user_id} className="flex items-center justify-between rounded-md border bg-card px-2 py-1.5 text-xs">
                  <span className="truncate font-medium">{inv.display_name || 'New friend'}</span>
                  <Badge variant="outline" className="text-[10px]">+₹50</Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && totalInvites === 0 && (
          <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
            Share your code to see live invites and earnings here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ icon: Icon, label, value, tone }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: 'primary' | 'emerald' | 'amber';
}) {
  const toneClass =
    tone === 'emerald' ? 'text-emerald-600 bg-emerald-500/10'
    : tone === 'amber' ? 'text-amber-600 bg-amber-500/10'
    : 'text-primary bg-primary/10';
  return (
    <div className="rounded-lg border p-2">
      <div className={`mb-1 inline-flex h-5 w-5 items-center justify-center rounded ${toneClass}`}>
        <Icon className="h-3 w-3" />
      </div>
      <div className="text-base font-semibold leading-none tabular-nums">{value}</div>
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

interface Setters {
  setDirectInvites: (rows: NetworkRow[]) => void;
  setNetworkRows: (rows: NetworkRow[]) => void;
  setReferralCoins: (n: number) => void;
  setLoading: (b: boolean) => void;
}

async function loadAll(uid: string, mounted: boolean, s: Setters) {
  // 1. Multi-level network rows
  const { data: net } = await (supabase as any)
    .from('chatr_referral_network')
    .select('user_id, level, created_at')
    .eq('root_user_id', uid)
    .order('created_at', { ascending: false });

  // 2. Direct invites (level 1) for the "Recent Invites" feed
  const { data: direct } = await (supabase as any)
    .from('chatr_referrals')
    .select('referred_user_id, activated_at, created_at')
    .eq('referrer_id', uid)
    .order('created_at', { ascending: false })
    .limit(20);

  // 3. Referral coin earnings (sum of incoming referral txns)
  const { data: coinTxns } = await (supabase as any)
    .from('chatr_coin_transactions')
    .select('amount, source')
    .eq('user_id', uid)
    .in('source', ['referral_signup', 'network_referral']);

  const totalRefCoins = (coinTxns || []).reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

  // 4. Look up display names for everyone shown
  const ids = Array.from(new Set([
    ...(net || []).map((n: any) => n.user_id as string),
    ...(direct || []).map((d: any) => d.referred_user_id as string),
  ]));
  let nameMap = new Map<string, string | null>();
  if (ids.length) {
    const { data: profiles } = await (supabase as any)
      .from('profiles')
      .select('id, username, full_name')
      .in('id', ids);
    nameMap = new Map(
      (profiles || []).map((p: any) => [
        p.id as string,
        (p.username as string | null) || (p.full_name as string | null) || null,
      ])
    );
  }

  if (!mounted) return;

  s.setDirectInvites(
    (direct || []).map((d: any): NetworkRow => ({
      user_id: d.referred_user_id,
      level: 1,
      display_name: nameMap.get(d.referred_user_id) ?? null,
      joined_at: d.activated_at || d.created_at,
    }))
  );
  s.setNetworkRows(
    (net || []).map((n: any): NetworkRow => ({
      user_id: n.user_id,
      level: n.level,
      display_name: nameMap.get(n.user_id) ?? null,
      joined_at: n.created_at,
    }))
  );
  s.setReferralCoins(totalRefCoins);
  s.setLoading(false);
}
