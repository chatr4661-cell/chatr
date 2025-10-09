import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PINInput } from '@/components/PINInput';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getDeviceFingerprint, getDeviceName, getDeviceType } from '@/utils/deviceFingerprint';
import { hashPin, isValidPin, logLoginAttempt, isUserLockedOut } from '@/utils/pinSecurity';
import { Chrome, Smartphone, ArrowLeft, Mail } from 'lucide-react';

export const PhoneAuth = () => {
  const { toast } = useToast();
  const [step, setStep] = useState<'phone' | 'otp' | 'pin-setup' | 'pin-login'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const deviceFingerprint = await getDeviceFingerprint();
      const { data: session } = await supabase
        .from('device_sessions')
        .select('*')
        .eq('device_fingerprint', deviceFingerprint)
        .eq('is_active', true)
        .maybeSingle();

      if (session) {
        // Already logged in, redirect
        window.location.href = '/';
      }
    };
    checkExistingSession();
  }, []);

  // Send OTP via SMS
  const handlePhoneSubmit = async () => {
    const trimmed = phoneNumber.trim();
    if (!trimmed || trimmed.length < 10) {
      toast({
        title: 'Invalid Phone',
        description: 'Please enter a valid 10-digit phone number',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    // Format as +91 for India (you can make this dynamic)
    const formattedPhone = `+91${trimmed}`;

    try {
      // Check if user already has PIN set up (quick unlock)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone_number', formattedPhone)
        .maybeSingle();

      if (profile) {
        // Check if device has PIN
        const deviceFingerprint = await getDeviceFingerprint();
        const { data: deviceSession } = await supabase
          .from('device_sessions')
          .select('pin_hash')
          .eq('user_id', profile.id)
          .eq('device_fingerprint', deviceFingerprint)
          .maybeSingle();

        if (deviceSession?.pin_hash) {
          // User has PIN - offer quick unlock
          setUserExists(true);
          setPhoneNumber(formattedPhone);
          setStep('pin-login');
          setLoading(false);
          return;
        }
      }

      // Send OTP via custom edge function
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { phoneNumber: formattedPhone }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to send OTP');

      setPhoneNumber(formattedPhone);
      setUserExists(!!profile);
      setStep('otp');
      
      toast({
        title: 'OTP Sent!',
        description: `Check your SMS at ${formattedPhone}`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
    
    setLoading(false);
  };

  // Verify OTP
  const handleOTPVerify = async () => {
    if (otpCode.length !== 6) {
      toast({
        title: 'Invalid OTP',
        description: 'Please enter the 6-digit code',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Verify OTP via custom edge function
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: { phoneNumber, otpCode }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Invalid OTP');

      const userId = data.userId;

      // Check if user needs PIN setup
      const deviceFingerprint = await getDeviceFingerprint();
      const { data: deviceSession } = await supabase
        .from('device_sessions')
        .select('pin_hash, session_token')
        .eq('user_id', userId)
        .eq('device_fingerprint', deviceFingerprint)
        .maybeSingle();

      if (deviceSession?.pin_hash && deviceSession?.session_token) {
        // Set session and redirect
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: deviceSession.session_token,
          refresh_token: deviceSession.session_token,
        });
        
        if (!sessionError) {
          window.location.href = '/';
          return;
        }
      }

      // Need to create session for PIN setup
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: `${phoneNumber.replace(/\+/g, '')}@chatr.local`,
        password: phoneNumber,
      });

      if (authError) {
        // Create user if doesn't exist
        const { data: newAuthData } = await supabase.auth.signUp({
          email: `${phoneNumber.replace(/\+/g, '')}@chatr.local`,
          password: phoneNumber,
          options: { data: { phone: phoneNumber } }
        });
        
        if (newAuthData?.session) {
          setSessionToken(newAuthData.session.access_token);
        }
      } else if (authData?.session) {
        setSessionToken(authData.session.access_token);
      }

      setStep('pin-setup');
      toast({
        title: 'OTP Verified!',
        description: 'Now create a PIN for quick access',
      });
    } catch (error: any) {
      toast({
        title: 'Verification Failed',
        description: error.message,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  // Setup new PIN after OTP verification
  const handlePINSetup = async (enteredPin: string) => {
    if (!isValidPin(enteredPin)) {
      toast({
        title: 'Invalid PIN',
        description: 'PIN must be 4 digits',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const deviceFingerprint = await getDeviceFingerprint();
      const deviceName = await getDeviceName();
      const deviceType = await getDeviceType();
      const pinHash = await hashPin(enteredPin);

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Create or update device session with PIN
      await supabase.from('device_sessions').upsert({
        user_id: user.id,
        device_fingerprint: deviceFingerprint,
        device_name: deviceName,
        device_type: deviceType,
        session_token: sessionToken!,
        pin_hash: pinHash,
        expires_at: expiresAt.toISOString(),
        quick_login_enabled: true,
      });

      await logLoginAttempt(phoneNumber, deviceFingerprint, 'pin', true, user.id);

      toast({
        title: 'PIN Created!',
        description: 'You can now use quick PIN login',
      });

      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  // Quick PIN login (skip OTP)
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
        .maybeSingle();

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
        .maybeSingle();

      if (!deviceSession || !deviceSession.pin_hash) {
        await logLoginAttempt(phoneNumber, deviceFingerprint, 'pin', false, profile.id);
        toast({
          title: 'Device Not Registered',
          description: 'Use "Verify with OTP" to re-verify your phone',
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
        setLoginPin('');
        setLoading(false);
        return;
      }

      // Success - create session using stored token
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

  // Resend OTP or use Google for recovery
  const handleForgotPIN = async () => {
    setStep('phone');
    toast({
      title: 'Reset Started',
      description: 'Re-enter your phone to verify via OTP',
    });
  };

  return (
    <Card className="w-full max-w-md backdrop-blur-glass bg-gradient-glass border-glass-border shadow-glass rounded-3xl">
      <CardHeader className="text-center space-y-2">
        <CardTitle className="text-2xl">
          {step === 'phone' && 'Welcome to chatr.chat'}
          {step === 'otp' && `Enter OTP`}
          {step === 'pin-setup' && 'Create Your PIN'}
          {step === 'pin-login' && phoneNumber}
        </CardTitle>
        <CardDescription>
          {step === 'phone' && 'Enter your phone number to continue'}
          {step === 'otp' && `Sent to ${phoneNumber}`}
          {step === 'pin-setup' && 'Create a 4-digit PIN for quick access'}
          {step === 'pin-login' && 'Enter your PIN'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Phone Entry */}
        {step === 'phone' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="9876543210"
                value={phoneNumber.replace('+91', '')}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="h-12 text-base"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">10-digit number (India)</p>
            </div>
            <Button
              onClick={handlePhoneSubmit}
              disabled={loading}
              className="w-full h-12 text-base rounded-xl shadow-glow"
            >
              <Smartphone className="w-5 h-5 mr-2" />
              {loading ? 'Sending...' : 'Continue'}
            </Button>
          </>
        )}

        {/* OTP Verification */}
        {step === 'otp' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="otp">6-Digit OTP</Label>
              <Input
                id="otp"
                type="text"
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="h-12 text-base text-center tracking-widest text-2xl"
                maxLength={6}
              />
            </div>
            <Button
              onClick={handleOTPVerify}
              disabled={loading || otpCode.length !== 6}
              className="w-full h-12 text-base rounded-xl shadow-glow"
            >
              <Mail className="w-5 h-5 mr-2" />
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>
            <Button
              onClick={() => setStep('phone')}
              variant="ghost"
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Change Number
            </Button>
          </>
        )}

        {/* PIN Setup (after OTP) */}
        {step === 'pin-setup' && (
          <>
            <PINInput
              key="setup-pin"
              length={4}
              onComplete={handlePINSetup}
              className="justify-center"
            />
            <p className="text-sm text-center text-muted-foreground">
              You'll use this PIN for quick access on this device
            </p>
          </>
        )}

        {/* PIN Login (quick unlock) */}
        {step === 'pin-login' && (
          <>
            <PINInput
              key="login-pin"
              length={4}
              onComplete={handlePINLogin}
              className="justify-center"
            />
            <div className="flex flex-col gap-2">
              <Button
                onClick={handleForgotPIN}
                variant="outline"
                className="w-full h-10 text-sm rounded-xl"
              >
                Verify with OTP Instead
              </Button>
              <Button
                onClick={() => setStep('phone')}
                variant="ghost"
                className="w-full h-10 text-sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Change Number
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
