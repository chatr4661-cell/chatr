import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface Row {
  user_id: string;
  total_coins: number;
  display_name: string | null;
}

export function EarnLeaderboard() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('chatr_coin_balances')
        .select('user_id, total_coins')
        .order('total_coins', { ascending: false })
        .limit(5);

      if (!mounted || !data) {
        if (mounted) setLoading(false);
        return;
      }

      const ids = data.map((d: any) => d.user_id);
      const { data: profiles } = await (supabase as any)
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', ids);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name]));
      setRows(
        data.map((d: any) => ({
          user_id: d.user_id,
          total_coins: d.total_coins,
          display_name: profileMap.get(d.user_id) ?? null,
        }))
      );
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            Top Earners
          </span>
          <Link to="/leaderboard" className="text-xs font-normal text-primary hover:underline">
            View all →
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)
        ) : rows.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">Be the first on the board!</p>
        ) : (
          rows.map((row, i) => (
            <div key={row.user_id} className="flex items-center justify-between gap-2 rounded-md border p-2">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant={i < 3 ? 'default' : 'outline'} className="h-5 w-5 justify-center p-0 text-[10px]">
                  {i + 1}
                </Badge>
                <span className="truncate text-sm">{row.display_name || `User ${row.user_id.slice(0, 6)}`}</span>
              </div>
              <span className="text-sm font-semibold tabular-nums">{row.total_coins.toLocaleString()}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
