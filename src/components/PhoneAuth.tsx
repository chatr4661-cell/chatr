import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Phone, ArrowLeft } from 'lucide-react';
import { PINInput } from './PINInput';
import { CountryCodeSelector } from './CountryCodeSelector';

type AuthStep = 'phone' | 'create-pin' | 'login-pin';

export const PhoneAuth = () => {
  const { toast } = useToast();
  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [loading, setLoading] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        window.location.href = '/';
      }
    };
    checkSession();
  }, []);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!phoneNumber || phoneNumber.length < 10) {
        toast({
          title: 'Invalid Phone Number',
          description: 'Please enter a valid phone number',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      const fullPhone = `${countryCode}${phoneNumber}`;

      // Check if user exists and has a PIN
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, pin')
        .eq('phone_number', fullPhone)
        .maybeSingle();

      if (profile) {
        setUserId(profile.id);
        
        // If user exists but has no PIN, treat as new registration
        if (!profile.pin) {
          setUserExists(false);
          setStep('create-pin');
        } else {
          // User exists with PIN, go to login
          setUserExists(true);
          setStep('login-pin');
        }
      } else {
        // Brand new user
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

  const handleCreatePinComplete = async (enteredPin: string) => {
    if (enteredPin.length !== 4 || !/^\d{4}$/.test(enteredPin)) {
      toast({
        title: 'Invalid PIN',
        description: 'PIN must be 4 digits',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const fullPhone = `${countryCode}${phoneNumber}`;
      
      // If userId exists, it means user exists but doesn't have a PIN - just update the PIN
      if (userId) {
        await supabase
          .from('profiles')
          .update({ pin: enteredPin })
          .eq('id', userId);

        // Create session by signing in with the existing account
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', userId)
          .single();

        if (profile?.email) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: profile.email,
            password: enteredPin + fullPhone
          });

          if (signInError) {
            // Update password to new PIN
            await supabase.auth.admin.updateUserById(userId, {
              password: enteredPin + fullPhone
            });
            
            // Sign in with new password
            await supabase.auth.signInWithPassword({
              email: profile.email,
              password: enteredPin + fullPhone
            });
          }
        }

        toast({
          title: 'PIN Created!',
          description: 'Welcome to chatr.chat'
        });
      } else {
        // New user - create auth account
        const dummyEmail = `${fullPhone.replace(/\+/g, '')}@chatr.local`;
        const dummyPassword = enteredPin + fullPhone;

        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: dummyEmail,
          password: dummyPassword,
          options: {
            data: {
              phone_number: fullPhone,
              username: fullPhone
            }
          }
        });

        if (authError) {
          throw authError;
        }

        if (!authData.user) throw new Error('Failed to create user');

        // Update profile with PIN
        await supabase
          .from('profiles')
          .update({ 
            phone_number: fullPhone,
            pin: enteredPin
          })
          .eq('id', authData.user.id);

        toast({
          title: 'Account Created!',
          description: 'Welcome to chatr.chat'
        });
      }

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
    if (enteredPin.length !== 4 || !/^\d{4}$/.test(enteredPin)) {
      toast({
        title: 'Invalid PIN',
        description: 'PIN must be 4 digits',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const fullPhone = `${countryCode}${phoneNumber}`;

      // Get user's profile with PIN
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, pin, email')
        .eq('phone_number', fullPhone)
        .maybeSingle();

      if (profileError || !profile) {
        toast({
          title: 'Error',
          description: 'Account not found',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Check if PIN is set
      if (!profile.pin) {
        toast({
          title: 'No PIN Set',
          description: 'Please create a PIN first',
          variant: 'destructive'
        });
        setStep('create-pin');
        setUserId(profile.id);
        setLoading(false);
        return;
      }

      // Verify PIN
      if (profile.pin !== enteredPin) {
        toast({
          title: 'Incorrect PIN',
          description: 'Please try again',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Sign in with email (dummy email created during signup)
      const dummyEmail = profile.email || `${fullPhone.replace(/\+/g, '')}@chatr.local`;
      
      // Get the user's password from auth metadata or create a session token
      // Since we don't store the password, we need to use signInWithPassword with the user's existing credentials
      // For now, let's use the admin API to create a session
      
      // Instead, let's update the auth user's password to match the PIN
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: dummyEmail,
        password: enteredPin + fullPhone // Combine PIN with phone for unique password
      });

      if (signInError) {
        // Password might have changed, try updating it
        const { data: { user } } = await supabase.auth.admin.getUserById(profile.id);
        
        if (user) {
          // Update password to current PIN + phone
          await supabase.auth.admin.updateUserById(profile.id, {
            password: enteredPin + fullPhone
          });
          
          // Try signing in again
          const { error: retryError } = await supabase.auth.signInWithPassword({
            email: dummyEmail,
            password: enteredPin + fullPhone
          });
          
          if (retryError) throw retryError;
        } else {
          throw signInError;
        }
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

  const handleBackToPhone = () => {
    setStep('phone');
    setPhoneNumber('');
    setUserExists(false);
  };

  return (
    <Card className="w-full backdrop-blur-glass bg-gradient-glass border-glass-border shadow-glass">
      <CardHeader>
        <CardTitle>
          {step === 'phone' && 'Welcome to chatr.chat'}
          {step === 'create-pin' && 'Create Your PIN'}
          {step === 'login-pin' && 'Enter Your PIN'}
        </CardTitle>
        <CardDescription>
          {step === 'phone' && 'Enter your phone number to get started'}
          {step === 'create-pin' && 'Choose a 4-digit PIN'}
          {step === 'login-pin' && 'Enter your PIN to sign in'}
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
              onClick={handleBackToPhone}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="space-y-2">
              <Label>Create 4-Digit PIN</Label>
              <PINInput
                length={4}
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

        {/* Login PIN */}
        {step === 'login-pin' && (
          <div className="space-y-4">
            <Button
              variant="ghost"
              onClick={handleBackToPhone}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="space-y-2">
              <Label>Enter Your PIN</Label>
              <PINInput
                length={4}
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
