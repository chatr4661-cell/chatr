import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Download, Wallet, TrendingUp, Gift, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import logo from '@/assets/chatr-logo.png';

interface Transaction {
  id: string;
  created_at: string;
  amount: number;
  transaction_type: string;
  description: string;
  source: string;
  metadata?: any;
}

interface CashbackTier {
  name: string;
  threshold: number;
  percentage: number;
  color: string;
}

const CASHBACK_TIERS: CashbackTier[] = [
  { name: 'Bronze', threshold: 0, percentage: 1, color: 'hsl(var(--chart-1))' },
  { name: 'Silver', threshold: 5000, percentage: 2, color: 'hsl(var(--chart-2))' },
  { name: 'Gold', threshold: 15000, percentage: 3, color: 'hsl(var(--chart-3))' },
  { name: 'Platinum', threshold: 50000, percentage: 5, color: 'hsl(var(--chart-4))' },
];

export default function ChatrPlusWallet() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMoneyOpen, setAddMoneyOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card'>('upi');
  const [upiId, setUpiId] = useState('');
  const [totalSpent, setTotalSpent] = useState(0);
  const [cashbackEarned, setCashbackEarned] = useState(0);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadWalletData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [transactions, typeFilter, statusFilter, dateFrom, dateTo]);

  const loadWalletData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Get balance
      const { data: balanceData } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', user.id)
        .single();

      setBalance(balanceData?.balance || 0);

      // Get transactions
      const { data: txData } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (txData) {
        setTransactions(txData);
        
        // Calculate total spent and cashback
        const spent = txData
          .filter(tx => tx.transaction_type === 'spend' || tx.transaction_type === 'transfer')
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        
        const cashback = txData
          .filter(tx => tx.source === 'cashback')
          .reduce((sum, tx) => sum + tx.amount, 0);
        
        setTotalSpent(spent);
        setCashbackEarned(cashback);
      }
    } catch (error) {
      console.error('Error loading wallet:', error);
      toast({
        title: 'Error',
        description: 'Failed to load wallet data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    if (typeFilter !== 'all') {
      filtered = filtered.filter(tx => tx.transaction_type === typeFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(tx => tx.source === statusFilter);
    }

    if (dateFrom) {
      filtered = filtered.filter(tx => new Date(tx.created_at) >= new Date(dateFrom));
    }

    if (dateTo) {
      filtered = filtered.filter(tx => new Date(tx.created_at) <= new Date(dateTo));
    }

    setFilteredTransactions(filtered);
  };

  const handleAddMoney = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    if (paymentMethod === 'upi' && !upiId) {
      toast({
        title: 'UPI ID Required',
        description: 'Please enter your UPI ID',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Simulate payment processing
      const amountNum = parseFloat(amount);
      
      // Add money to balance
      const { error: balanceError } = await supabase
        .from('user_points')
        .update({
          balance: balance + amountNum,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (balanceError) throw balanceError;

      // Create transaction record
      const { error: txError } = await supabase
        .from('point_transactions')
        .insert({
          user_id: user.id,
          amount: amountNum,
          transaction_type: 'earn',
          description: `Added money via ${paymentMethod.toUpperCase()}`,
          source: 'wallet_topup',
        });

      if (txError) throw txError;

      toast({
        title: 'Success',
        description: `₹${amountNum} added to your wallet`,
      });

      setAddMoneyOpen(false);
      setAmount('');
      setUpiId('');
      loadWalletData();
    } catch (error) {
      console.error('Error adding money:', error);
      toast({
        title: 'Error',
        description: 'Failed to add money',
        variant: 'destructive',
      });
    }
  };

  const getCurrentTier = (): CashbackTier => {
    return [...CASHBACK_TIERS]
      .reverse()
      .find(tier => totalSpent >= tier.threshold) || CASHBACK_TIERS[0];
  };

  const getNextTier = (): CashbackTier | null => {
    const currentTier = getCurrentTier();
    const currentIndex = CASHBACK_TIERS.findIndex(t => t.name === currentTier.name);
    return CASHBACK_TIERS[currentIndex + 1] || null;
  };

  const getTierProgress = (): number => {
    const currentTier = getCurrentTier();
    const nextTier = getNextTier();
    
    if (!nextTier) return 100;
    
    const progress = ((totalSpent - currentTier.threshold) / (nextTier.threshold - currentTier.threshold)) * 100;
    return Math.min(Math.max(progress, 0), 100);
  };

  const getSpendingByCategory = () => {
    const categoryMap: { [key: string]: number } = {};
    
    transactions
      .filter(tx => tx.transaction_type === 'spend' && tx.source)
      .forEach(tx => {
        const category = tx.source || 'Other';
        categoryMap[category] = (categoryMap[category] || 0) + Math.abs(tx.amount);
      });

    return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
  };

  const exportToPDF = () => {
    // Simple CSV export (in production, use a proper PDF library like jsPDF)
    const headers = ['Date', 'Type', 'Description', 'Amount', 'Status'];
    const rows = filteredTransactions.map(tx => [
      new Date(tx.created_at).toLocaleDateString(),
      tx.transaction_type,
      tx.description,
      `₹${tx.amount}`,
      tx.source,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wallet-statement-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: 'Exported',
      description: 'Statement downloaded successfully',
    });
  };

  const spendingData = getSpendingByCategory();
  const COLORS = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading wallet...</div>
      </div>
    );
  }

  const currentTier = getCurrentTier();
  const nextTier = getNextTier();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <img src={logo} alt="Chatr" className="h-8 cursor-pointer" onClick={() => navigate('/')} />
              <Button variant="ghost" size="sm" onClick={() => navigate('/chatr-plus')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
          </div>

          {/* Balance Display */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Wallet className="h-8 w-8" />
              <h1 className="text-4xl font-bold">ChatrPay Wallet</h1>
            </div>
            <div className="text-6xl font-bold mb-4">₹{balance.toLocaleString()}</div>
            <Dialog open={addMoneyOpen} onOpenChange={setAddMoneyOpen}>
              <DialogTrigger asChild>
                <Button size="lg" variant="secondary">
                  <Plus className="h-5 w-5 mr-2" />
                  Add Money
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Money to Wallet</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'upi' | 'card')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {paymentMethod === 'upi' && (
                    <div>
                      <Label htmlFor="upi">UPI ID</Label>
                      <Input
                        id="upi"
                        placeholder="yourname@upi"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                      />
                    </div>
                  )}
                  <Button onClick={handleAddMoney} className="w-full">
                    Add ₹{amount || '0'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Cashback Rewards */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Gift className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Cashback Rewards</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Current Tier</div>
                <div className="text-2xl font-bold" style={{ color: currentTier.color }}>
                  {currentTier.name}
                </div>
                <div className="text-sm">Earn {currentTier.percentage}% cashback</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">Total Cashback Earned</div>
                <div className="text-2xl font-bold text-primary">₹{cashbackEarned}</div>
              </div>
            </div>
            
            {nextTier && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Progress to {nextTier.name}</span>
                  <span className="text-muted-foreground">
                    ₹{totalSpent.toLocaleString()} / ₹{nextTier.threshold.toLocaleString()}
                  </span>
                </div>
                <Progress value={getTierProgress()} className="h-2" />
              </div>
            )}

            <div className="grid grid-cols-4 gap-2 mt-4">
              {CASHBACK_TIERS.map((tier) => (
                <div
                  key={tier.name}
                  className="text-center p-2 rounded-lg border"
                  style={{
                    borderColor: tier.name === currentTier.name ? tier.color : 'hsl(var(--border))',
                    backgroundColor: tier.name === currentTier.name ? `${tier.color}15` : 'transparent',
                  }}
                >
                  <div className="font-bold text-sm">{tier.name}</div>
                  <div className="text-xs text-muted-foreground">{tier.percentage}%</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Spending Analytics */}
        {spendingData.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold">Spending Analytics</h2>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={spendingData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(props: any) => `${props.name}: ${((props.percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {spendingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `₹${value.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Transaction History */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Transaction History</h2>
            <Button onClick={exportToPDF} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Statement
            </Button>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="type-filter">Type</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger id="type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="earn">Earn</SelectItem>
                  <SelectItem value="spend">Spend</SelectItem>
                  <SelectItem value="transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status-filter">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="wallet_topup">Wallet Top-up</SelectItem>
                  <SelectItem value="cashback">Cashback</SelectItem>
                  <SelectItem value="chatr_plus_booking">Chatr+ Booking</SelectItem>
                  <SelectItem value="signup_bonus">Signup Bonus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date-from">From</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="date-to">To</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="capitalize">{tx.transaction_type}</TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell className={tx.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                        {tx.amount > 0 ? '+' : ''}₹{Math.abs(tx.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">
                        {tx.source?.replace(/_/g, ' ')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
