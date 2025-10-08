import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PINInput } from '@/components/PINInput';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceFingerprint, getDeviceName, getDeviceType } from '@/utils/deviceFingerprint';
import { hashPin, isValidPin, logLoginAttempt, isUserLockedOut } from '@/utils/pinSecurity';
import { Chrome, Smartphone } from 'lucide-react';

export const PhoneAuth = () => {
  const { toast } = useToast();
  const [step, setStep] = useState<'phone' | 'pin' | 'login'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for existing session on mount
  useState(() => {
    const checkExistingSession = async () => {
      const deviceFingerprint = await getDeviceFingerprint();
      const { data: session } = await supabase
        .from('device_sessions')
        .select('*')
        .eq('device_fingerprint', deviceFingerprint)
        .eq('is_active', true)
        .single();

      if (session) {
        setStep('login');
      }
    };
    checkExistingSession();
  });

  const handlePhoneSubmit = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: 'Invalid Phone',
        description: 'Please enter a valid phone number',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    const deviceFingerprint = await getDeviceFingerprint();

    // Check if user exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (profile) {
      // Check if this device is registered
      const { data: deviceSession } = await supabase
        .from('device_sessions')
        .select('*')
        .eq('user_id', profile.id)
        .eq('device_fingerprint', deviceFingerprint)
        .single();

      if (deviceSession) {
        setStep('login');
      } else {
        toast({
          title: 'New Device Detected',
          description: 'Please sign in with Google to verify your identity',
        });
        await handleGoogleSignIn();
      }
    } else {
      setStep('pin');
    }
    setLoading(false);
  };

  const handlePINComplete = async (enteredPin: string) => {
    if (!isValidPin(enteredPin)) {
      toast({
        title: 'Invalid PIN',
        description: 'PIN must be 4-6 digits',
        variant: 'destructive',
      });
      return;
    }

    setPin(enteredPin);
  };

  const handleRegistration = async () => {
    if (!pin) return;

    setLoading(true);
    try {
      // First, sign in with Google for backup
      const { data: authData, error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: {
            phone_number: phoneNumber,
            pin: pin,
            registration: 'true',
          },
        },
      });

      if (authError) throw authError;
    } catch (error: any) {
      toast({
        title: 'Registration Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handlePINLogin = async (enteredPin: string) => {
    setLoading(true);
    try {
      const deviceFingerprint = await getDeviceFingerprint();

      // Check lockout
      const lockout = await isUserLockedOut(phoneNumber, deviceFingerprint);
      if (lockout.locked) {
        toast({
          title: 'Too Many Attempts',
          description: `Please try again in ${Math.ceil(lockout.remainingTime! / 60000)} minutes`,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      if (!profile) {
        await logLoginAttempt(phoneNumber, deviceFingerprint, 'pin', false);
        toast({
          title: 'Login Failed',
          description: 'Invalid phone number or PIN',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Get device session
      const { data: deviceSession } = await supabase
        .from('device_sessions')
        .select('*')
        .eq('user_id', profile.id)
        .eq('device_fingerprint', deviceFingerprint)
        .single();

      if (!deviceSession || !deviceSession.pin_hash) {
        await logLoginAttempt(phoneNumber, deviceFingerprint, 'pin', false, profile.id);
        toast({
          title: 'Login Failed',
          description: 'Device not registered',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Verify PIN
      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.compare(enteredPin, deviceSession.pin_hash);

      if (!isValid) {
        await logLoginAttempt(phoneNumber, deviceFingerprint, 'pin', false, profile.id);
        toast({
          title: 'Login Failed',
          description: 'Invalid PIN',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Success - create Supabase session using the stored session token
      const { error: signInError } = await supabase.auth.setSession({
        access_token: deviceSession.session_token,
        refresh_token: deviceSession.session_token,
      });

      if (signInError) throw signInError;

      await logLoginAttempt(phoneNumber, deviceFingerprint, 'pin', true, profile.id);
      
      // Update last active
      await supabase
        .from('device_sessions')
        .update({ last_active: new Date().toISOString() })
        .eq('id', deviceSession.id);

      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: 'Login Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-md backdrop-blur-glass bg-gradient-glass border-glass-border shadow-glass rounded-3xl">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl">
          {step === 'phone' && 'Welcome to chatr.chat'}
          {step === 'pin' && 'Create Your PIN'}
          {step === 'login' && 'Welcome Back'}
        </CardTitle>
        <CardDescription>
          {step === 'phone' && 'Enter your phone number to continue'}
          {step === 'pin' && 'Set up a 4-6 digit PIN for quick access'}
          {step === 'login' && 'Enter your PIN to sign in'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === 'phone' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+1 234 567 8900"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <Button
              onClick={handlePhoneSubmit}
              disabled={loading}
              className="w-full h-12 text-base rounded-xl shadow-glow"
            >
              <Smartphone className="w-5 h-5 mr-2" />
              Continue
            </Button>
          </>
        )}

        {step === 'pin' && (
          <>
            <div className="space-y-4">
              <PINInput
                length={6}
                onComplete={handlePINComplete}
                className="justify-center"
              />
              <p className="text-sm text-center text-muted-foreground">
                Choose a 4-6 digit PIN you'll remember
              </p>
            </div>
            <Button
              onClick={handleRegistration}
              disabled={loading || !pin}
              className="w-full h-12 text-base rounded-xl shadow-glow"
            >
              <Chrome className="w-5 h-5 mr-2" />
              Continue with Google
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Google sign-in is used once for account recovery
            </p>
          </>
        )}

        {step === 'login' && (
          <>
            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                {phoneNumber || 'Enter your PIN'}
              </p>
              <PINInput
                length={6}
                onComplete={handlePINLogin}
                className="justify-center"
              />
            </div>
            <Button
              onClick={handleGoogleSignIn}
              variant="outline"
              className="w-full h-12 text-base rounded-xl"
            >
              <Chrome className="w-5 h-5 mr-2" />
              Sign in with Google Instead
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
