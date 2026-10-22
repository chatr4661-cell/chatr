import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Laptop, CheckCircle2, AlertCircle, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import chatrLogo from '@/assets/chatr-icon-logo.png';

const QRLogin = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [status, setStatus] = useState<'prompt' | 'authenticating' | 'success' | 'error'>('prompt');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // If no token was provided in the URL, redirect to web login page
    if (!token) {
      navigate('/web', { replace: true });
      return;
    }

    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
      } catch (err) {
        console.error('Error checking user:', err);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkUser();
  }, [token, navigate]);

  const handleApprove = async () => {
    if (!token) return;
    setStatus('authenticating');

    try {
      const deviceInfo = {
        deviceName: 'Mobile Web Authorization',
        browser: navigator.userAgent.includes('Chrome') ? 'Chrome Mobile' : 
                 navigator.userAgent.includes('Safari') ? 'Safari Mobile' : 'Mobile Browser',
        os: navigator.platform
      };

      const { data: { session } } = await supabase.auth.getSession();

      const { data, error } = await supabase.functions.invoke('qr-login', {
        body: {
          action: 'authenticate',
          token,
          deviceInfo,
          sessionTokens: session ? {
            access_token: session.access_token,
            refresh_token: session.refresh_token
          } : undefined
        }
      });

      if (error) throw error;

      if (data?.success) {
        setStatus('success');
        toast.success('CHATR Web linked successfully!');
      } else {
        throw new Error(data?.error || 'Failed to authenticate');
      }
    } catch (err: any) {
      console.error('QR authentication error:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Failed to link device. The QR code may have expired.');
      toast.error(err.message || 'Failed to link device');
    }
  };

  if (!token) return null;

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If user is not logged in on this phone
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border shadow-lg">
          <CardHeader className="text-center pb-2">
            <img src={chatrLogo} alt="Chatr" className="h-14 w-14 mx-auto mb-3" />
            <CardTitle className="text-xl">Sign in to Link CHATR Web</CardTitle>
            <CardDescription>
              You need to be signed in to your CHATR account on this phone to authorize your computer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <Button
              className="w-full h-11"
              onClick={() => navigate(`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)}
            >
              Sign in to CHATR
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => navigate('/')}
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Laptop className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Link CHATR Web</CardTitle>
          <CardDescription>
            A computer browser is requesting access to your CHATR account.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pt-4">
          <div className="bg-muted/50 border border-border/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Authorizing Account:</span>
            </div>
            <p className="font-semibold text-sm text-foreground break-all">
              {currentUser.email || currentUser.phone || currentUser.user_metadata?.username || 'Your Account'}
            </p>
          </div>

          {status === 'prompt' && (
            <div className="space-y-3">
              <Button
                className="w-full h-12 text-base font-medium shadow-md"
                onClick={handleApprove}
              >
                Confirm & Log In Web
              </Button>
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={() => navigate('/')}
              >
                Cancel
              </Button>
            </div>
          )}

          {status === 'authenticating' && (
            <div className="py-6 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Connecting to CHATR Web...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-green-600">Successfully Linked!</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Your computer browser is now logged in. You can close this page on your phone.
              </p>
              <Button
                variant="outline"
                className="mt-4 w-full"
                onClick={() => navigate('/')}
              >
                Go to CHATR Home
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="py-4 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-base font-semibold text-destructive">Linking Failed</h3>
              <p className="text-xs text-muted-foreground">
                {errorMessage}
              </p>
              <Button
                className="mt-2 w-full"
                onClick={handleApprove}
              >
                Try Again
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/')}
              >
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QRLogin;
