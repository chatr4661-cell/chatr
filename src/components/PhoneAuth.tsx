import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Phone, ArrowLeft, Chrome } from 'lucide-react';
import { PINInput } from './PINInput';
import { getDeviceFingerprint, getDeviceName, getDeviceType } from '@/utils/deviceFingerprint';
import { hashPin, verifyPin, isUserLockedOut, logLoginAttempt, clearFailedAttempts, isValidPin } from '@/utils/pinSecurity';
import { normalizePhoneNumber, hashPhoneNumber } from '@/utils/phoneHashUtil';

type AuthStep = 'phone' | 'create-pin' | 'confirm-pin' | 'login-pin' | 'forgot-pin';

export const PhoneAuth = () => {
  const { toast } = useToast();
  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        const deviceFingerprint = await getDeviceFingerprint();
        
        const { data: session } = await supabase
          .from('device_sessions')
          .select('*')
          .eq('device_fingerprint', deviceFingerprint)
          .eq('is_active', true)
          .gt('expires_at', new Date().toISOString())
          .maybeSingle();

        if (session) {
          window.location.href = '/';
        }
      } catch (error) {
        console.error('Error checking session:', error);
      }
    };

    checkExistingSession();
  }, []);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!phoneNumber || phoneNumber.length < 10) {
        toast({
          title: 'Invalid Phone Number',
          description: 'Please enter a valid 10-digit phone number',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Normalize to E.164 format (+91)
      const normalized = normalizePhoneNumber(phoneNumber);
      setPhoneNumber(normalized);

      // Check if user exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, phone_number')
        .eq('phone_number', normalized)
        .maybeSingle();

      if (existingProfile) {
        setUserExists(true);
        setUserId(existingProfile.id);
        setStep('login-pin');
      } else {
        setUserExists(false);
        setStep('create-pin');
      }
    } catch (error: any) {
      console.error('Error checking phone:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify phone number',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePinComplete = (enteredPin: string) => {
    if (!isValidPin(enteredPin)) {
      toast({
        title: 'Invalid PIN',
        description: 'PIN must be exactly 4 digits',
        variant: 'destructive'
      });
      return;
    }
    setPin(enteredPin);
    setStep('confirm-pin');
  };

  const handleConfirmPinComplete = async (enteredConfirmPin: string) => {
    if (pin !== enteredConfirmPin) {
      toast({
        title: 'PINs Do Not Match',
        description: 'Please try again',
        variant: 'destructive'
      });
      setConfirmPin('');
      setStep('create-pin');
      setPin('');
      return;
    }

    setConfirmPin(enteredConfirmPin);
    await handleRegistration(enteredConfirmPin);
  };

  const handleRegistration = async (userPin: string) => {
    setLoading(true);

    try {
      const deviceFingerprint = await getDeviceFingerprint();
      const deviceName = await getDeviceName();
      const deviceType = await getDeviceType();

      // Create dummy email for auth
      const dummyEmail = `${phoneNumber.replace(/\+/g, '')}@chatr.local`;
      const dummyPassword = crypto.randomUUID();

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: dummyEmail,
        password: dummyPassword,
        options: {
          data: {
            phone_number: phoneNumber,
            username: `User_${phoneNumber.slice(-4)}`
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Hash PIN and phone
      const pinHash = await hashPin(userPin);
      const phoneHash = await hashPhoneNumber(phoneNumber);

      // Update profile with phone hash
      await supabase
        .from('profiles')
        .update({ phone_hash: phoneHash })
        .eq('id', authData.user.id);

      // Create device session
      const sessionToken = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      await supabase
        .from('device_sessions')
        .insert({
          user_id: authData.user.id,
          device_fingerprint: deviceFingerprint,
          device_name: deviceName,
          device_type: deviceType,
          session_token: sessionToken,
          pin_hash: pinHash,
          expires_at: expiresAt.toISOString(),
          is_active: true
        });

      await logLoginAttempt(phoneNumber, deviceFingerprint, 'pin', true, authData.user.id);
      await clearFailedAttempts(phoneNumber, deviceFingerprint);

      toast({
        title: 'Account Created!',
        description: 'Welcome to chatr.chat'
      });

      window.location.href = '/';
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to create account',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoginPinComplete = async (enteredPin: string) => {
    if (!isValidPin(enteredPin)) {
      toast({
        title: 'Invalid PIN',
        description: 'PIN must be exactly 4 digits',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const deviceFingerprint = await getDeviceFingerprint();

      // Check lockout
      const lockoutStatus = await isUserLockedOut(phoneNumber, deviceFingerprint);
      if (lockoutStatus.locked) {
        const remainingMinutes = Math.ceil((lockoutStatus.remainingTime || 0) / 60000);
        toast({
          title: 'Account Locked',
          description: `Too many failed attempts. Try again in ${remainingMinutes} minutes.`,
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Get device session
      const { data: session } = await supabase
        .from('device_sessions')
        .select('*')
        .eq('user_id', userId!)
        .eq('device_fingerprint', deviceFingerprint)
        .eq('is_active', true)
        .maybeSingle();

      if (!session || !session.pin_hash) {
        toast({
          title: 'Device Not Recognized',
          description: 'Use "Forgot PIN?" to recover your account',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Verify PIN
      const pinValid = await verifyPin(enteredPin, session.pin_hash);

      if (!pinValid) {
        await logLoginAttempt(phoneNumber, deviceFingerprint, 'pin', false, userId!);
        toast({
          title: 'Incorrect PIN',
          description: 'Please try again',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Update session
      await supabase
        .from('device_sessions')
        .update({
          last_active: new Date().toISOString(),
          is_active: true
        })
        .eq('id', session.id);

      await logLoginAttempt(phoneNumber, deviceFingerprint, 'pin', true, userId!);
      await clearFailedAttempts(phoneNumber, deviceFingerprint);

      // Set Supabase auth session
      const { error: authError } = await supabase.auth.setSession({
        access_token: session.session_token,
        refresh_token: session.session_token
      });

      if (authError) {
        console.error('Auth error:', authError);
      }

      toast({
        title: 'Welcome Back!',
        description: 'Logged in successfully'
      });

      window.location.href = '/';
    } catch (error: any) {
      console.error('Login error:', error);
      toast({
        title: 'Login Failed',
        description: error.message || 'Failed to log in',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) throw error;
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast({
        title: 'Sign In Failed',
        description: error.message || 'Failed to sign in with Google',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const handleForgotPin = () => {
    setStep('forgot-pin');
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setPhoneNumber('');
    setPin('');
    setConfirmPin('');
    setUserExists(false);
  };

  return (
    <Card className="w-full backdrop-blur-glass bg-gradient-glass border-glass-border shadow-glass">
      <CardHeader>
        <CardTitle>
          {step === 'phone' && 'Welcome to chatr.chat'}
          {step === 'create-pin' && 'Create Your PIN'}
          {step === 'confirm-pin' && 'Confirm Your PIN'}
          {step === 'login-pin' && 'Enter Your PIN'}
          {step === 'forgot-pin' && 'Recover Account'}
        </CardTitle>
        <CardDescription>
          {step === 'phone' && 'Enter your phone number to continue'}
          {step === 'create-pin' && 'Choose a 4-digit PIN for this device'}
          {step === 'confirm-pin' && 'Enter your PIN again to confirm'}
          {step === 'login-pin' && 'Enter your PIN to sign in'}
          {step === 'forgot-pin' && 'Use Google to recover your account'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phone Number Input */}
        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex gap-2">
                <div className="flex items-center justify-center px-3 border rounded-md bg-muted text-muted-foreground">
                  +91
                </div>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="9876543210"
                  value={phoneNumber.replace(/^\+91/, '')}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setPhoneNumber(value);
                  }}
                  disabled={loading}
                  className="flex-1"
                  maxLength={10}
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter 10-digit phone number without country code
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={loading || phoneNumber.length < 10}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  Continue
                </>
              )}
            </Button>
          </form>
        )}

        {/* Create PIN */}
        {step === 'create-pin' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToPhone}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <span className="text-sm text-muted-foreground">{phoneNumber}</span>
            </div>
            <div className="space-y-2">
              <Label>Enter 4-Digit PIN</Label>
              <PINInput
                length={4}
                onComplete={handleCreatePinComplete}
                disabled={loading}
              />
            </div>
          </div>
        )}

        {/* Confirm PIN */}
        {step === 'confirm-pin' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep('create-pin');
                  setPin('');
                }}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <span className="text-sm text-muted-foreground">{phoneNumber}</span>
            </div>
            <div className="space-y-2">
              <Label>Confirm Your PIN</Label>
              <PINInput
                length={4}
                onComplete={handleConfirmPinComplete}
                disabled={loading}
              />
            </div>
          </div>
        )}

        {/* Login PIN */}
        {step === 'login-pin' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToPhone}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
              <span className="text-sm text-muted-foreground">{phoneNumber}</span>
            </div>
            <div className="space-y-2">
              <Label>Enter Your PIN</Label>
              <PINInput
                length={4}
                onComplete={handleLoginPinComplete}
                disabled={loading}
              />
            </div>
            <Button
              variant="link"
              className="w-full text-sm"
              onClick={handleForgotPin}
              disabled={loading}
            >
              Forgot PIN?
            </Button>
          </div>
        )}

        {/* Forgot PIN - Google Recovery */}
        {step === 'forgot-pin' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setStep('login-pin')}
                disabled={loading}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            </div>
            <div className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Recover your account using Google Sign-In
              </p>
              <Button
                onClick={handleGoogleSignIn}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Chrome className="mr-2 h-4 w-4" />
                    Continue with Google
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
