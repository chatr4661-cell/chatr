import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  ArrowLeft, Wallet, ArrowDownLeft, Building2, CreditCard, 
  CheckCircle, AlertCircle, Clock, Landmark, Smartphone
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WithdrawalDialogProps {
  walletBalance: number;
  onWithdrawComplete: () => void;
}

export function WithdrawalDialog({ walletBalance, onWithdrawComplete }: WithdrawalDialogProps) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'bank' | 'upi'>('upi');
  const [upiId, setUpiId] = useState('');
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    ifsc: '',
    accountName: ''
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');

  const withdrawalAmount = parseFloat(amount) || 0;
  const withdrawalFee = withdrawalAmount >= 1000 ? 0 : 10;
  const finalAmount = withdrawalAmount - withdrawalFee;

  const handleWithdraw = async () => {
    if (withdrawalAmount < 100) {
      toast.error('Minimum withdrawal is ₹100');
      return;
    }
    if (withdrawalAmount > walletBalance) {
      toast.error('Insufficient balance');
      return;
    }
    if (method === 'upi' && !upiId) {
      toast.error('Please enter UPI ID');
      return;
    }
    if (method === 'bank' && (!bankDetails.accountNumber || !bankDetails.ifsc)) {
      toast.error('Please enter bank details');
      return;
    }

    setStep('confirm');
  };

  const confirmWithdrawal = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get wallet
      const { data: wallet } = await supabase
        .from('chatr_wallet')
        .select('id, balance')
        .eq('user_id', user.id)
        .single();

      if (!wallet || wallet.balance < withdrawalAmount) {
        throw new Error('Insufficient balance');
      }

      // Deduct from wallet
      await supabase
        .from('chatr_wallet')
        .update({ balance: wallet.balance - withdrawalAmount })
        .eq('id', wallet.id);

      // Create transaction record
      await supabase
        .from('chatr_wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          user_id: user.id,
          type: 'withdrawal',
          amount: withdrawalAmount,
          balance_after: wallet.balance - withdrawalAmount,
          description: `Withdrawal to ${method === 'upi' ? upiId : 'Bank Account'}`,
          status: 'pending',
          metadata: {
            method,
            upiId: method === 'upi' ? upiId : null,
            bankDetails: method === 'bank' ? bankDetails : null,
            fee: withdrawalFee,
            finalAmount
          }
        });

      setStep('success');
      toast.success('Withdrawal request submitted');
      onWithdrawComplete();
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      toast.error(error.message || 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('form');
    setAmount('');
    setUpiId('');
    setBankDetails({ accountNumber: '', ifsc: '', accountName: '' });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ArrowDownLeft className="w-4 h-4" />
          Withdraw
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'form' && 'Withdraw Money'}
            {step === 'confirm' && 'Confirm Withdrawal'}
            {step === 'success' && 'Withdrawal Submitted'}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4">
            {/* Balance Display */}
            <Card className="bg-muted/50">
              <CardContent className="p-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Available Balance</span>
                <span className="font-bold text-lg">₹{walletBalance.toFixed(2)}</span>
              </CardContent>
            </Card>

            {/* Amount */}
            <div>
              <Label>Withdrawal Amount</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="pl-8"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Minimum: ₹100 • Free above ₹1000</p>
            </div>

            {/* Quick Amounts */}
            <div className="flex gap-2">
              {[500, 1000, 2000, 5000].map((amt) => (
                <Button
                  key={amt}
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(amt.toString())}
                  className={amount === amt.toString() ? 'border-primary' : ''}
                >
                  ₹{amt}
                </Button>
              ))}
            </div>

            <Separator />

            {/* Withdrawal Method */}
            <div className="space-y-3">
              <Label>Withdraw To</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setMethod('upi')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    method === 'upi' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Smartphone className="w-5 h-5 mb-1.5" />
                  <p className="font-medium text-sm">UPI</p>
                  <p className="text-xs text-muted-foreground">Instant transfer</p>
                </button>
                <button
                  onClick={() => setMethod('bank')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    method === 'bank' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Landmark className="w-5 h-5 mb-1.5" />
                  <p className="font-medium text-sm">Bank Account</p>
                  <p className="text-xs text-muted-foreground">1-2 business days</p>
                </button>
              </div>
            </div>

            {/* Method Details */}
            {method === 'upi' ? (
              <div>
                <Label>UPI ID</Label>
                <Input
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="yourname@upi"
                  className="mt-1"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label>Account Number</Label>
                  <Input
                    value={bankDetails.accountNumber}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                    placeholder="Enter account number"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>IFSC Code</Label>
                  <Input
                    value={bankDetails.ifsc}
                    onChange={(e) => setBankDetails({ ...bankDetails, ifsc: e.target.value.toUpperCase() })}
                    placeholder="SBIN0001234"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Account Holder Name</Label>
                  <Input
                    value={bankDetails.accountName}
                    onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                    placeholder="As per bank records"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Fee Info */}
            {withdrawalAmount > 0 && (
              <Card className="bg-muted/30">
                <CardContent className="p-3 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span>₹{withdrawalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fee</span>
                    <span className={withdrawalFee === 0 ? 'text-green-600' : ''}>
                      {withdrawalFee === 0 ? 'FREE' : `₹${withdrawalFee}`}
                    </span>
                  </div>
                  <Separator className="my-1" />
                  <div className="flex justify-between font-bold">
                    <span>You'll receive</span>
                    <span className="text-primary">₹{finalAmount.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button 
              className="w-full" 
              onClick={handleWithdraw}
              disabled={!withdrawalAmount || withdrawalAmount < 100}
            >
              Continue
            </Button>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
              <CardContent className="p-3 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Confirm Withdrawal</p>
                  <p className="text-xs text-muted-foreground">
                    ₹{finalAmount.toFixed(2)} will be sent to {method === 'upi' ? upiId : 'your bank account'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium">{method === 'upi' ? 'UPI' : 'Bank Transfer'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {method === 'upi' ? 'UPI ID' : 'Account'}
                </span>
                <span className="font-medium">
                  {method === 'upi' ? upiId : `****${bankDetails.accountNumber.slice(-4)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-primary">₹{finalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Processing time</span>
                <span>{method === 'upi' ? 'Instant' : '1-2 business days'}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('form')} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={confirmWithdrawal} 
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-bold mb-1">Withdrawal Submitted</h3>
            <p className="text-muted-foreground text-sm mb-4">
              ₹{finalAmount.toFixed(2)} will be transferred to your {method === 'upi' ? 'UPI ID' : 'bank account'}
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-6">
              <Clock className="w-4 h-4" />
              <span>Expected: {method === 'upi' ? 'Within 10 minutes' : '1-2 business days'}</span>
            </div>
            <Button onClick={resetForm} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}