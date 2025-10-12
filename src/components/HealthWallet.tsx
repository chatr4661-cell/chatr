import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Wallet, TrendingUp, TrendingDown, DollarSign, CreditCard, Award, Shield } from 'lucide-react';

export default function HealthWallet() {
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get or create wallet
      let { data: walletData, error: walletError } = await supabase
        .from('health_wallet')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!walletData) {
        const { data: newWallet } = await supabase
          .from('health_wallet')
          .insert({ user_id: user.id, balance: 0 })
          .select()
          .single();
        walletData = newWallet;
      }

      setWallet(walletData);

      // Get transactions
      const { data: txData } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      setTransactions(txData || []);
    } catch (error) {
      console.error('Error loading wallet:', error);
      toast.error('Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earn': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'spend': return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'insurance_claim': return <Shield className="w-4 h-4 text-blue-600" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading wallet...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Balance Card */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-600 to-pink-600 text-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-6 h-6" />
            Health Wallet Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-5xl font-bold mb-4">
            ${wallet?.balance?.toFixed(2) || '0.00'}
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
            <div>
              <p className="text-purple-100 text-sm">Total Earned</p>
              <p className="text-2xl font-semibold">${wallet?.total_earned?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <p className="text-purple-100 text-sm">Total Spent</p>
              <p className="text-2xl font-semibold">${wallet?.total_spent?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insurance Info */}
      {wallet?.insurance_provider && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700">
              <Shield className="w-5 h-5" />
              Insurance Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-blue-600">Provider</Label>
                <p className="font-medium">{wallet.insurance_provider}</p>
              </div>
              <div>
                <Label className="text-blue-600">Policy Number</Label>
                <p className="font-medium">{wallet.insurance_number || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Button className="bg-green-600">
            <Award className="w-4 h-4 mr-2" />
            Earn Rewards
          </Button>
          <Button variant="outline">
            <CreditCard className="w-4 h-4 mr-2" />
            Add Insurance
          </Button>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your wallet activity</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length > 0 ? (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 border rounded hover:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(tx.type)}
                    <div>
                      <p className="font-medium">{tx.description || tx.category}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.type === 'earn' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'earn' ? '+' : '-'}${tx.amount.toFixed(2)}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      {tx.category}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No transactions yet</p>
              <p className="text-sm">Complete challenges to earn rewards!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="pt-6">
          <p className="text-sm text-purple-800">
            💡 <strong>Earn rewards by:</strong> Completing health challenges, booking appointments, 
            maintaining wellness streaks, and engaging with the community!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}