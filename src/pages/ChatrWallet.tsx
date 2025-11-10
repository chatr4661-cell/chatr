import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Wallet, 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownLeft,
  TrendingUp,
  Gift,
  Plus,
  History
} from 'lucide-react';

interface WalletData {
  balance: number;
  cashback_balance: number;
  total_spent: number;
  total_earned: number;
  referral_earnings: number;
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  created_at: string;
  status: string;
}

const ChatrWallet = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [addAmount, setAddAmount] = useState('');

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get or create wallet
      let { data: walletData, error: walletError } = await supabase
        .from('chatr_wallet')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletError && walletError.code === 'PGRST116') {
        // Create wallet if doesn't exist
        const { data: newWallet } = await supabase
          .from('chatr_wallet')
          .insert({ user_id: user.id })
          .select()
          .single();
        walletData = newWallet;
      }

      setWallet(walletData);

      // Load transactions
      const { data: txData } = await supabase
        .from('chatr_wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setTransactions(txData || []);
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMoney = async () => {
    const amount = parseFloat(addAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // In production, integrate with Razorpay/UPI here
      const { data, error } = await supabase.rpc('process_wallet_transaction', {
        p_user_id: user.id,
        p_type: 'credit',
        p_amount: amount,
        p_description: 'Added money to wallet'
      });

      if (error) throw error;

      toast.success(`₹${amount} added to wallet!`);
      setAddAmount('');
      loadWalletData();
    } catch (error) {
      console.error('Add money error:', error);
      toast.error('Failed to add money');
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'credit':
      case 'cashback':
      case 'referral':
      case 'refund':
        return <ArrowDownLeft className="w-5 h-5 text-green-500" />;
      case 'debit':
        return <ArrowUpRight className="w-5 h-5 text-red-500" />;
      default:
        return <History className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-green-500/5">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">ChatrPay Wallet</h1>
            <p className="text-xs text-muted-foreground">Your digital wallet</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Balance Card */}
        <Card className="p-6 mb-6 bg-gradient-to-br from-primary/10 to-green-500/10 border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/30 to-green-500/30 rounded-full blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2 text-muted-foreground">
              <Wallet className="w-5 h-5" />
              <span className="text-sm">Available Balance</span>
            </div>
            <div className="text-5xl font-bold mb-4">₹{wallet?.balance.toFixed(2) || '0.00'}</div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Cashback</p>
                <p className="font-semibold text-lg text-green-600">₹{wallet?.cashback_balance.toFixed(2) || '0'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Referral Earnings</p>
                <p className="font-semibold text-lg text-purple-600">₹{wallet?.referral_earnings.toFixed(2) || '0'}</p>
              </div>
            </div>

            {/* Add Money Section */}
            <div className="flex gap-2">
              <Input
                type="number"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                placeholder="Enter amount"
                className="flex-1"
              />
              <Button onClick={handleAddMoney} className="bg-primary">
                <Plus className="w-4 h-4 mr-2" />
                Add Money
              </Button>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Total Earned</span>
            </div>
            <p className="text-2xl font-bold text-green-600">₹{wallet?.total_earned.toFixed(2) || '0'}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Gift className="w-4 h-4" />
              <span className="text-xs">Total Spent</span>
            </div>
            <p className="text-2xl font-bold text-primary">₹{wallet?.total_spent.toFixed(2) || '0'}</p>
          </Card>
        </div>

        {/* Transactions */}
        <div>
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <History className="w-5 h-5" />
            Recent Transactions
          </h3>
          {transactions.length === 0 ? (
            <Card className="p-8 text-center">
              <History className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No transactions yet</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <Card key={tx.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getTransactionIcon(tx.type)}
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(tx.created_at).toLocaleDateString()} • 
                          {new Date(tx.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        ['credit', 'cashback', 'referral', 'refund'].includes(tx.type) 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}>
                        {['credit', 'cashback', 'referral', 'refund'].includes(tx.type) ? '+' : '-'}
                        ₹{tx.amount.toFixed(2)}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {tx.type}
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatrWallet;