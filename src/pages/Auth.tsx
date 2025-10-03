import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle } from 'lucide-react';

const Auth = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/chat');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/chat');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });

      if (error) throw error;

      setOtpSent(true);
      toast({
        title: 'OTP Sent',
        description: 'Check your phone for the verification code',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: otp,
        type: 'sms',
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Welcome to HealthMessenger!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-background/50 backdrop-blur-3xl" />
      
      <Card className="w-full max-w-md relative backdrop-blur-glass bg-gradient-glass border-glass-border shadow-glass rounded-3xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-2xl flex items-center justify-center shadow-glow">
            <MessageCircle className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">HealthMessenger</CardTitle>
          <CardDescription className="text-base">
            {otpSent ? 'Enter the verification code' : 'Enter your phone number to continue'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!otpSent ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="tel"
                  placeholder="+1 234 567 8900"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                  className="h-12 text-base rounded-xl bg-background/50 backdrop-blur-sm border-glass-border"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-base rounded-xl shadow-glow"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Code'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  className="h-12 text-base text-center tracking-widest font-semibold rounded-xl bg-background/50 backdrop-blur-sm border-glass-border"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 text-base rounded-xl shadow-glow"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-xl"
                onClick={() => {
                  setOtpSent(false);
                  setOtp('');
                }}
              >
                Change phone number
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
