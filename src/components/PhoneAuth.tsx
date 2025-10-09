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
import { Chrome, Smartphone, ArrowLeft } from 'lucide-react';
import { hashPhoneNumber } from '@/utils/phoneHashUtil';

export const PhoneAuth = () => {
  const { toast } = useToast();
  const [step, setStep] = useState<'phone' | 'pin-options'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [registerPin, setRegisterPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [userExists, setUserExists] = useState(false);

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

    // Check if user exists by phone number
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    setUserExists(!!profile);
    setStep('pin-options');
    setLoading(false);
  };

  const handleLoginPINComplete = async (enteredPin: string) => {
    setLoginPin(enteredPin);
    await handlePINLogin(enteredPin);
  };

  const handleRegisterPINComplete = async (enteredPin: string) => {
    if (!isValidPin(enteredPin)) {
      toast({
        title: 'Invalid PIN',
        description: 'PIN must be 4 digits',
        variant: 'destructive',
      });
      return;
    }
    setRegisterPin(enteredPin);
  };

  const handleRegistration = async () => {
    if (!registerPin) {
      toast({
        title: 'Enter PIN',
        description: 'Please create a 4-digit PIN',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Double-check if user already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone_number', phoneNumber)
        .maybeSingle();

      if (existingProfile) {
        toast({
          title: 'Account Exists',
          description: 'Please use the login section above',
          variant: 'destructive',
        });
        setUserExists(true);
        setLoading(false);
        return;
      }

      const deviceFingerprint = await getDeviceFingerprint();
      const deviceName = await getDeviceName();
      const deviceType = await getDeviceType();

      // Create user with dummy email (phone as identifier)
      const dummyEmail = `${phoneNumber.replace(/[^0-9]/g, '')}@chatr.local`;
      const randomPassword = crypto.randomUUID();

      // Hash phone number before signup
      const phoneHash = await hashPhoneNumber(phoneNumber);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: dummyEmail,
        password: randomPassword,
        options: {
          data: {
            phone_number: phoneNumber,
            phone_hash: phoneHash,
            username: `User_${phoneNumber.slice(-4)}`,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Hash PIN and create device session
      const pinHash = await hashPin(registerPin);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days

      await supabase.from('device_sessions').insert({
        user_id: authData.user.id,
        device_fingerprint: deviceFingerprint,
        device_name: deviceName,
        device_type: deviceType,
        session_token: authData.session!.access_token,
        pin_hash: pinHash,
        expires_at: expiresAt.toISOString(),
        quick_login_enabled: true,
      });

      await logLoginAttempt(phoneNumber, deviceFingerprint, 'pin', true, authData.user.id);

      toast({
        title: 'Registration Complete!',
        description: 'Your account has been created',
      });

      // Auto sign in
      window.location.href = '/';
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

      console.log('Looking for profile with phone:', phoneNumber);
      
      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone_number', phoneNumber)
        .maybeSingle();

      console.log('Profile found:', profile, 'Error:', profileError);

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
          title: 'Login Failed',
          description: 'Device not registered. Use "Forgot PIN?" to recover',
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
        setLoginPin(''); // Reset for retry
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
          {step === 'phone' ? 'Welcome to chatr.chat' : `${phoneNumber}`}
        </CardTitle>
        <CardDescription>
          {step === 'phone' ? 'Enter your phone number to continue' : 'Choose your action'}
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

        {step === 'pin-options' && (
          <>
            {/* Login Section - Always show */}
            <div className="space-y-4 pb-6 border-b border-border">
              <div className="text-center">
                <h3 className="font-semibold text-lg">Already Registered?</h3>
                <p className="text-sm text-muted-foreground">Enter your PIN to log in</p>
              </div>
              <PINInput
                key="login-pin"
                length={4}
                onComplete={handleLoginPINComplete}
                className="justify-center"
              />
              <Button
                onClick={handleGoogleSignIn}
                variant="outline"
                className="w-full h-10 text-sm rounded-xl"
              >
                <Chrome className="w-4 h-4 mr-2" />
                Forgot PIN? Sign in with Google
              </Button>
            </div>

            {/* Register Section - Only show if user doesn't exist */}
            {!userExists && (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-semibold text-lg">New User?</h3>
                  <p className="text-sm text-muted-foreground">Create a 4-digit PIN for quick access</p>
                </div>
                <PINInput
                  key="register-pin"
                  length={4}
                  onComplete={handleRegisterPINComplete}
                  className="justify-center"
                />
                <Button
                  onClick={handleRegistration}
                  disabled={loading || !registerPin}
                  className="w-full h-12 text-base rounded-xl shadow-glow"
                >
                  <Smartphone className="w-5 h-5 mr-2" />
                  Create Account
                </Button>
              </div>
            )}

            {/* Back button */}
            <Button
              onClick={() => {
                setStep('phone');
                setLoginPin('');
                setRegisterPin('');
                setUserExists(false);
              }}
              variant="ghost"
              className="w-full h-10 text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Change Phone Number
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};
