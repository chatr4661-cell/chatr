import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Phone, ArrowLeft } from 'lucide-react';
import { PINInput } from './PINInput';
import { CountryCodeSelector } from './CountryCodeSelector';
import { normalizePhoneNumber } from '@/utils/phoneHashUtil';

type AuthStep = 'phone' | 'pin' | 'confirm-pin';

export const PhoneAuth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = React.useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [countryCode, setCountryCode] = React.useState('+91');
  const [loading, setLoading] = React.useState(false);
  const [isNewUser, setIsNewUser] = React.useState(false);
  const [firstPin, setFirstPin] = React.useState('');

  // Check for existing session on mount
  React.useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/');
      }
    };
    checkSession();
  }, [navigate]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      toast({
        title: "Phone Required",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber, countryCode);
      console.log('[AUTH] Checking phone:', normalizedPhone);
      
      // Check if user exists in profiles
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone_number', normalizedPhone)
        .maybeSingle();

      console.log('[AUTH] Profile check:', { existingProfile, profileError });

      setIsNewUser(!existingProfile);
      setStep('pin');
      
      toast({
        title: existingProfile ? "Welcome Back" : "New User",
        description: existingProfile 
          ? "Please enter your PIN to continue" 
          : "Let's create a PIN for your account",
      });
    } catch (error: any) {
      console.error('[AUTH] Phone verification error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to verify phone number",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePinComplete = async (pin: string) => {
    console.log('[AUTH] PIN complete:', { pin, isNewUser, phoneNumber, countryCode });
    if (isNewUser) {
      // For new users, go to confirm PIN step
      setFirstPin(pin);
      setStep('confirm-pin');
      toast({
        title: "Confirm Your PIN",
        description: "Please enter your PIN again to confirm",
      });
    } else {
      // For existing users, login directly
      await handleLoginPin(pin);
    }
  };

  const handleConfirmPinComplete = async (pin: string) => {
    if (pin !== firstPin) {
      toast({
        title: "PINs Don't Match",
        description: "The PINs you entered don't match. Please try again.",
        variant: "destructive",
      });
      setStep('pin');
      setFirstPin('');
      return;
    }
    await handleCreatePin(pin);
  };

  const handleCreatePin = async (pin: string) => {
    setLoading(true);
    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber, countryCode);
      const email = `${normalizedPhone.replace(/\+/g, '')}@chatr.local`;

      // Create new user with phone as email and PIN as password
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: pin,
        options: {
          data: {
            phone_number: normalizedPhone,
            username: phoneNumber,
          }
        }
      });

      if (signUpError) {
        // If user already exists, try to login instead
        if (signUpError.message?.toLowerCase().includes('already registered') || 
            signUpError.message?.toLowerCase().includes('already exists')) {
          console.log('[AUTH] User exists, attempting login instead');
          toast({
            title: "Logging In",
            description: "Account found, signing you in...",
          });
          // Attempt to login with the PIN they entered
          await handleLoginPin(pin);
          return;
        }
        throw signUpError;
      }

      if (!authData.user) throw new Error('Failed to create user');

      toast({
        title: "Account Created",
        description: "Welcome to Chatr!",
      });

      navigate('/');
    } catch (error: any) {
      console.error('PIN creation error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create PIN",
        variant: "destructive",
      });
      setStep('phone');
      setFirstPin('');
      setPhoneNumber('');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginPin = async (pin: string) => {
    setLoading(true);
    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber, countryCode);
      const email = `${normalizedPhone.replace(/\+/g, '')}@chatr.local`;

      console.log('[AUTH] Login attempt:', { normalizedPhone, email, pin });

      // Sign in with phone as email and PIN as password
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: pin,
      });

      console.log('[AUTH] Sign in result:', { data, error: signInError });

      if (signInError) {
        console.error('[AUTH] Sign in error:', signInError);
        toast({
          title: "Invalid PIN",
          description: "The PIN you entered is incorrect. Please try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Welcome Back",
        description: "You've been signed in successfully",
      });

      navigate('/');
    } catch (error: any) {
      console.error('[AUTH] Login error:', error);
      toast({
        title: "Login Failed",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (step === 'confirm-pin') {
      setStep('pin');
      setFirstPin('');
    } else {
      setStep('phone');
      setPhoneNumber('');
      setIsNewUser(false);
      setFirstPin('');
    }
  };

  return (
    <Card className="w-full glass-card border-0">
      <CardHeader className="space-y-2 pb-4">
        <CardTitle className="text-2xl font-bold">
          {step === 'phone' 
            ? 'Welcome' 
            : step === 'confirm-pin'
            ? 'Confirm PIN'
            : isNewUser 
            ? 'Create PIN' 
            : 'Enter PIN'}
        </CardTitle>
        <CardDescription className="text-sm">
          {step === 'phone' 
            ? 'Enter your phone number to continue' 
            : step === 'confirm-pin'
            ? 'Re-enter your 6-digit PIN to confirm'
            : isNewUser 
            ? 'Choose a secure 6-digit PIN for your account'
            : 'Enter your 6-digit PIN to sign in'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Phone Number Input */}
        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-5">
            <div className="space-y-3">
              <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
              <div className="flex gap-3">
                <CountryCodeSelector
                  value={countryCode}
                  onChange={setCountryCode}
                />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Your phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 h-12 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 rounded-xl transition-all"
                  required
                  autoFocus
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full h-12 bg-gradient-hero hover:opacity-90 text-primary-foreground font-medium rounded-xl shadow-glow"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-5 w-5" />
                  Continue
                </>
              )}
            </Button>
          </form>
        )}

        {/* PIN Input (Create or Login) */}
        {step === 'pin' && (
          <div className="space-y-5">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mb-2 hover:bg-muted/50 rounded-lg"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="space-y-4">
              <div className="text-center">
                <Label className="text-sm font-medium">
                  {isNewUser ? 'Create 6-Digit PIN' : 'Enter Your PIN'}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {countryCode} {phoneNumber}
                </p>
              </div>
              <PINInput
                key="initial-pin"
                length={6}
                onComplete={handlePinComplete}
                disabled={loading}
              />
            </div>
            {loading && (
              <div className="flex flex-col items-center justify-center gap-2 py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  {isNewUser ? 'Creating your account...' : 'Signing you in...'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Confirm PIN Input (New Users Only) */}
        {step === 'confirm-pin' && (
          <div className="space-y-5">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mb-2 hover:bg-muted/50 rounded-lg"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="space-y-4">
              <div className="text-center">
                <Label className="text-sm font-medium">Confirm 6-Digit PIN</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {countryCode} {phoneNumber}
                </p>
              </div>
              <PINInput
                key="confirm-pin"
                length={6}
                onComplete={handleConfirmPinComplete}
                disabled={loading}
              />
            </div>
            {loading && (
              <div className="flex flex-col items-center justify-center gap-2 py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Creating your account...</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};