import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Wallet, Plus, TrendingUp, TrendingDown, Gift, 
  ArrowRight, Coins, ShoppingBag, Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { MedicineBottomNav } from '@/components/care/MedicineBottomNav';
import { MedicineHeroHeader } from '@/components/care/MedicineHeroHeader';

interface Transaction {
  id: string;
  amount: number;
  transaction_type: string;
  description: string;
  reference_type: string | null;
  created_at: string;
}

interface WalletData {
  balance: number;
  total_earned: number;
  total_spent: number;
}

const MedicineWallet = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get wallet
      const { data: walletData } = await supabase
        .from('health_wallet')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletData) {
        setWallet({
          balance: walletData.balance || 0,
          total_earned: walletData.total_earned || 0,
          total_spent: walletData.total_spent || 0
        });
      }

      // Get transactions
      const { data: txData } = await supabase
        .from('health_wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (txData) {
        setTransactions(txData);
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = activeTab === 'all' 
    ? transactions 
    : transactions.filter(t => t.transaction_type === activeTab);

  const getTransactionIcon = (type: string, refType: string | null) => {
    if (refType === 'streak_reward') return Award;
    if (refType === 'order_discount') return ShoppingBag;
    if (refType === 'referral') return Gift;
    if (type === 'credit') return TrendingUp;
    return TrendingDown;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background pb-24">
      <MedicineHeroHeader
        title="Health Wallet"
        subtitle="Earn & save on medicines"
        gradient="wallet"
      >
        {/* Balance Card */}
        <Card className="bg-white/15 backdrop-blur-xl border-white/20 shadow-2xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-white/80">Available Balance</p>
                <motion.p 
                  className="text-4xl font-bold text-white"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, type: "spring" }}
                >
                  ₹{wallet?.balance?.toFixed(0) || 0}
                </motion.p>
              </div>
              <motion.div 
                className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Wallet className="h-7 w-7 text-white" />
              </motion.div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-300" />
                  <span className="text-xs text-white/80">Earned</span>
                </div>
                <p className="text-lg font-bold text-white mt-1">
                  ₹{wallet?.total_earned?.toFixed(0) || 0}
                </p>
              </div>
              <div className="bg-white/10 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-amber-300" />
                  <span className="text-xs text-white/80">Used</span>
                </div>
                <p className="text-lg font-bold text-white mt-1">
                  ₹{wallet?.total_spent?.toFixed(0) || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </MedicineHeroHeader>

      <div className="p-4 space-y-5 -mt-2">
        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Gift, label: 'Refer & Earn', desc: '₹100', color: 'from-pink-500 to-rose-500' },
            { icon: Award, label: 'Daily Streak', desc: '₹5/day', color: 'from-amber-500 to-orange-500' },
            { icon: ShoppingBag, label: 'Use Balance', desc: 'On orders', color: 'from-green-500 to-emerald-500' }
          ].map((action, idx) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Card className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-3 text-center">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mx-auto mb-2`}>
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-xs font-semibold">{action.label}</p>
                  <p className="text-[10px] text-muted-foreground">{action.desc}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* How to Earn */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-violet-500 to-purple-500 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold">Earn More Health Coins</h3>
                <p className="text-sm text-white/80">Complete actions to earn rewards</p>
              </div>
              <Coins className="h-8 w-8 text-white/50" />
            </div>
          </div>
          <CardContent className="p-0">
            {[
              { action: 'Take medicine on time', reward: '+₹5', completed: true },
              { action: 'Log vitals daily', reward: '+₹3', completed: false },
              { action: 'Complete 7-day streak', reward: '+₹50', completed: false },
              { action: 'Refer a friend', reward: '+₹100', completed: false }
            ].map((item, idx) => (
              <div 
                key={item.action}
                className={`flex items-center justify-between p-4 ${idx !== 3 ? 'border-b' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    item.completed ? 'bg-green-100' : 'bg-muted'
                  }`}>
                    {item.completed ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <Coins className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-sm">{item.action}</span>
                </div>
                <Badge className={item.completed ? 'bg-green-100 text-green-700' : 'bg-violet-100 text-violet-700'}>
                  {item.reward}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Transactions */}
        <div>
          <h2 className="text-lg font-bold mb-3">Transaction History</h2>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full h-10 p-1 bg-muted/50 rounded-xl mb-4">
              <TabsTrigger value="all" className="flex-1 text-xs rounded-lg">All</TabsTrigger>
              <TabsTrigger value="credit" className="flex-1 text-xs rounded-lg">Earned</TabsTrigger>
              <TabsTrigger value="debit" className="flex-1 text-xs rounded-lg">Used</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wallet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No transactions yet</p>
                </div>
              ) : (
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-0">
                    {filteredTransactions.map((tx, idx) => {
                      const Icon = getTransactionIcon(tx.transaction_type, tx.reference_type);
                      return (
                        <motion.div
                          key={tx.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className={`flex items-center justify-between p-4 ${
                            idx !== filteredTransactions.length - 1 ? 'border-b' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              tx.transaction_type === 'credit' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                              <Icon className={`h-5 w-5 ${
                                tx.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                              }`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{tx.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(tx.created_at), 'dd MMM yyyy, h:mm a')}
                              </p>
                            </div>
                          </div>
                          <span className={`font-bold ${
                            tx.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {tx.transaction_type === 'credit' ? '+' : '-'}₹{tx.amount}
                          </span>
                        </motion.div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <MedicineBottomNav />
    </div>
  );
};

export default MedicineWallet;
