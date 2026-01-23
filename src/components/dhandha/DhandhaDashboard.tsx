import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { IndianRupee, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { formatAmount } from '@/utils/upiGenerator';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  voice_input: string | null;
}

interface DhandhaDashboardProps {
  merchantId: string;
  refreshTrigger: number;
}

export const DhandhaDashboard = ({ merchantId, refreshTrigger }: DhandhaDashboardProps) => {
  const [todayTotal, setTodayTotal] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      // Get today's start
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch today's transactions
      const { data, error } = await supabase
        .from('dhandha_transactions')
        .select('*')
        .eq('merchant_id', merchantId)
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTransactions(data);
        
        // Calculate today's total (only paid transactions)
        const total = data
          .filter(t => t.status === 'paid')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        setTodayTotal(total);
      }

      setIsLoading(false);
    };

    fetchData();
  }, [merchantId, refreshTrigger]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Today's Total Card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Today's Total</p>
              <p className="text-3xl font-bold">{formatAmount(todayTotal)}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {transactions.length} bills created today
          </p>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <IndianRupee className="w-5 h-5" />
            Recent Bills
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-center text-muted-foreground">
              Loading...
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No bills yet today.<br />
              Use voice to create your first bill!
            </div>
          ) : (
            <div className="divide-y">
              {transactions.slice(0, 5).map((transaction) => (
                <div 
                  key={transaction.id}
                  className="flex items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(transaction.status)}
                    <div>
                      <p className="font-medium">
                        {formatAmount(Number(transaction.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(transaction.created_at), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    transaction.status === 'paid' 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {transaction.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
