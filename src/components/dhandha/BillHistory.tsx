import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Share2, CheckCircle, Clock } from 'lucide-react';
import { formatAmount } from '@/utils/upiGenerator';
import { format } from 'date-fns';

interface Bill {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
  voice_input: string | null;
  upi_link: string;
  customer_id: string | null;
  customer?: { name: string } | null;
}

export const BillHistory = ({ merchantId }: { merchantId: string }) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [merchantId, filter]);

  useEffect(() => {
    const ch = supabase.channel(`dhandha-history-${merchantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'dhandha_transactions', filter: `merchant_id=eq.${merchantId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [merchantId]);

  const load = async () => {
    let q = supabase.from('dhandha_transactions')
      .select('*, customer:dhandha_customers(name)')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false })
      .limit(200);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setBills((data ?? []) as any);
    setLoading(false);
  };

  const markPaid = async (id: string) => {
    await supabase.from('dhandha_transactions').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id);
  };

  const reshare = async (b: Bill) => {
    const text = `Payment request: ${formatAmount(Number(b.amount))}\nUPI: ${b.upi_link}`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Payment', text, url: b.upi_link }); } catch {}
    } else {
      await navigator.clipboard.writeText(text);
    }
  };

  const exportCsv = () => {
    const rows = [['Date', 'Amount', 'Status', 'Customer', 'Voice Input']];
    bills.forEach(b => rows.push([
      format(new Date(b.created_at), 'yyyy-MM-dd HH:mm'),
      String(b.amount),
      b.status,
      b.customer?.name ?? '',
      (b.voice_input ?? '').replace(/[,\n]/g, ' '),
    ]));
    const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `dhandha-bills-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {(['all', 'pending', 'paid'] as const).map(f => (
          <Badge
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            className="cursor-pointer capitalize"
            onClick={() => setFilter(f)}
          >{f}</Badge>
        ))}
        <Button size="sm" variant="ghost" className="ml-auto" onClick={exportCsv} disabled={!bills.length}>
          <Download className="w-3.5 h-3.5 mr-1" />CSV
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
      ) : bills.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No bills found.</CardContent></Card>
      ) : (
        <div className="space-y-1.5">
          {bills.map(b => (
            <Card key={b.id}>
              <CardContent className="p-3 flex items-center gap-3">
                {b.status === 'paid'
                  ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  : <Clock className="w-4 h-4 text-amber-500 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{formatAmount(Number(b.amount))}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(b.created_at), 'd MMM, h:mm a')}
                    {b.customer?.name && ` · ${b.customer.name}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {b.status !== 'paid' && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => reshare(b)}>
                        <Share2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => markPaid(b.id)}>Mark paid</Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
