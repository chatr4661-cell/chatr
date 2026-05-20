import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Plus, Phone, User, Trash2, MessageSquare } from 'lucide-react';
import { formatAmount } from '@/utils/upiGenerator';

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  outstanding_balance: number;
  total_billed: number;
  total_paid: number;
  notes: string | null;
}

export const CustomerLedger = ({ merchantId, upiId, businessName }: { merchantId: string; upiId: string; businessName: string }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', notes: '' });

  useEffect(() => { load(); }, [merchantId]);

  const load = async () => {
    const { data } = await supabase
      .from('dhandha_customers' as any)
      .select('*')
      .eq('merchant_id', merchantId)
      .order('outstanding_balance', { ascending: false })
      .order('created_at', { ascending: false }) as any;
    setCustomers((data ?? []) as any);
    setLoading(false);
  };

  const addCustomer = async () => {
    if (!form.name.trim()) return;
    await supabase.from('dhandha_customers' as any).insert({
      merchant_id: merchantId, name: form.name.trim(), phone: form.phone.trim() || null, notes: form.notes.trim() || null,
    } as any);
    setForm({ name: '', phone: '', notes: '' });
    setOpenAdd(false);
    load();
  };

  const removeCustomer = async (id: string) => {
    await supabase.from('dhandha_customers' as any).delete().eq('id', id);
    setCustomers(customers.filter(c => c.id !== id));
  };

  const remind = async (c: Customer) => {
    if (!c.phone || c.outstanding_balance <= 0) return;
    const msg = `Namaste ${c.name}, aapka ${businessName} par ${formatAmount(c.outstanding_balance)} ka outstanding hai. Kripya UPI ${upiId} par payment karein. Dhanyavaad.`;
    const url = `https://wa.me/${c.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const totalOutstanding = customers.reduce((s, c) => s + Number(c.outstanding_balance ?? 0), 0);

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Outstanding</p>
            <p className="text-2xl font-bold text-amber-600">{formatAmount(totalOutstanding)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{customers.length} customers</p>
          </div>
          <Dialog open={openAdd} onOpenChange={setOpenAdd}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" />Add</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Customer</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="Phone (with country code)" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                <Input placeholder="Notes (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
              <DialogFooter>
                <Button onClick={addCustomer} disabled={!form.name.trim()}>Save</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
      ) : customers.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          No customers yet. Add one to track outstanding balance (khaata).
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {customers.map(c => (
            <Card key={c.id}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{c.name}</p>
                    {c.outstanding_balance > 0 && <Badge variant="destructive" className="text-[10px]">Due</Badge>}
                  </div>
                  {c.phone && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{c.phone}</p>}
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${c.outstanding_balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {formatAmount(Number(c.outstanding_balance ?? 0))}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Billed {formatAmount(Number(c.total_billed ?? 0))}</p>
                </div>
                <div className="flex flex-col gap-1">
                  {c.phone && c.outstanding_balance > 0 && (
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remind(c)} title="Send reminder">
                      <MessageSquare className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeCustomer(c.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
