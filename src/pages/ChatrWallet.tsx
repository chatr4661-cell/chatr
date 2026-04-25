import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import walletIcon from '@/assets/chatrpay-wallet-icon.png';
import { UPIPaymentModal } from '@/components/payment/UPIPaymentModal';
import { SEOHead } from '@/components/SEOHead';
import { WithdrawalDialog } from '@/components/wallet/WithdrawalDialog';
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
  Star,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  XCircle,
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
  balance_after?: number | null;
}

const TOPUP_OPTIONS = [
  { amount: 100, bonus: 0, label: '₹100' },
  { amount: 500, bonus: 25, label: '₹500', tag: '+₹25' },
  { amount: 1000, bonus: 75, label: '₹1,000', tag: '+₹75' },
  { amount: 2000, bonus: 200, label: '₹2,000', tag: '+₹200' },
  { amount: 5000, bonus: 750, label: '₹5,000', tag: '+₹750', popular: true },
  { amount: 10000, bonus: 2000, label: '₹10,000', tag: '+₹2,000' },
];

const CREDIT_TYPES = ['credit', 'cashback', 'referral', 'refund'];
const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'credit', label: 'Money In' },
  { id: 'debit', label: 'Money Out' },
  { id: 'cashback', label: 'Cashback' },
  { id: 'referral', label: 'Referrals' },
] as const;

const formatINR = (n: number | null | undefined) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n || 0));

const formatDateTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const ChatrWallet = () => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUPIModal, setShowUPIModal] = useState(false);
  const [selectedTopup, setSelectedTopup] = useState<number>(0);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [hideBalance, setHideBalance] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const PAGE_SIZE = 20;

  const fetchTransactionsPage = useCallback(
    async (userId: string, cursor?: { created_at: string; id: string }) => {
      let query = supabase
        .from('chatr_wallet_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE_SIZE + 1);

      if (cursor) {
        // Cursor: fetch rows strictly older than the cursor, breaking ties by id
        query = query.or(
          `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      const rows = (data as Transaction[]) || [];
      const more = rows.length > PAGE_SIZE;
      return { rows: more ? rows.slice(0, PAGE_SIZE) : rows, more };
    },
    [],
  );

  const loadWalletData = useCallback(async (silent = false) => {
    try {
      if (!silent) setRefreshing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      let { data: walletData, error: walletError } = await supabase
        .from('chatr_wallet')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!walletData && !walletError) {
        const { data: newWallet } = await supabase
          .from('chatr_wallet')
          .insert({ user_id: user.id })
          .select()
          .single();
        walletData = newWallet;
      }

      setWallet(walletData as WalletData);

      const { rows, more } = await fetchTransactionsPage(user.id);
      setTransactions(rows);
      setHasMore(more);
    } catch (error) {
      console.error('Error loading wallet:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate, fetchTransactionsPage]);

  const loadMoreTransactions = useCallback(async () => {
    if (loadingMore || !hasMore || transactions.length === 0) return;
    try {
      setLoadingMore(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const last = transactions[transactions.length - 1];
      const { rows, more } = await fetchTransactionsPage(user.id, {
        created_at: last.created_at,
        id: last.id,
      });
      setTransactions((prev) => {
        const seen = new Set(prev.map((t) => t.id));
        return [...prev, ...rows.filter((r) => !seen.has(r.id))];
      });
      setHasMore(more);
    } catch (error) {
      console.error('Error loading more transactions:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, transactions, fetchTransactionsPage]);

  useEffect(() => {
    loadWalletData(true);
  }, [loadWalletData]);

  // Realtime updates
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase
        .channel(`wallet-${user.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chatr_wallet', filter: `user_id=eq.${user.id}` }, () => loadWalletData(true))
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chatr_wallet_transactions', filter: `user_id=eq.${user.id}` }, () => loadWalletData(true))
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadWalletData]);

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
    if (amount > 100000) {
      toast.error('Maximum amount is ₹1,00,000');
      return;
    }
    handleTopupSelect(amount);
  };

  const handlePaymentSubmitted = async (_paymentId: string) => {
    toast.success('Top-up submitted', { description: 'Will be credited after verification.' });
    setShowUPIModal(false);
    setSelectedTopup(0);
    setAddAmount('');
    loadWalletData(true);
  };

  const filteredTransactions = useMemo(() => {
    let list = transactions;
    if (filter !== 'all') {
      if (filter === 'credit') list = list.filter((t) => CREDIT_TYPES.includes(t.type));
      else list = list.filter((t) => t.type === filter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => t.description?.toLowerCase().includes(q) || t.type.toLowerCase().includes(q));
    }
    return list;
  }, [transactions, filter, searchQuery]);

  const getTransactionIcon = (type: string) => {
    if (CREDIT_TYPES.includes(type)) return <ArrowDownLeft className="w-4 h-4" />;
    if (type === 'debit') return <ArrowUpRight className="w-4 h-4" />;
    return <History className="w-4 h-4" />;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'pending':
        return <Clock className="w-3 h-3" />;
      case 'failed':
      case 'rejected':
        return <XCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const renderSkeleton = () => (
    <div className="space-y-6">
      <Skeleton className="h-48 rounded-xl" shimmer />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24 rounded-xl" shimmer />
        <Skeleton className="h-24 rounded-xl" shimmer />
      </div>
      <Skeleton className="h-32 rounded-xl" shimmer />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-lg" shimmer />)}
      </div>
    </div>
  );

  return (
    <>
      <SEOHead
        title="ChatrPay Wallet — Digital Wallet, Cashback & UPI"
        description="Manage your ChatrPay wallet. Add money, track cashback, view transactions, and enjoy up to 15% top-up bonuses. Secure digital payments for all Chatr services."
        ogImage={walletIcon}
      />
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/60">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <img src={walletIcon} alt="ChatrPay" className="w-8 h-8" loading="eager" />
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold leading-tight">ChatrPay Wallet</h1>
              <p className="text-[11px] text-muted-foreground">Secure digital wallet</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadWalletData(false)}
              disabled={refreshing}
              aria-label="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          {loading ? (
            renderSkeleton()
          ) : (
            <>
              {/* Balance Card */}
              <Card className="p-6 mb-6 bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 border-primary/20 relative overflow-hidden shadow-lg shadow-primary/5">
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-3xl opacity-60" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Wallet className="w-4 h-4" />
                      <span className="text-xs font-medium uppercase tracking-wide">Available Balance</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setHideBalance((v) => !v)}
                      aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
                    >
                      {hideBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                  <div className="text-4xl sm:text-5xl font-bold mb-4 tracking-tight tabular-nums">
                    {hideBalance ? '••••••' : formatINR(wallet?.balance)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div className="rounded-lg bg-background/60 backdrop-blur p-3 border border-border/40">
                      <p className="text-[11px] text-muted-foreground mb-0.5 uppercase tracking-wide">Cashback</p>
                      <p className="font-semibold text-base text-primary tabular-nums">
                        {hideBalance ? '••••' : formatINR(wallet?.cashback_balance)}
                      </p>
                    </div>
                    <div className="rounded-lg bg-background/60 backdrop-blur p-3 border border-border/40">
                      <p className="text-[11px] text-muted-foreground mb-0.5 uppercase tracking-wide">Referrals</p>
                      <p className="font-semibold text-base text-accent-foreground tabular-nums">
                        {hideBalance ? '••••' : formatINR(wallet?.referral_earnings)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                      <DialogTrigger asChild>
                        <Button className="flex-1 shadow-md shadow-primary/20">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Money
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Add money to wallet</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-2">
                            {TOPUP_OPTIONS.map((opt) => (
                              <button
                                key={opt.amount}
                                onClick={() => handleTopupSelect(opt.amount)}
                                className={`p-3 rounded-lg border text-left transition-all hover:border-primary hover:shadow-sm ${
                                  opt.popular ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border'
                                }`}
                              >
                                <div className="font-bold text-sm">{opt.label}</div>
                                {opt.tag && (
                                  <Badge className="mt-1 text-[10px] px-1.5 py-0">{opt.tag}</Badge>
                                )}
                                {opt.popular && (
                                  <Badge variant="outline" className="text-[10px] mt-1 px-1.5 py-0 border-primary text-primary ml-1">
                                    Popular
                                  </Badge>
                                )}
                              </button>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <Input
                              type="number"
                              inputMode="numeric"
                              value={addAmount}
                              onChange={(e) => setAddAmount(e.target.value)}
                              placeholder="Custom amount (₹10 - ₹1,00,000)"
                              className="flex-1"
                            />
                            <Button onClick={handleCustomTopup}>Add</Button>
                          </div>

                          <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-3 border border-primary/10">
                            <p className="text-sm font-medium flex items-center gap-2 mb-1">
                              <Gift className="w-4 h-4 text-primary" />
                              Top-up Bonuses
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              Add ₹500+ and earn up to 20% bonus instantly. Bonuses are credited within seconds of verification.
                            </p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <WithdrawalDialog
                      walletBalance={wallet?.balance || 0}
                      onWithdrawComplete={() => loadWalletData(true)}
                    />
                  </div>
                </div>
              </Card>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <Card className="p-4 border-border/60">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-[11px] uppercase tracking-wide">Total Earned</span>
                  </div>
                  <p className="text-xl font-bold tabular-nums">{formatINR(wallet?.total_earned)}</p>
                </Card>
                <Card className="p-4 border-border/60">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Gift className="w-4 h-4" />
                    <span className="text-[11px] uppercase tracking-wide">Total Spent</span>
                  </div>
                  <p className="text-xl font-bold tabular-nums">{formatINR(wallet?.total_spent)}</p>
                </Card>
              </div>

              {/* Why ChatrPay */}
              <Card className="p-4 mb-6 bg-gradient-to-r from-primary/5 via-background to-accent/5 border-primary/15">
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                  <Star className="w-4 h-4 text-primary" />
                  Why use ChatrPay?
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Percent, title: '5% Cashback', desc: 'On all services' },
                    { icon: Zap, title: 'Instant Pay', desc: 'No delays' },
                    { icon: Gift, title: 'Top-up Bonus', desc: 'Up to 20% extra' },
                    { icon: Shield, title: 'Bank-Grade', desc: '100% secure' },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-2">
                      <div className="rounded-md bg-primary/10 p-1.5">
                        <item.icon className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold leading-tight">{item.title}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Transactions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2 text-sm">
                    <History className="w-4 h-4" />
                    Transactions
                    {transactions.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{transactions.length}</Badge>
                    )}
                  </h3>
                </div>

                {/* Search + filters */}
                <div className="space-y-3 mb-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search transactions"
                      className="pl-9 h-9 text-sm"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
                    {FILTERS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          filter === f.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/40'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredTransactions.length === 0 ? (
                  <Card className="p-10 text-center border-dashed">
                    <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <History className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">No transactions {filter !== 'all' || searchQuery ? 'match' : 'yet'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {filter !== 'all' || searchQuery
                        ? 'Try clearing filters or search.'
                        : 'Add money to your wallet to get started.'}
                    </p>
                    {(filter !== 'all' || searchQuery) && (
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          setFilter('all');
                          setSearchQuery('');
                        }}
                      >
                        Clear filters
                      </Button>
                    )}
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {filteredTransactions.map((tx) => {
                      const isCredit = CREDIT_TYPES.includes(tx.type);
                      return (
                        <Card key={tx.id} className="p-3.5 hover:border-primary/30 transition-colors">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                                  isCredit ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground/70'
                                }`}
                              >
                                {getTransactionIcon(tx.type)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-sm truncate">{tx.description}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <p className="text-[11px] text-muted-foreground">{formatDateTime(tx.created_at)}</p>
                                  {tx.status && (
                                    <span
                                      className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0 rounded ${
                                        tx.status === 'completed' || tx.status === 'success'
                                          ? 'bg-primary/10 text-primary'
                                          : tx.status === 'pending'
                                          ? 'bg-muted text-muted-foreground'
                                          : 'bg-destructive/10 text-destructive'
                                      }`}
                                    >
                                      {getStatusIcon(tx.status)}
                                      {tx.status}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className={`font-semibold text-sm tabular-nums ${isCredit ? 'text-primary' : 'text-foreground'}`}>
                                {isCredit ? '+' : '−'}{formatINR(tx.amount)}
                              </p>
                              {tx.balance_after != null && (
                                <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5">
                                  Bal: {formatINR(tx.balance_after)}
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                    {hasMore && !searchQuery && filter === 'all' && (
                      <div className="pt-2 flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadMoreTransactions}
                          disabled={loadingMore}
                          className="w-full"
                        >
                          {loadingMore ? 'Loading…' : 'Load more transactions'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

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
