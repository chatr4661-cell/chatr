import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, CheckCircle, Copy, Loader2, IndianRupee } from 'lucide-react';

interface UPIPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  amount: number;
  orderId?: string;
  orderType: 'food' | 'healthcare' | 'deals' | 'service';
  sellerId?: string;
  onPaymentSubmitted?: (paymentId: string) => void;
}

export const UPIPaymentModal = ({
  open,
  onOpenChange,
  amount,
  orderId,
  orderType,
  sellerId,
  onPaymentSubmitted
}: UPIPaymentModalProps) => {
  const [step, setStep] = useState<'qr' | 'upload' | 'success'>('qr');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [utrNumber, setUtrNumber] = useState('');
  const [uploading, setUploading] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const UPI_ID = '9717161809@okbizaxis';

  const copyUPI = () => {
    navigator.clipboard.writeText(UPI_ID);
    toast.success('UPI ID copied!');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setScreenshot(file);
    }
  };

  const submitPayment = async () => {
    if (!screenshot) {
      toast.error('Please upload payment screenshot');
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login to continue');
        return;
      }

      // Upload screenshot
      const fileExt = screenshot.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('payment-screenshots')
        .upload(fileName, screenshot);

      if (uploadError) throw uploadError;

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('upi_payments')
        .insert({
          user_id: user.id,
          order_id: orderId,
          order_type: orderType,
          seller_id: sellerId,
          amount,
          upi_reference: utrNumber || null,
          payment_screenshot_url: fileName,
          status: 'submitted'
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      setPaymentId(payment.id);
      setStep('success');
      toast.success('Payment submitted for verification!');
      onPaymentSubmitted?.(payment.id);

    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to submit payment');
    } finally {
      setUploading(false);
    }
  };

  const resetAndClose = () => {
    setStep('qr');
    setScreenshot(null);
    setUtrNumber('');
    setPaymentId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IndianRupee className="h-5 w-5" />
            Pay ₹{amount.toLocaleString('en-IN')}
          </DialogTitle>
        </DialogHeader>

        {step === 'qr' && (
          <div className="space-y-4">
            {/* QR Code */}
            <div className="bg-white rounded-xl p-4 flex flex-col items-center">
              <img 
                src="/images/talentxcel-upi-qr.jpg" 
                alt="Talentxcel UPI QR Code"
                className="w-64 h-auto rounded-lg"
              />
            </div>

            {/* UPI ID */}
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">UPI ID</p>
              <div className="flex items-center justify-between">
                <code className="text-sm font-mono">{UPI_ID}</code>
                <Button variant="ghost" size="sm" onClick={copyUPI}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-primary/10 rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">Pay to</p>
              <p className="font-medium">Talentxcel Services Pvt Ltd</p>
              <p className="text-2xl font-bold text-primary mt-1">₹{amount.toLocaleString('en-IN')}</p>
            </div>

            {/* Instructions */}
            <div className="text-sm text-muted-foreground space-y-1">
              <p>1. Scan QR code or copy UPI ID</p>
              <p>2. Pay ₹{amount.toLocaleString('en-IN')} using any UPI app</p>
              <p>3. Take a screenshot of payment confirmation</p>
            </div>

            <Button className="w-full" onClick={() => setStep('upload')}>
              I've Made the Payment
            </Button>
          </div>
        )}

        {step === 'upload' && (
          <div className="space-y-4">
            {/* Screenshot Upload */}
            <div>
              <Label>Upload Payment Screenshot</Label>
              <div 
                className="mt-2 border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {screenshot ? (
                  <div className="space-y-2">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto" />
                    <p className="text-sm font-medium">{screenshot.name}</p>
                    <p className="text-xs text-muted-foreground">Click to change</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-sm">Click to upload screenshot</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            {/* UTR Number (Optional) */}
            <div>
              <Label htmlFor="utr">UTR/Transaction ID (Optional)</Label>
              <Input
                id="utr"
                placeholder="Enter UTR number for faster verification"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Amount Confirmation */}
            <div className="bg-muted rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount Paid</span>
              <span className="font-bold">₹{amount.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('qr')}>
                Back
              </Button>
              <Button 
                className="flex-1" 
                onClick={submitPayment}
                disabled={!screenshot || uploading}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Payment'
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Payment Submitted!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your payment is being verified. You'll receive a confirmation shortly.
              </p>
            </div>
            <div className="bg-muted rounded-lg p-3 text-sm">
              <p className="text-muted-foreground">Payment ID</p>
              <p className="font-mono text-xs mt-1">{paymentId}</p>
            </div>
            <Button className="w-full" onClick={resetAndClose}>
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
