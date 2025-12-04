import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
} from 'firebase/auth';
import { auth } from '@/firebase';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PhoneAuthStep = 'phone' | 'otp' | 'syncing' | 'pin_login';

interface UseFirebasePhoneAuthReturn {
  step: PhoneAuthStep;
  loading: boolean;
  error: string | null;
  countdown: number;
  checkPhoneAndProceed: (phoneNumber: string) => Promise<boolean>;
  sendOTP: (phoneNumber: string) => Promise<boolean>;
  verifyOTP: (otp: string) => Promise<boolean>;
  verifyPINLogin: (pin: string) => Promise<boolean>;
  resendOTP: () => Promise<boolean>;
  reset: () => void;
  phoneNumber: string;
  isExistingUser: boolean;
  existingUserId: string | null;
}

export const useFirebasePhoneAuth = (): UseFirebasePhoneAuthReturn => {
  const { toast } = useToast();
  const [step, setStep] = useState<PhoneAuthStep>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [existingUserId, setExistingUserId] = useState<string | null>(null);
  const [existingPinHash, setExistingPinHash] = useState<string | null>(null);
  
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const recaptchaContainerRef = useRef<string>('recaptcha-container');

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Initialize reCAPTCHA - only after multiple failed attempts
  const initRecaptcha = useCallback((forceVisible: boolean = false) => {
    if (recaptchaVerifierRef.current) {
      return recaptchaVerifierRef.current;
    }

    try {
      const existingContainer = document.getElementById(recaptchaContainerRef.current);
      if (existingContainer) {
        existingContainer.innerHTML = '';
      }

      const useVisibleCaptcha = forceVisible || failedAttempts >= 3;

      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        size: useVisibleCaptcha ? 'normal' : 'invisible',
        callback: () => {
          console.log('[Firebase Phone Auth] reCAPTCHA solved');
        },
        'expired-callback': () => {
          console.log('[Firebase Phone Auth] reCAPTCHA expired');
          recaptchaVerifierRef.current = null;
        }
      });

      return recaptchaVerifierRef.current;
    } catch (err) {
      console.error('[Firebase Phone Auth] reCAPTCHA init error:', err);
      return null;
    }
  }, [failedAttempts]);

  /**
   * Step 1: Check if user exists with PIN, then decide flow
   * - Existing user with PIN → PIN login (no OTP)
   * - New user or no PIN → Firebase OTP flow
   */
  const checkPhoneAndProceed = useCallback(async (phone: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setPhoneNumber(phone);

    try {
      console.log('[Phone Auth] Checking user existence for:', phone);
      const normalizedPhone = phone.replace(/\s/g, '');

      // Check if user exists with PIN set
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, pin_hash, onboarding_completed')
        .eq('phone_number', normalizedPhone)
        .maybeSingle();

      if (existingProfile && existingProfile.pin_hash) {
        // EXISTING USER WITH PIN → Skip OTP, go directly to PIN login
        console.log('[Phone Auth] Existing user with PIN found, skipping OTP');
        setIsExistingUser(true);
        setExistingUserId(existingProfile.id);
        setExistingPinHash(existingProfile.pin_hash);
        setStep('pin_login');
        setLoading(false);
        
        toast({
          title: 'Welcome back! 👋',
          description: 'Enter your 4-digit PIN to login',
        });
        return true;
      }

      // NEW USER OR NO PIN → Proceed with Firebase OTP
      console.log('[Phone Auth] New user or no PIN, proceeding with OTP');
      setIsExistingUser(!!existingProfile);
      setExistingUserId(existingProfile?.id || null);
      
      // Now send OTP
      return await sendOTP(phone);
    } catch (err: any) {
      console.error('[Phone Auth] Check phone error:', err);
      setError('Failed to verify phone. Please try again.');
      setLoading(false);
      return false;
    }
  }, [toast]);

  // Send OTP to phone number (only for new users or users without PIN)
  const sendOTP = useCallback(async (phone: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      console.log('[Firebase Phone Auth] Sending OTP to:', phone);
      setPhoneNumber(phone);

      const recaptcha = initRecaptcha();
      if (!recaptcha) {
        throw new Error('Failed to initialize verification. Please refresh and try again.');
      }

      const confirmationResult = await signInWithPhoneNumber(auth, phone, recaptcha);
      confirmationResultRef.current = confirmationResult;
      
      console.log('[Firebase Phone Auth] OTP sent successfully');
      setStep('otp');
      setCountdown(60);
      
      toast({
        title: 'OTP Sent! 📱',
        description: `Verification code sent to ${phone}`,
      });

      return true;
    } catch (err: any) {
      console.error('[Firebase Phone Auth] Send OTP error:', err);
      setFailedAttempts(prev => prev + 1);
      
      let errorMessage = 'Failed to send OTP. Please try again.';
      
      if (err.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format. Please include country code.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (err.code === 'auth/quota-exceeded') {
        errorMessage = 'SMS quota exceeded. Please try again later.';
      } else if (err.code === 'auth/captcha-check-failed') {
        errorMessage = 'Verification failed. Please refresh the page and try again.';
      } else if (err.message?.includes('Hostname match not found')) {
        errorMessage = 'Domain not authorized. Please contact support.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setStep('phone');
      toast({
        title: 'OTP Failed',
        description: errorMessage,
        variant: 'destructive',
      });

      recaptchaVerifierRef.current = null;
      return false;
    } finally {
      setLoading(false);
    }
  }, [initRecaptcha, toast]);

  // Verify OTP code (for new users during signup)
  const verifyOTP = useCallback(async (otp: string): Promise<boolean> => {
    if (!confirmationResultRef.current) {
      setError('Session expired. Please request a new OTP.');
      return false;
    }

    setLoading(true);
    setError(null);
    setStep('syncing');

    try {
      console.log('[Firebase Phone Auth] Verifying OTP...');
      
      const result = await confirmationResultRef.current.confirm(otp);
      const firebaseUser = result.user;
      
      console.log('[Firebase Phone Auth] OTP verified! Firebase UID:', firebaseUser.uid);

      // Sync to Supabase for new user
      const syncResult = await syncFirebaseUserToSupabase(firebaseUser.uid, phoneNumber, existingUserId);
      if (!syncResult.success) {
        throw new Error(syncResult.error || 'Failed to create account');
      }

      toast({
        title: 'Verified! ✅',
        description: 'Phone number verified successfully',
      });

      return true;
    } catch (err: any) {
      console.error('[Firebase Phone Auth] Verify OTP error:', err);
      setFailedAttempts(prev => prev + 1);
      
      let errorMessage = 'Invalid OTP. Please try again.';
      
      if (err.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid verification code. Please check and try again.';
      } else if (err.code === 'auth/code-expired') {
        errorMessage = 'Verification code expired. Please request a new one.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setStep('otp');
      
      toast({
        title: 'Verification Failed',
        description: errorMessage,
        variant: 'destructive',
      });

      return false;
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, existingUserId, toast]);

  // Resend OTP
  const resendOTP = useCallback(async (): Promise<boolean> => {
    if (countdown > 0) {
      toast({
        title: 'Please Wait',
        description: `You can resend OTP in ${countdown} seconds`,
        variant: 'destructive',
      });
      return false;
    }

    recaptchaVerifierRef.current = null;
    return sendOTP(phoneNumber);
  }, [countdown, phoneNumber, sendOTP, toast]);

  /**
   * Verify PIN for returning users (NO OTP required)
   * Uses stored pin_hash to verify locally, then creates Supabase session
   */
  const verifyPINLogin = useCallback(async (pin: string): Promise<boolean> => {
    if (!existingUserId || !existingPinHash) {
      setError('Session expired. Please start over.');
      return false;
    }

    setLoading(true);
    setError(null);
    setStep('syncing');

    try {
      console.log('[Phone Auth] Verifying PIN for returning user...');
      
      // Verify PIN using bcrypt
      const { verifyPin } = await import('@/utils/pinSecurity');
      const isValid = await verifyPin(pin, existingPinHash);

      if (!isValid) {
        setFailedAttempts(prev => prev + 1);
        setError('Incorrect PIN. Please try again.');
        setStep('pin_login');
        setLoading(false);
        
        if (failedAttempts >= 4) {
          toast({
            title: 'Too many attempts',
            description: 'Please wait before trying again.',
            variant: 'destructive',
          });
        }
        return false;
      }

      // PIN verified - create Supabase session
      const normalizedPhone = phoneNumber.replace(/\s/g, '');
      const email = `${normalizedPhone.replace(/\+/g, '')}@chatr.local`;
      const fallbackEmail = `${normalizedPhone.replace(/\+/g, '')}_fb@chatr.local`;
      
      // Try signing in with known password patterns
      const passwordPatterns = [
        pin, // PIN as password (most common for PIN-only users)
        `pin_${pin}_chatr`,
        normalizedPhone,
      ];

      let signedIn = false;

      // Try primary email first
      for (const password of passwordPatterns) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInData?.session) {
          signedIn = true;
          console.log('[Phone Auth] Signed in with primary email');
          break;
        }
      }

      // Try fallback email if primary failed
      if (!signedIn) {
        for (const password of passwordPatterns) {
          const { data: signInData } = await supabase.auth.signInWithPassword({
            email: fallbackEmail,
            password,
          });
          
          if (signInData?.session) {
            signedIn = true;
            console.log('[Phone Auth] Signed in with fallback email');
            break;
          }
        }
      }

      // If still not signed in, create new auth entry with PIN as password
      if (!signedIn) {
        console.log('[Phone Auth] Creating new auth entry with PIN');
        
        // Try signup with unique email
        const uniqueEmail = `${normalizedPhone.replace(/\+/g, '')}_pin@chatr.local`;
        
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: uniqueEmail,
          password: pin,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              phone_number: normalizedPhone,
            }
          }
        });

        if (signUpError && signUpError.message?.includes('already registered')) {
          // Try to sign in
          const { data: retrySignIn } = await supabase.auth.signInWithPassword({
            email: uniqueEmail,
            password: pin,
          });
          
          if (retrySignIn?.session) {
            signedIn = true;
          }
        } else if (signUpData?.session) {
          signedIn = true;
        }
      }

      if (!signedIn) {
        throw new Error('Unable to create session. Please contact support.');
      }

      // Update last login
      await supabase
        .from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', existingUserId);

      toast({
        title: 'Welcome back! ✅',
        description: 'Signed in successfully',
      });

      return true;
    } catch (err: any) {
      console.error('[Phone Auth] PIN login error:', err);
      setError(err.message || 'Login failed. Please try again.');
      setStep('pin_login');
      return false;
    } finally {
      setLoading(false);
    }
  }, [existingUserId, existingPinHash, phoneNumber, failedAttempts, toast]);

  // Reset state
  const reset = useCallback(() => {
    setStep('phone');
    setLoading(false);
    setError(null);
    setCountdown(0);
    setPhoneNumber('');
    setIsExistingUser(false);
    setExistingUserId(null);
    setExistingPinHash(null);
    setFailedAttempts(0);
    confirmationResultRef.current = null;
    recaptchaVerifierRef.current = null;
  }, []);

  return {
    step,
    loading,
    error,
    countdown,
    checkPhoneAndProceed,
    sendOTP,
    verifyOTP,
    verifyPINLogin,
    resendOTP,
    reset,
    phoneNumber,
    isExistingUser,
    existingUserId,
  };
};

/**
 * Sync Firebase phone auth user to Supabase (for new users only)
 */
async function syncFirebaseUserToSupabase(
  firebaseUid: string, 
  phoneNumber: string,
  existingProfileId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedPhone = phoneNumber.replace(/\s/g, '');
    const email = `${normalizedPhone.replace(/\+/g, '')}@chatr.local`;
    
    console.log('[Supabase Sync] Syncing Firebase user:', { firebaseUid, email, normalizedPhone });

    // Create new user in Supabase
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password: `firebase_${firebaseUid}_chatr`,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          phone_number: normalizedPhone,
          firebase_uid: firebaseUid,
          username: normalizedPhone,
        }
      }
    });

    if (signUpError) {
      if (signUpError.message?.toLowerCase().includes('already registered')) {
        // Try to sign in instead
        const passwordPatterns = [
          `firebase_${firebaseUid}_chatr`,
          normalizedPhone,
        ];
        
        for (const password of passwordPatterns) {
          const { data: signInData } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (signInData.session) {
            console.log('[Supabase Sync] Signed in existing user');
            return { success: true };
          }
        }

        // Try fallback email
        const fallbackEmail = `${normalizedPhone.replace(/\+/g, '')}_fb@chatr.local`;
        const { data: fallbackSignUp } = await supabase.auth.signUp({
          email: fallbackEmail,
          password: `firebase_${firebaseUid}_chatr`,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              phone_number: normalizedPhone,
              firebase_uid: firebaseUid,
            }
          }
        });

        if (fallbackSignUp?.session) {
          return { success: true };
        }

        const { data: fallbackSignIn } = await supabase.auth.signInWithPassword({
          email: fallbackEmail,
          password: `firebase_${firebaseUid}_chatr`,
        });

        if (fallbackSignIn?.session) {
          return { success: true };
        }

        return { success: false, error: 'Account exists but login failed. Please contact support.' };
      }
      
      return { success: false, error: signUpError.message };
    }

    if (!signUpData.session) {
      return { success: false, error: 'Account created but session failed' };
    }

    console.log('[Supabase Sync] New user created successfully');
    return { success: true };
  } catch (err: any) {
    console.error('[Supabase Sync] Error:', err);
    return { success: false, error: err.message || 'Sync failed' };
  }
}
