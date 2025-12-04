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
  sendOTP: (phoneNumber: string) => Promise<boolean>;
  verifyOTP: (otp: string) => Promise<boolean>;
  resendOTP: () => Promise<boolean>;
  reset: () => void;
  phoneNumber: string;
}

export const useFirebasePhoneAuth = (): UseFirebasePhoneAuthReturn => {
  const { toast } = useToast();
  const [step, setStep] = useState<PhoneAuthStep>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  
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
      // Clear any existing reCAPTCHA
      const existingContainer = document.getElementById(recaptchaContainerRef.current);
      if (existingContainer) {
        existingContainer.innerHTML = '';
      }

      // Use invisible reCAPTCHA normally, visible only after 3+ failed attempts
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

  // Send OTP to phone number
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
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      toast({
        title: 'OTP Failed',
        description: errorMessage,
        variant: 'destructive',
      });

      // Reset reCAPTCHA on error
      recaptchaVerifierRef.current = null;
      return false;
    } finally {
      setLoading(false);
    }
  }, [initRecaptcha, toast]);

  // Verify OTP code
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

      // Now sync with Supabase
      const syncResult = await syncFirebaseUserToSupabase(firebaseUser.uid, phoneNumber);
      
      if (!syncResult.success) {
        throw new Error(syncResult.error || 'Failed to sync user');
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
    confirmationResultRef.current = null;
    recaptchaVerifierRef.current = null;
  }, []);

  return {
    step,
    loading,
    error,
    countdown,
    sendOTP,
    verifyOTP,
    resendOTP,
    reset,
    phoneNumber,
  };
};

/**
 * Sync Firebase phone auth user to Supabase
 * Handles both new users and existing users with different auth methods
 */
async function syncFirebaseUserToSupabase(
  firebaseUid: string, 
  phoneNumber: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedPhone = phoneNumber.replace(/\s/g, '');
    const email = `${normalizedPhone.replace(/\+/g, '')}@chatr.local`;
    
    console.log('[Supabase Sync] Syncing Firebase user:', { firebaseUid, email, normalizedPhone });

    // First, check if user already exists by phone number in profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id, firebase_uid')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    if (existingProfile) {
      console.log('[Supabase Sync] Found existing profile:', existingProfile.id);
      
      // Try to sign in with existing credentials
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: `firebase_${firebaseUid}_chatr`,
      });

      if (signInData.session) {
        console.log('[Supabase Sync] Signed in existing user');
        // Update firebase_uid if not set
        if (!existingProfile.firebase_uid) {
          await supabase
            .from('profiles')
            .update({ firebase_uid: firebaseUid })
            .eq('id', existingProfile.id);
        }
        return { success: true };
      }

      // If sign in failed, try with old PIN-based password patterns
      // This handles migration from old PIN-based auth
      console.log('[Supabase Sync] Trying alternative auth methods...');
      
      // Try signing in without password change - just update the profile
      // The user likely has a different password from old PIN system
      // We'll use admin-level update via the existing session if available
      
      // Try a simple 6-digit PIN pattern (common from old system)
      for (const pin of ['123456', '000000', '111111']) {
        const { data } = await supabase.auth.signInWithPassword({
          email,
          password: pin,
        });
        if (data.session) {
          console.log('[Supabase Sync] Signed in with legacy PIN');
          await supabase
            .from('profiles')
            .update({ firebase_uid: firebaseUid })
            .eq('id', existingProfile.id);
          return { success: true };
        }
      }

      // If we can't sign in, create a new auth user with different email
      // This is a fallback for users who exist in profiles but auth is broken
      const fallbackEmail = `${normalizedPhone.replace(/\+/g, '')}_fb@chatr.local`;
      
      const { data: newAuthData, error: newAuthError } = await supabase.auth.signUp({
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

      if (newAuthError) {
        // Try to sign in with fallback email (might already exist)
        const { data: fallbackSignIn } = await supabase.auth.signInWithPassword({
          email: fallbackEmail,
          password: `firebase_${firebaseUid}_chatr`,
        });
        
        if (fallbackSignIn.session) {
          console.log('[Supabase Sync] Signed in with fallback email');
          return { success: true };
        }
        
        console.error('[Supabase Sync] All auth methods failed:', newAuthError);
        return { success: false, error: 'Unable to authenticate. Please try Google sign-in or contact support.' };
      }

      if (newAuthData.user) {
        console.log('[Supabase Sync] Created new auth with fallback email');
        await new Promise(resolve => setTimeout(resolve, 1500));
        return { success: true };
      }
    }

    // No existing profile - create new user
    console.log('[Supabase Sync] Creating new user...');
    
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
      // User might already exist in auth but not in profiles
      if (signUpError.message?.toLowerCase().includes('already registered')) {
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email,
          password: `firebase_${firebaseUid}_chatr`,
        });
        
        if (signInData.session) {
          console.log('[Supabase Sync] Signed in existing auth user');
          return { success: true };
        }
      }
      throw signUpError;
    }

    if (!signUpData.user) {
      throw new Error('Failed to create user');
    }

    console.log('[Supabase Sync] New user created:', signUpData.user.id);
    
    // Wait for profile trigger
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update profile with Firebase UID
    await supabase
      .from('profiles')
      .update({ 
        phone_number: normalizedPhone,
        firebase_uid: firebaseUid,
      })
      .eq('id', signUpData.user.id);

    return { success: true };
  } catch (err: any) {
    console.error('[Supabase Sync] Error:', err);
    return { success: false, error: err.message || 'Failed to sync user' };
  }
}
