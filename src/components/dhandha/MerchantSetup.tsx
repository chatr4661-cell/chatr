import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Store, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MerchantSetupProps {
  onComplete: () => void;
}

export const MerchantSetup = ({ onComplete }: MerchantSetupProps) => {
  const [upiId, setUpiId] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateUpiId = (id: string): boolean => {
    // Basic UPI ID validation: name@bank format
    const upiPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
    return upiPattern.test(id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateUpiId(upiId)) {
      toast.error('Invalid UPI ID format (e.g., name@paytm)');
      return;
    }

    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please login first');
        return;
      }

      const { error } = await supabase
        .from('merchant_profiles')
        .insert({
          user_id: user.id,
          upi_id: upiId.toLowerCase().trim(),
          business_name: businessName.trim() || null,
          business_type: 'kirana'
        });

      if (error) {
        if (error.code === '23505') {
          toast.error('You already have a merchant profile');
        } else {
          throw error;
        }
        return;
      }

      toast.success('🎉 Dhandha setup complete!');
      onComplete();
    } catch (error) {
      console.error('Merchant setup error:', error);
      toast.error('Setup failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Store className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Setup Your Dhandha</CardTitle>
          <CardDescription>
            One-time setup. Enter your UPI ID to start accepting voice payments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upiId">Your UPI ID *</Label>
              <Input
                id="upiId"
                placeholder="yourname@paytm"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                required
                className="text-lg"
              />
              <p className="text-xs text-muted-foreground">
                Payments will go directly to this UPI ID
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name (Optional)</Label>
              <Input
                id="businessName"
                placeholder="My Kirana Store"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>

            <div className="pt-4 space-y-3">
              <Button 
                type="submit" 
                className="w-full h-12 text-lg"
                disabled={isLoading || !upiId}
              >
                {isLoading ? 'Setting up...' : 'Start My Dhandha'}
              </Button>

              <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>₹1 coin per transaction</span>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
