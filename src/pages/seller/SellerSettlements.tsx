import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Loader2, IndianRupee, Wallet, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Settlement {
  id: string;
  amount: number;
  platform_fee: number;
  net_amount: number;
  status: string;
  settled_at: string | null;
  settlement_reference: string | null;
  created_at: string;
}

export default function SellerSettlements() {
  const navigate = useNavigate();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    pendingSettlement: 0,
    settledAmount: 0
  });

  useEffect(() => {
    loadSettlements();
  }, []);

  const loadSettlements = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('seller_settlements')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setSettlements(data || []);

      // Calculate stats
      const total = data?.reduce((sum, s) => sum + Number(s.net_amount), 0) || 0;
      const pending = data?.filter(s => s.status === 'pending').reduce((sum, s) => sum + Number(s.net_amount), 0) || 0;
      const settled = data?.filter(s => s.status === 'settled').reduce((sum, s) => sum + Number(s.net_amount), 0) || 0;

      setStats({
        totalEarnings: total,
        pendingSettlement: pending,
        settledAmount: settled
      });

    } catch (error) {
      console.error('Error loading settlements:', error);
      toast.error('Failed to load settlements');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      settled: 'bg-green-100 text-green-800'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Settlements</h1>
          <p className="text-sm text-muted-foreground">Your earnings & payouts</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card>
          <CardContent className="p-3 text-center">
            <Wallet className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-bold">₹{stats.totalEarnings.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Clock className="h-5 w-5 mx-auto text-yellow-600 mb-1" />
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="font-bold">₹{stats.pendingSettlement.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-green-600 mb-1" />
            <p className="text-xs text-muted-foreground">Settled</p>
            <p className="font-bold">₹{stats.settledAmount.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="mb-4 bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <h3 className="font-medium mb-1">Settlement Info</h3>
          <p className="text-sm text-muted-foreground">
            Settlements are processed every Monday. Minimum payout is ₹500. 
            Ensure your UPI ID is updated in seller settings.
          </p>
        </CardContent>
      </Card>

      {/* Settlements List */}
      <h2 className="font-semibold mb-3">Settlement History</h2>
      
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : settlements.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <IndianRupee className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No settlements yet</p>
            <p className="text-sm text-muted-foreground">Start receiving orders to earn!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {settlements.map((settlement) => (
            <Card key={settlement.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg">₹{settlement.net_amount.toLocaleString('en-IN')}</span>
                      {getStatusBadge(settlement.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(settlement.created_at).toLocaleDateString()}
                    </p>
                    {settlement.platform_fee > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Platform fee: ₹{settlement.platform_fee}
                      </p>
                    )}
                  </div>
                  {settlement.settlement_reference && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Ref</p>
                      <p className="text-xs font-mono">{settlement.settlement_reference}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
