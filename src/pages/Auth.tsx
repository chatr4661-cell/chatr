import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/chatr-logo.png';

const Auth = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!otpSent) {
        // Send OTP
        const { error } = await supabase.auth.signInWithOtp({
          phone,
          options: {
            channel: 'sms'
          }
        });

        if (error) throw error;

        setOtpSent(true);
        toast({
          title: 'OTP Sent!',
          description: 'Check your phone for the verification code.',
        });
      } else {
        // Verify OTP
        const { error } = await supabase.auth.verifyOtp({
          phone,
          token: otp,
          type: 'sms'
        });

        if (error) throw error;

        toast({
          title: 'Welcome!',
          description: 'Signed in successfully.',
        });
        navigate('/');
      }
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

  const resetForm = () => {
    setOtpSent(false);
    setOtp('');
    setPhone('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-hero">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/5 to-background/50 backdrop-blur-3xl" />
      
      <Card className="w-full max-w-md relative backdrop-blur-glass bg-gradient-glass border-glass-border shadow-glass rounded-3xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto flex items-center justify-center">
            <img src={logo} alt="chatr+ Logo" className="h-20 object-contain" />
          </div>
          <CardDescription className="text-base">
            {otpSent ? 'Enter the code sent to your phone' : 'Sign in with your phone number'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!otpSent ? (
              <div className="space-y-2">
                <Input
                  type="tel"
                  placeholder="Phone number (e.g., +1234567890)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="h-12 text-base rounded-xl bg-background/50 backdrop-blur-sm border-glass-border"
                />
                <p className="text-xs text-muted-foreground">
                  Include country code (e.g., +91 for India, +1 for US)
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  className="h-12 text-base text-center tracking-widest rounded-xl bg-background/50 backdrop-blur-sm border-glass-border"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Sent to {phone}
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base rounded-xl shadow-glow"
              disabled={loading}
            >
              {loading ? 'Please wait...' : (otpSent ? 'Verify OTP' : 'Send OTP')}
            </Button>

            {otpSent && (
              <Button
                type="button"
                variant="ghost"
                className="w-full rounded-xl"
                onClick={resetForm}
              >
                Use a different number
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

