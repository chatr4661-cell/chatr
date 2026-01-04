import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, Plus, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  created_at: string;
}

export const HealthWalletCard = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get wallet balance
      const { data: wallet } = await supabase
        .from('health_wallet')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      if (wallet) {
        setBalance(wallet.balance || 0);
      }

      // Get recent transactions
      const { data: transactions } = await supabase
        .from('health_wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (transactions) {
        setRecentTransactions(transactions);
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-8 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="border-0 shadow-xl overflow-hidden">
        {/* Gradient Header */}
        <div className="relative bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 p-5 text-white">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div 
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: '20px 20px'
              }}
            />
          </div>

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <motion.div 
                  className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Wallet className="h-6 w-6" />
                </motion.div>
                <div>
                  <p className="text-sm text-white/80">Health Wallet</p>
                  <motion.p 
                    className="text-3xl font-bold"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                  >
                    ₹{balance.toFixed(0)}
                  </motion.p>
                </div>
              </div>
              <Button 
                size="sm" 
                className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                onClick={() => navigate('/care/medicines/wallet')}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Coin Balance */}
            <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
              <motion.span 
                className="text-xl"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                🪙
              </motion.span>
              <span className="text-sm text-white/80">Health Coins worth</span>
              <span className="font-bold">₹{Math.floor(balance * 0.1)}</span>
              <Badge className="bg-white/20 text-white border-0 text-xs ml-auto">
                <Sparkles className="h-3 w-3 mr-1" />
                Earn more
              </Badge>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        {recentTransactions.length > 0 && (
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Recent Activity</p>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs gap-1 h-7"
                onClick={() => navigate('/care/medicines/wallet')}
              >
                View All
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-2">
              {recentTransactions.map((tx, idx) => (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      tx.transaction_type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {tx.transaction_type === 'credit' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium line-clamp-1">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className={`font-semibold ${
                    tx.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tx.transaction_type === 'credit' ? '+' : '-'}₹{tx.amount}
                  </span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
};
