import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PINInput } from '@/components/PINInput';
import { getDeviceFingerprint, getDeviceName, getDeviceType } from '@/utils/deviceFingerprint';
import { hashPin, verifyPin, isUserLockedOut, logLoginAttempt, isValidPin } from '@/utils/pinSecurity';
import { Smartphone, Lock, Shield, Chrome, ArrowLeft } from 'lucide-react';
import logo from '@/assets/chatr-logo.png';

type AuthStep = 'check-device' | 'google-signin' | 'phone-input' | 'pin-entry' | 'pin-setup';

const Auth = () => {
  const [step, setStep] = useState<AuthStep>('check-device');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');
  const [recognizedDevice, setRecognizedDevice] = useState(false);
  const [pinError, setPinError] = useState(false);
  const [lockoutTime, setLockoutTime] = useState<number>(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check device on mount
  useEffect(() => {
    checkDevice();
    
    // Check for existing session
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

  // Check if this device is recognized
  const checkDevice = async () => {
    setLoading(true);
    try {
      const fingerprint = await getDeviceFingerprint();
      setDeviceFingerprint(fingerprint);

      // Check if device exists in our database
      const { data: session } = await supabase
        .from('device_sessions')
        .select('*, profiles!inner(*)')
        .eq('device_fingerprint', fingerprint)
        .eq('is_active', true)
        .single();

      if (session && session.profiles) {
        // Device recognized - offer quick login
        setRecognizedDevice(true);
        setPhone(session.profiles.phone_number || '');
        setStep('pin-entry');
      } else {
        // New device - require Google Sign-In
        setStep('google-signin');
      }
    } catch (error) {
      console.error('Device check error:', error);
      setStep('google-signin');
    } finally {
      setLoading(false);
    }
  };

  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  // Handle phone number submission
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 10) {
      toast({
        title: 'Invalid Phone',
        description: 'Please enter a valid phone number',
        variant: 'destructive',
      });
      return;
    }

    // Check if user exists with this phone
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone_number', phone)
      .single();

    if (profile) {
      // Existing user - go to PIN entry
      setStep('pin-entry');
    } else {
      // New user - go to PIN setup
      setStep('pin-setup');
    }
  };

  // Handle PIN entry for login
  const handlePINLogin = async (enteredPin: string) => {
    setPinError(false);
    setLoading(true);

    try {
      // Check lockout status
      const lockout = await isUserLockedOut(phone, deviceFingerprint);
      if (lockout.locked) {
        const minutes = Math.ceil((lockout.remainingTime || 0) / 60000);
        toast({
          title: 'Account Locked',
          description: `Too many failed attempts. Try again in ${minutes} minutes.`,
          variant: 'destructive',
        });
        setLockoutTime(lockout.remainingTime || 0);
        return;
      }

      // Get device session
      const { data: session } = await supabase
        .from('device_sessions')
        .select('*, profiles!inner(*)')
        .eq('device_fingerprint', deviceFingerprint)
        .eq('is_active', true)
        .single();

      if (!session) {
        throw new Error('Device session not found');
      }

      // Verify PIN
      const isValid = await verifyPin(enteredPin, session.pin_hash);

      if (!isValid) {
        setPinError(true);
        await logLoginAttempt(phone, deviceFingerprint, 'pin', false, session.user_id);
        toast({
          title: 'Incorrect PIN',
          description: 'Please try again',
          variant: 'destructive',
        });
        (window as any).resetPIN?.();
        return;
      }

      // Successful login
      await logLoginAttempt(phone, deviceFingerprint, 'pin', true, session.user_id);

      // Sign in with Supabase
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: session.profiles.email || `${phone}@chatr.app`,
        password: session.session_token, // Use session token as password
      });

      if (error) {
        // If password login fails, use Google as fallback
        toast({
          title: 'Session Expired',
          description: 'Please sign in with Google again',
        });
        setStep('google-signin');
        return;
      }

      toast({
        title: 'Welcome back!',
        description: 'Logged in successfully',
      });
    } catch (error: any) {
      console.error('PIN login error:', error);
      toast({
        title: 'Login Failed',
        description: 'Please try signing in with Google',
        variant: 'destructive',
      });
      setStep('google-signin');
    } finally {
      setLoading(false);
    }
  };

  // Handle PIN setup for new users
  const handlePINSetup = async (newPin: string) => {
    if (!isValidPin(newPin)) {
      toast({
        title: 'Invalid PIN',
        description: 'PIN must be 6 digits',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('No active session');
      }

      const userId = session.data.session.user.id;
      const pinHash = await hashPin(newPin);

      // Update profile with phone number
      await supabase
        .from('profiles')
        .update({
          phone_number: phone,
          pin_setup_completed: true,
          preferred_auth_method: 'pin'
        })
        .eq('id', userId);

      // Create device session
      await supabase.from('device_sessions').insert({
        user_id: userId,
        device_fingerprint: deviceFingerprint,
        device_name: await getDeviceName(),
        device_type: await getDeviceType(),
        pin_hash: pinHash,
        quick_login_enabled: true,
        session_token: session.data.session.access_token,
        is_active: true,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
      });

      toast({
        title: 'Setup Complete!',
        description: 'Your account is ready',
      });

      navigate('/');
    } catch (error: any) {
      console.error('PIN setup error:', error);
      toast({
        title: 'Setup Failed',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'check-device':
        return (
          <div className="space-y-6 text-center py-8">
            <div className="animate-spin mx-auto">
              <Shield className="w-12 h-12 text-primary" />
            </div>
            <p className="text-muted-foreground">Checking your device...</p>
          </div>
        );

      case 'google-signin':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Chrome className="w-16 h-16 mx-auto text-primary" />
              <h2 className="text-xl font-semibold">Sign in with Google</h2>
              <p className="text-sm text-muted-foreground">
                {recognizedDevice 
                  ? 'Please verify your identity to continue'
                  : 'Sign in once to set up your account'}
              </p>
            </div>

            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full h-12 text-base rounded-xl shadow-glow"
            >
              <Chrome className="w-5 h-5 mr-2" />
              Continue with Google
            </Button>

            {recognizedDevice && (
              <Button
                variant="ghost"
                onClick={() => setStep('pin-entry')}
                className="w-full rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to PIN Login
              </Button>
            )}
          </div>
        );

      case 'phone-input':
        return (
          <form onSubmit={handlePhoneSubmit} className="space-y-6">
            <div className="text-center space-y-2">
              <Smartphone className="w-16 h-16 mx-auto text-primary" />
              <h2 className="text-xl font-semibold">Enter Your Phone Number</h2>
              <p className="text-sm text-muted-foreground">
                This will be your primary identifier
              </p>
            </div>

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

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base rounded-xl shadow-glow"
            >
              Continue
            </Button>
          </form>
        );

      case 'pin-entry':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Lock className="w-16 h-16 mx-auto text-primary" />
              <h2 className="text-xl font-semibold">Enter Your PIN</h2>
              <p className="text-sm text-muted-foreground">
                {phone || 'Welcome back!'}
              </p>
            </div>

            <PINInput
              onComplete={handlePINLogin}
              disabled={loading}
              error={pinError}
            />

            {lockoutTime > 0 && (
              <p className="text-sm text-destructive text-center">
                Too many attempts. Locked for {Math.ceil(lockoutTime / 60000)} minutes.
              </p>
            )}

            <Button
              variant="ghost"
              onClick={() => setStep('google-signin')}
              className="w-full rounded-xl"
              disabled={loading}
            >
              Sign in with Google instead
            </Button>
          </div>
        );

      case 'pin-setup':
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Lock className="w-16 h-16 mx-auto text-primary" />
              <h2 className="text-xl font-semibold">Create Your PIN</h2>
              <p className="text-sm text-muted-foreground">
                Choose a 6-digit PIN for quick login
              </p>
            </div>

            <PINInput
              onComplete={handlePINSetup}
              disabled={loading}
            />

            <div className="bg-muted/50 rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium">Security Tips:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Don't use obvious PINs (123456, 000000)</li>
                <li>• Don't share your PIN with anyone</li>
                <li>• You can always sign in with Google</li>
              </ul>
            </div>
          </div>
        );
    }
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
            Secure, phone-based authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          {renderStep()}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;

