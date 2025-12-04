import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import walletIcon from '@/assets/chatrpay-wallet-icon.png';
import { UPIPaymentModal } from '@/components/payment/UPIPaymentModal';
import { SEOHead } from '@/components/SEOHead';
import { Breadcrumbs, CrossModuleNav } from '@/components/navigation';
import { ShareDeepLink } from '@/components/sharing';
import { 
  Wallet, 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownLeft,
  TrendingUp,
  Gift,
  Plus,
  History,
  Percent,
  Zap,
  Shield,
  Star
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

const TOPUP_OPTIONS = [
  { amount: 100, bonus: 0, label: '₹100' },
  { amount: 500, bonus: 25, label: '₹500', tag: '+₹25 Bonus' },
  { amount: 1000, bonus: 75, label: '₹1,000', tag: '+₹75 Bonus' },
  { amount: 2000, bonus: 200, label: '₹2,000', tag: '+₹200 Bonus' },
  { amount: 5000, bonus: 750, label: '₹5,000', tag: '+₹750 Bonus', popular: true },
];

const ChatrWallet = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [addAmount, setAddAmount] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [selectedTopup, setSelectedTopup] = useState<number>(0);

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

  const handleTopupSelect = (amount: number) => {
    setSelectedTopup(amount);
    setShowAddDialog(false);
    setTimeout(() => setShowUPIModal(true), 100);
  };

  const handleCustomTopup = () => {
    const amount = parseFloat(addAmount);
    if (!amount || amount < 10) {
      toast.error('Minimum amount is ₹10');
      return;
    }
    handleTopupSelect(amount);
  };

  const handlePaymentSubmitted = async (paymentId: string) => {
    toast.success('Top-up submitted! Will be credited after verification.');
    setShowUPIModal(false);
    setSelectedTopup(0);
    setAddAmount('');
    loadWalletData();
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
    <>
      <SEOHead
        title="ChatrPay Wallet - Digital Wallet | Chatr+"
        description="Manage your ChatrPay wallet. Add money, track cashback, view transactions, and enjoy up to 15% top-up bonuses. Secure digital payments for all Chatr services."
        ogImage={walletIcon}
      />
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-green-500/5">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <img src={walletIcon} alt="ChatrPay" className="w-8 h-8" />
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

            {/* Add Money Button */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="w-full bg-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Money
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Add Money to Wallet</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Quick Top-up Options */}
                  <div className="grid grid-cols-2 gap-2">
                    {TOPUP_OPTIONS.map((opt) => (
                      <button
                        key={opt.amount}
                        onClick={() => handleTopupSelect(opt.amount)}
                        className={`p-3 rounded-lg border text-left transition-all hover:border-primary ${opt.popular ? 'border-primary bg-primary/5' : 'border-border'}`}
                      >
                        <div className="font-bold">{opt.label}</div>
                        {opt.tag && (
                          <Badge className="bg-green-500 text-white text-xs mt-1">{opt.tag}</Badge>
                        )}
                        {opt.popular && (
                          <Badge variant="outline" className="text-xs mt-1 border-primary text-primary">Popular</Badge>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  {/* Custom Amount */}
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value)}
                      placeholder="Custom amount"
                      className="flex-1"
                    />
                    <Button onClick={handleCustomTopup}>Add</Button>
                  </div>
                  
                  {/* Incentives */}
                  <div className="bg-gradient-to-r from-green-50 to-primary/5 dark:from-green-950/30 dark:to-primary/10 rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <Gift className="w-4 h-4 text-green-600" />
                      Top-up Bonuses
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Add ₹500+ and get up to 15% bonus instantly!
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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

        {/* Why Use ChatrPay - Incentives */}
        <Card className="p-4 mb-6 bg-gradient-to-r from-primary/10 via-purple-500/10 to-green-500/10 border-primary/20">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            Why Use ChatrPay?
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2">
              <Percent className="w-4 h-4 text-green-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">5% Cashback</p>
                <p className="text-xs text-muted-foreground">On all services</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-yellow-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Instant Pay</p>
                <p className="text-xs text-muted-foreground">No delays</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Gift className="w-4 h-4 text-purple-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Top-up Bonus</p>
                <p className="text-xs text-muted-foreground">Up to 15% extra</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium">Secure</p>
                <p className="text-xs text-muted-foreground">100% safe</p>
              </div>
            </div>
          </div>
        </Card>

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

        {/* UPI Payment Modal */}
        <UPIPaymentModal
          open={showUPIModal}
          onOpenChange={setShowUPIModal}
          amount={selectedTopup}
          orderType="service"
          onPaymentSubmitted={handlePaymentSubmitted}
        />
      </div>
    </>
  );
};

export default ChatrWallet;