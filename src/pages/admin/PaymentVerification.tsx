import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle, XCircle, Eye, Loader2, Search, IndianRupee } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Payment {
  id: string;
  user_id: string;
  order_type: string;
  amount: number;
  upi_reference: string | null;
  payment_screenshot_url: string | null;
  status: string;
  created_at: string;
  notes: string | null;
}

export default function PaymentVerification() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'submitted' | 'verified' | 'rejected'>('submitted');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    loadPayments();
  }, [filter]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('upi_payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const viewScreenshot = async (payment: Payment) => {
    setSelectedPayment(payment);
    if (payment.payment_screenshot_url) {
      const { data } = await supabase.storage
        .from('payment-screenshots')
        .createSignedUrl(payment.payment_screenshot_url, 3600);
      setScreenshotUrl(data?.signedUrl || null);
    }
  };

  const verifyPayment = async (paymentId: string) => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('upi_payments')
        .update({
          status: 'verified',
          verified_by: user?.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;

      toast.success('Payment verified!');
      setSelectedPayment(null);
      loadPayments();
    } catch (error) {
      console.error('Error verifying payment:', error);
      toast.error('Failed to verify payment');
    } finally {
      setProcessing(false);
    }
  };

  const rejectPayment = async (paymentId: string) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('upi_payments')
        .update({
          status: 'rejected',
          verified_by: user?.id,
          verified_at: new Date().toISOString(),
          notes: rejectReason
        })
        .eq('id', paymentId);

      if (error) throw error;

      toast.success('Payment rejected');
      setSelectedPayment(null);
      setRejectReason('');
      loadPayments();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('Failed to reject payment');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      submitted: 'bg-blue-100 text-blue-800',
      verified: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      settled: 'bg-purple-100 text-purple-800'
    };
    return <Badge className={styles[status] || 'bg-gray-100'}>{status}</Badge>;
  };

  const filteredPayments = payments.filter(p => 
    p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.upi_reference?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.order_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">Payment Verification</h1>
          <p className="text-sm text-muted-foreground">Verify UPI payments</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {['all', 'submitted', 'verified', 'rejected'].map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status as typeof filter)}
            className="capitalize"
          >
            {status}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by ID, UTR, or order type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Payments List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No payments found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredPayments.map((payment) => (
            <Card key={payment.id} className="cursor-pointer hover:bg-muted/50" onClick={() => viewScreenshot(payment)}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <IndianRupee className="h-4 w-4" />
                      <span className="font-bold">₹{payment.amount.toLocaleString('en-IN')}</span>
                      {getStatusBadge(payment.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {payment.order_type} • {new Date(payment.created_at).toLocaleDateString()}
                    </p>
                    {payment.upi_reference && (
                      <p className="text-xs font-mono">UTR: {payment.upi_reference}</p>
                    )}
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Payment Detail Modal */}
      <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              {/* Screenshot */}
              {screenshotUrl && (
                <div className="rounded-lg overflow-hidden border">
                  <img src={screenshotUrl} alt="Payment Screenshot" className="w-full" />
                </div>
              )}

              {/* Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-bold">₹{selectedPayment.amount.toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  {getStatusBadge(selectedPayment.status)}
                </div>
                <div>
                  <p className="text-muted-foreground">Order Type</p>
                  <p className="capitalize">{selectedPayment.order_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p>{new Date(selectedPayment.created_at).toLocaleString()}</p>
                </div>
                {selectedPayment.upi_reference && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">UTR Reference</p>
                    <p className="font-mono">{selectedPayment.upi_reference}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {selectedPayment.status === 'submitted' && (
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex gap-2">
                    <Button 
                      className="flex-1 bg-green-600 hover:bg-green-700"
                      onClick={() => verifyPayment(selectedPayment.id)}
                      disabled={processing}
                    >
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                      Verify Payment
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Reason for rejection (required)"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                    />
                    <Button 
                      variant="destructive"
                      className="w-full"
                      onClick={() => rejectPayment(selectedPayment.id)}
                      disabled={processing || !rejectReason.trim()}
                    >
                      {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                      Reject Payment
                    </Button>
                  </div>
                </div>
              )}

              {selectedPayment.notes && (
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-red-800">Rejection Reason</p>
                  <p className="text-sm text-red-600">{selectedPayment.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
