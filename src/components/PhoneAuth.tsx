import { useState, useEffect } from 'react';
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

type AuthStep = 'pin-login' | 'phone' | 'create-pin';

export const PhoneAuth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<AuthStep>('pin-login');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);

  // Check for existing session on mount
  useEffect(() => {
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
      
      // Check if user exists in profiles
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone_number', normalizedPhone)
        .maybeSingle();

      if (existingProfile) {
        toast({
          title: "Welcome Back",
          description: "Please enter your PIN to continue",
        });
        setStep('pin-login');
      } else {
        toast({
          title: "New User",
          description: "Let's create a PIN for your account",
        });
        setStep('create-pin');
      }
    } catch (error: any) {
      console.error('Phone verification error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to verify phone number",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPinLogin = async (pin: string) => {
    setLoading(true);
    try {
      // Try to get user session - this is a quick PIN login without phone number
      // We'll try common phone number patterns based on the PIN
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        navigate('/');
        return;
      }

      // If no session, need to get phone number first
      setLoginAttempts(prev => prev + 1);
      
      if (loginAttempts >= 2) {
        toast({
          title: "Need Phone Number",
          description: "Please enter your phone number to continue",
        });
        setStep('phone');
        setLoading(false);
        return;
      }

      toast({
        title: "Unable to Login",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      setStep('phone');
    } catch (error: any) {
      console.error('Quick login error:', error);
      toast({
        title: "Login Failed",
        description: "Please enter your phone number to continue",
        variant: "destructive",
      });
      setStep('phone');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePinComplete = async (pin: string) => {
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
        setStep('pin-login');
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
          setStep('pin-login');
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

  const handleLoginPinComplete = async (pin: string) => {
    setLoading(true);
    try {
      const normalizedPhone = normalizePhoneNumber(phoneNumber, countryCode);
      const email = `${normalizedPhone.replace(/\+/g, '')}@chatr.local`;

      // Sign in with phone as email and PIN as password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: pin,
      });

      if (signInError) {
        toast({
          title: "Invalid PIN",
          description: "The PIN you entered is incorrect",
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
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackToQuickLogin = () => {
    setStep('pin-login');
    setPhoneNumber('');
    setLoginAttempts(0);
  };

  return (
    <Card className="w-full backdrop-blur-glass bg-gradient-glass border-glass-border shadow-glass">
      <CardHeader>
        <CardTitle>
          {step === 'pin-login' && 'Enter PIN'}
          {step === 'phone' && 'Welcome to chatr.chat'}
          {step === 'create-pin' && 'Create Your PIN'}
        </CardTitle>
        <CardDescription>
          {step === 'pin-login' && 'for smart chatr messaging'}
          {step === 'phone' && 'Enter your phone number to get started'}
          {step === 'create-pin' && 'Choose a 6-digit PIN'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick PIN Login */}
        {step === 'pin-login' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Enter Your PIN</Label>
              <PINInput
                length={6}
                onComplete={handleQuickPinLogin}
                disabled={loading}
              />
            </div>
            {loading && (
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
            <div className="text-center">
              <Button
                variant="link"
                onClick={() => setStep('phone')}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                New user? Register here
              </Button>
            </div>
          </div>
        )}

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

        {/* Create PIN */}
        {step === 'create-pin' && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={handleBackToQuickLogin}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="space-y-2">
              <Label>Create 6-Digit PIN</Label>
              <PINInput
                length={6}
                onComplete={handleCreatePinComplete}
                disabled={loading}
              />
            </div>
            {loading && (
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* Login with Phone PIN */}
        {step === 'pin-login' && phoneNumber && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={handleBackToQuickLogin}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="space-y-2">
              <Label>Enter Your PIN</Label>
              <PINInput
                length={6}
                onComplete={handleLoginPinComplete}
                disabled={loading}
              />
            </div>
            {loading && (
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};