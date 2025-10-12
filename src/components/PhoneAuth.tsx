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

type AuthStep = 'phone' | 'pin';

export const PhoneAuth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = React.useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = React.useState('');
  const [countryCode, setCountryCode] = React.useState('+91');
  const [loading, setLoading] = React.useState(false);
  const [isNewUser, setIsNewUser] = React.useState(false);

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
      await handleCreatePin(pin);
    } else {
      await handleLoginPin(pin);
    }
  };

  const handleCreatePin = async (pin: string) => {
    setLoading(true);
    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber, countryCode);
      const email = `${normalizedPhone.replace(/\+/g, '')}@chatr.local`;

      // Check again if user exists (safety check)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone_number', normalizedPhone)
        .maybeSingle();

      if (existingProfile) {
        toast({
          title: "Account Exists",
          description: "This number is already registered. Please login instead.",
          variant: "destructive",
        });
        setIsNewUser(false);
        setLoading(false);
        return;
      }

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
        // Check if it's a "user already exists" error
        if (signUpError.message?.toLowerCase().includes('already registered') || 
            signUpError.message?.toLowerCase().includes('already exists')) {
          toast({
            title: "Account Exists",
            description: "This number is already registered. Redirecting to login...",
            variant: "destructive",
          });
          setIsNewUser(false);
          setLoading(false);
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
    setStep('phone');
    setPhoneNumber('');
    setIsNewUser(false);
  };

  return (
    <Card className="w-full backdrop-blur-glass bg-gradient-glass border-glass-border shadow-glass">
      <CardHeader>
        <CardTitle>
          {step === 'phone' ? 'Welcome to chatr.chat' : isNewUser ? 'Create Your PIN' : 'Enter Your PIN'}
        </CardTitle>
        <CardDescription>
          {step === 'phone' 
            ? 'Enter your phone number to get started' 
            : isNewUser 
            ? 'Choose a 6-digit PIN for your new account'
            : 'Enter your 6-digit PIN to continue'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phone Number Input */}
        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="flex gap-2">
                <CountryCodeSelector
                  value={countryCode}
                  onChange={setCountryCode}
                />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 bg-white/50 dark:bg-gray-900/50"
                  required
                  autoFocus
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full"
              disabled={loading}
            >
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

        {/* PIN Input (Create or Login) */}
        {step === 'pin' && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={handleBack}
              className="mb-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="space-y-2">
              <Label>{isNewUser ? 'Create 6-Digit PIN' : 'Enter Your PIN'}</Label>
              <PINInput
                length={6}
                onComplete={handlePinComplete}
                disabled={loading}
              />
            </div>
            {loading && (
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center">
              {countryCode} {phoneNumber}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};