import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
} from 'firebase/auth';
import { auth } from '@/firebase';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PhoneAuthStep = 'phone' | 'otp' | 'syncing';

interface UseFirebasePhoneAuthReturn {
  step: PhoneAuthStep;
  loading: boolean;
  error: string | null;
  countdown: number;
  checkPhoneAndProceed: (phoneNumber: string) => Promise<boolean>;
  sendOTP: (phoneNumber: string) => Promise<boolean>;
  verifyOTP: (otp: string) => Promise<boolean>;
  resendOTP: () => Promise<boolean>;
  reset: () => void;
  phoneNumber: string;
  isExistingUser: boolean;
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

  // Initialize reCAPTCHA
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
   * Check if user exists - if yes, login directly without OTP
   * If new user, proceed with Firebase OTP
   */
  const checkPhoneAndProceed = useCallback(async (phone: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setPhoneNumber(phone);

    try {
      console.log('[Phone Auth] Checking user existence for:', phone);
      const normalizedPhone = phone.replace(/\s/g, '');

      // Check if user exists with completed profile
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, onboarding_completed')
        .eq('phone_number', normalizedPhone)
        .maybeSingle();

      if (existingProfile && existingProfile.onboarding_completed) {
        // EXISTING USER → Login directly without OTP
        console.log('[Phone Auth] Existing user found, logging in directly');
        setIsExistingUser(true);
        setExistingUserId(existingProfile.id);
        setStep('syncing');
        
        // Sign in directly
        const signInResult = await signInExistingUser(normalizedPhone, existingProfile.id);
        
        if (signInResult.success) {
          toast({
            title: 'Welcome back! 👋',
            description: 'Logged in successfully',
          });
          return true;
        } else {
          // If direct login fails, fall back to OTP
          console.log('[Phone Auth] Direct login failed, falling back to OTP');
          setStep('phone');
          return await sendOTP(phone);
        }
      }

      // NEW USER → Proceed with Firebase OTP
      console.log('[Phone Auth] New user, proceeding with OTP verification');
      setIsExistingUser(false);
      setExistingUserId(null);
      
      return await sendOTP(phone);
    } catch (err: any) {
      console.error('[Phone Auth] Check phone error:', err);
      setError('Failed to verify phone. Please try again.');
      setLoading(false);
      return false;
    }
  }, [toast]);

  /**
   * Sign in existing user directly without OTP
   */
  const signInExistingUser = async (
    normalizedPhone: string, 
    profileId: string
  ): Promise<{ success: boolean }> => {
    try {
      const email = `${normalizedPhone.replace(/\+/g, '')}@chatr.local`;
      const fallbackEmail = `${normalizedPhone.replace(/\+/g, '')}_fb@chatr.local`;
      const pinEmail = `${normalizedPhone.replace(/\+/g, '')}_pin@chatr.local`;
      
      // Try multiple password patterns
      const passwordPatterns = [
        normalizedPhone,
        `firebase_${profileId}_chatr`,
      ];

      const emails = [email, fallbackEmail, pinEmail];

      for (const tryEmail of emails) {
        for (const password of passwordPatterns) {
          const { data: signInData } = await supabase.auth.signInWithPassword({
            email: tryEmail,
            password,
          });
          
          if (signInData?.session) {
            console.log('[Phone Auth] Signed in with:', tryEmail);
            
            // Update last seen
            await supabase
              .from('profiles')
              .update({ last_seen_at: new Date().toISOString() })
              .eq('id', profileId);
              
            setLoading(false);
            return { success: true };
          }
        }
      }

      // Try signing up with new credentials if all else fails
      const newPassword = normalizedPhone;
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: `${normalizedPhone.replace(/\+/g, '')}_auto@chatr.local`,
        password: newPassword,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            phone_number: normalizedPhone,
          }
        }
      });

      if (signUpData?.session) {
        console.log('[Phone Auth] Created new auth entry for existing profile');
        setLoading(false);
        return { success: true };
      }

      // Try signing in with the new email
      if (signUpError?.message?.includes('already registered')) {
        const { data: retryData } = await supabase.auth.signInWithPassword({
          email: `${normalizedPhone.replace(/\+/g, '')}_auto@chatr.local`,
          password: newPassword,
        });
        
        if (retryData?.session) {
          setLoading(false);
          return { success: true };
        }
      }

      setLoading(false);
      return { success: false };
    } catch (err) {
      console.error('[Phone Auth] Direct login error:', err);
      setLoading(false);
      return { success: false };
    }
  };

  // Send OTP to phone number (only for new users)
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
      const syncResult = await syncFirebaseUserToSupabase(firebaseUser.uid, phoneNumber);
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
  }, [phoneNumber, toast]);

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

  // Reset state
  const reset = useCallback(() => {
    setStep('phone');
    setLoading(false);
    setError(null);
    setCountdown(0);
    setPhoneNumber('');
    setIsExistingUser(false);
    setExistingUserId(null);
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
    resendOTP,
    reset,
    phoneNumber,
    isExistingUser,
  };
};

/**
 * Sync Firebase phone auth user to Supabase (for new users only)
 */
async function syncFirebaseUserToSupabase(
  firebaseUid: string, 
  phoneNumber: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedPhone = phoneNumber.replace(/\s/g, '');
    const email = `${normalizedPhone.replace(/\+/g, '')}@chatr.local`;
    const password = normalizedPhone; // Use phone as password for easy re-login
    
    console.log('[Supabase Sync] Syncing Firebase user:', { firebaseUid, email, normalizedPhone });

    // Create new user in Supabase
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
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
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInData?.session) {
          console.log('[Supabase Sync] Signed in existing user');
          return { success: true };
        }

        // Try fallback email
        const fallbackEmail = `${normalizedPhone.replace(/\+/g, '')}_fb@chatr.local`;
        const { data: fallbackData } = await supabase.auth.signUp({
          email: fallbackEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              phone_number: normalizedPhone,
              firebase_uid: firebaseUid,
            }
          }
        });

        if (fallbackData?.session) {
          return { success: true };
        }

        // Try sign in with fallback
        const { data: fallbackSignIn } = await supabase.auth.signInWithPassword({
          email: fallbackEmail,
          password,
        });

        if (fallbackSignIn?.session) {
          return { success: true };
        }
        
        return { success: false, error: 'Account exists but login failed. Please try again.' };
      }
      
      console.error('[Supabase Sync] Signup error:', signUpError);
      return { success: false, error: signUpError.message };
    }

    if (signUpData?.session || signUpData?.user) {
      console.log('[Supabase Sync] New user created successfully');
      return { success: true };
    }

    return { success: false, error: 'Failed to create session' };
  } catch (err: any) {
    console.error('[Supabase Sync] Error:', err);
    return { success: false, error: err.message };
  }
}
