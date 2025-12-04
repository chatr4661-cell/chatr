import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  PhoneAuthProvider,
  signInWithCredential
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

  // Initialize invisible reCAPTCHA
  const initRecaptcha = useCallback(() => {
    if (recaptchaVerifierRef.current) {
      return recaptchaVerifierRef.current;
    }

    try {
      // Clear any existing reCAPTCHA
      const existingContainer = document.getElementById(recaptchaContainerRef.current);
      if (existingContainer) {
        existingContainer.innerHTML = '';
      }

      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        size: 'invisible',
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
  }, []);

  // Send OTP to phone number
  const sendOTP = useCallback(async (phone: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      console.log('[Firebase Phone Auth] Sending OTP to:', phone);
      setPhoneNumber(phone);

      const recaptcha = initRecaptcha();
      if (!recaptcha) {
        throw new Error('Failed to initialize reCAPTCHA. Please refresh and try again.');
      }

      const confirmationResult = await signInWithPhoneNumber(auth, phone, recaptcha);
      confirmationResultRef.current = confirmationResult;
      
      console.log('[Firebase Phone Auth] OTP sent successfully');
      setStep('otp');
      setCountdown(60); // 60 second countdown for resend
      
      toast({
        title: 'OTP Sent! 📱',
        description: `Verification code sent to ${phone}`,
      });

      return true;
    } catch (err: any) {
      console.error('[Firebase Phone Auth] Send OTP error:', err);
      
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
      
      let errorMessage = 'Invalid OTP. Please try again.';
      
      if (err.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid verification code. Please check and try again.';
      } else if (err.code === 'auth/code-expired') {
        errorMessage = 'Verification code expired. Please request a new one.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setStep('otp'); // Go back to OTP step
      
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

    // Reset reCAPTCHA for new attempt
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
 * Creates or logs in user with {phone}@chatr.local email pattern
 */
async function syncFirebaseUserToSupabase(
  firebaseUid: string, 
  phoneNumber: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalize phone number (remove spaces, ensure + prefix)
    const normalizedPhone = phoneNumber.replace(/\s/g, '');
    const email = `${normalizedPhone.replace(/\+/g, '')}@chatr.local`;
    
    // Use Firebase UID as a deterministic password (hashed internally by Supabase)
    // This ensures the same Firebase user always maps to the same Supabase user
    const password = `firebase_${firebaseUid}_chatr`;

    console.log('[Supabase Sync] Syncing Firebase user:', { firebaseUid, email });

    // Try to sign in first (existing user)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInData.session) {
      console.log('[Supabase Sync] Existing user logged in:', signInData.user?.id);
      
      // Update profile with phone if needed
      await supabase
        .from('profiles')
        .update({ 
          phone_number: normalizedPhone,
          firebase_uid: firebaseUid,
        })
        .eq('id', signInData.user!.id);

      return { success: true };
    }

    // If sign in failed, try to create new user
    if (signInError) {
      console.log('[Supabase Sync] Sign in failed, creating new user...', signInError.message);

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
        // If user already exists with different password, handle gracefully
        if (signUpError.message?.toLowerCase().includes('already registered')) {
          console.log('[Supabase Sync] User exists but password mismatch - edge case');
          // This shouldn't happen with deterministic password, but handle it
          return { success: false, error: 'Account sync issue. Please contact support.' };
        }
        throw signUpError;
      }

      if (!signUpData.user) {
        throw new Error('Failed to create Supabase user');
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
    }

    return { success: false, error: 'Unknown error during sync' };
  } catch (err: any) {
    console.error('[Supabase Sync] Error:', err);
    return { success: false, error: err.message || 'Failed to sync user' };
  }
}
