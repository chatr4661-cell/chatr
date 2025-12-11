import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Phone, ArrowLeft, ArrowRight } from 'lucide-react';
import { PINInput } from './PINInput';
import { CountryCodeSelector } from './CountryCodeSelector';
import { normalizePhoneNumber } from '@/utils/phoneHashUtil';
import { z } from 'zod';

const phoneSchema = z.string()
  .min(10, "Phone number must be at least 10 digits")
  .max(15, "Phone number must be less than 15 digits")
  .regex(/^[0-9]+$/, "Phone number must contain only digits");

type AuthStep = 'phone' | 'pin' | 'confirm-pin';

export const PhoneAuth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [firstPin, setFirstPin] = useState('');

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
    
    // Validate phone number
    const validation = phoneSchema.safeParse(phoneNumber.trim());
    if (!validation.success) {
      toast({
        title: "Invalid Phone Number",
        description: validation.error.errors[0].message,
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

      console.log('[AUTH] Creating account with phone:', normalizedPhone);

      // Create new user with phone as email and PIN as password
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password: pin,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
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
            title: "Account Found",
            description: "Logging you in...",
          });
          await handleLoginPin(pin);
          return;
        }
        throw signUpError;
      }

      if (!authData.user) throw new Error('Failed to create user');

      console.log('[AUTH] ✅ User created successfully:', authData.user.id);

      // Wait for trigger to create profile and award welcome coins
      console.log('[AUTH] Waiting for profile creation...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify profile was created
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, phone_number, onboarding_completed')
        .eq('id', authData.user.id)
        .maybeSingle();

      console.log('[AUTH] Profile check:', { profile, profileError });

      if (!profile) {
        console.error('[AUTH] Profile not found after creation, creating manually');
        // Create profile manually if trigger failed
        const { error: insertError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          phone_number: normalizedPhone,
          email: `pending_${authData.user.id}@chatr.chat`,
          username: phoneNumber,
          onboarding_completed: false,
        });
        
        if (insertError) {
          console.error('[AUTH] Manual profile creation failed:', insertError);
        }
      } else if (!profile.phone_number || profile.phone_number !== normalizedPhone) {
        // Update phone number if not set correctly
        await supabase
          .from('profiles')
          .update({ phone_number: normalizedPhone })
          .eq('id', authData.user.id);
      }

      // Check if welcome coins were awarded
      const { data: points } = await supabase
        .from('user_points')
        .select('balance')
        .eq('user_id', authData.user.id)
        .maybeSingle();

      console.log('[AUTH] User points:', points);

      toast({
        title: "Account Created! 🎉",
        description: points 
          ? `Welcome to Chatr! You've received ${points.balance} Chatr Coins!`
          : "Welcome to Chatr! Complete your profile to get started.",
      });

      console.log('[AUTH] Account creation complete, waiting for auth state change to handle redirect');
      
      // Don't navigate here - let Auth.tsx handle it via onAuthStateChange
      // This ensures proper session establishment and onboarding flow
      setLoading(false);
    } catch (error: any) {
      console.error('[AUTH] PIN creation error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to create account. Please try again.",
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

      console.log('[AUTH] Login attempt for:', normalizedPhone);

      // Sign in with phone as email and PIN as password
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: pin,
      });

      console.log('[AUTH] Sign in result:', { 
        success: !!data.session, 
        userId: data.user?.id,
        error: signInError?.message 
      });

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
        title: "Welcome Back! 👋",
        description: "Signing you in...",
      });

      console.log('[AUTH] Login successful, auth state change will handle redirect');
      setLoading(false);
      
      // Don't navigate here - let Auth.tsx handle it via onAuthStateChange
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
    <Card className="w-full bg-white/90 backdrop-blur-sm border-white/20 shadow-xl">
      <CardHeader className="space-y-2 pb-4">
        <CardTitle className="text-2xl font-bold text-foreground">
          {step === 'phone' 
            ? 'Welcome' 
            : step === 'confirm-pin'
            ? 'Confirm PIN'
            : isNewUser 
            ? 'Create PIN' 
            : 'Enter PIN'}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
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
              <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                Phone Number
              </Label>
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
                  className="flex-1 h-14 text-base bg-white border-2 border-gray-200 focus:border-primary rounded-xl transition-all"
                  required
                  autoFocus
                  maxLength={15}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                We'll send you a verification code
              </p>
            </div>
            <Button 
              type="submit" 
              className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all"
              disabled={loading || phoneNumber.length < 10}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-5 w-5" />
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