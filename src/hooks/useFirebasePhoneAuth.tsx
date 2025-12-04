import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
} from 'firebase/auth';
import { auth } from '@/firebase';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type PhoneAuthStep = 'phone' | 'otp' | 'syncing' | 'pin_required';

interface UseFirebasePhoneAuthReturn {
  step: PhoneAuthStep;
  loading: boolean;
  error: string | null;
  countdown: number;
  sendOTP: (phoneNumber: string) => Promise<boolean>;
  verifyOTP: (otp: string) => Promise<boolean>;
  verifyPIN: (pin: string) => Promise<boolean>;
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
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  
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
      } else if (err.code === 'auth/captcha-check-failed') {
        errorMessage = 'Verification failed. Please refresh the page and try again.';
      } else if (err.message?.includes('Hostname match not found')) {
        errorMessage = 'Domain not authorized. Please contact support.';
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
      setFirebaseUid(firebaseUser.uid);

      // Check if user exists in Supabase
      const normalizedPhone = phoneNumber.replace(/\s/g, '');
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, pin_hash')
        .eq('phone_number', normalizedPhone)
        .maybeSingle();

      if (existingProfile) {
        console.log('[Firebase Phone Auth] Existing user found:', existingProfile.id);
        setIsExistingUser(true);
        setExistingUserId(existingProfile.id);
        
        // If user has PIN set, require PIN verification
        if (existingProfile.pin_hash) {
          setStep('pin_required');
          toast({
            title: 'Welcome back! 👋',
            description: 'Enter your PIN to continue',
          });
          return true;
        }
        
        // User exists but no PIN - sync and continue
        const syncResult = await syncFirebaseUserToSupabase(firebaseUser.uid, phoneNumber, existingProfile.id);
        if (!syncResult.success) {
          throw new Error(syncResult.error || 'Failed to sync user');
        }
      } else {
        // New user - create account
        const syncResult = await syncFirebaseUserToSupabase(firebaseUser.uid, phoneNumber, null);
        if (!syncResult.success) {
          throw new Error(syncResult.error || 'Failed to create account');
        }
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

  // Verify PIN for existing users
  const verifyPIN = useCallback(async (pin: string): Promise<boolean> => {
    if (!existingUserId || !firebaseUid) {
      setError('Session expired. Please start over.');
      return false;
    }

    setLoading(true);
    setError(null);
    setStep('syncing');

    try {
      console.log('[Firebase Phone Auth] Verifying PIN for existing user...');
      
      // Get the user's PIN hash
      const { data: profile } = await supabase
        .from('profiles')
        .select('pin_hash')
        .eq('id', existingUserId)
        .single();

      if (!profile?.pin_hash) {
        throw new Error('No PIN set for this account');
      }

      // Verify PIN using bcrypt
      const { verifyPin } = await import('@/utils/pinSecurity');
      const isValid = await verifyPin(pin, profile.pin_hash);

      if (!isValid) {
        setError('Incorrect PIN. Please try again.');
        setStep('pin_required');
        setLoading(false);
        return false;
      }

      // PIN verified - now sign into Supabase
      const normalizedPhone = phoneNumber.replace(/\s/g, '');
      const email = `${normalizedPhone.replace(/\+/g, '')}@chatr.local`;
      
      // Try signing in with the firebase-based password
      let signedIn = false;
      
      // Try firebase password first
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email,
        password: `firebase_${firebaseUid}_chatr`,
      });

      if (signInData.session) {
        signedIn = true;
      } else {
        // Try with PIN as password (legacy)
        const { data: pinSignIn } = await supabase.auth.signInWithPassword({
          email,
          password: pin,
        });
        if (pinSignIn.session) {
          signedIn = true;
        }
      }

      if (!signedIn) {
        // Update password and sign in
        const fallbackEmail = `${normalizedPhone.replace(/\+/g, '')}_fb@chatr.local`;
        
        const { data: newAuth } = await supabase.auth.signUp({
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

        if (!newAuth.session) {
          // Try to sign in with fallback email
          const { data: fallbackSignIn } = await supabase.auth.signInWithPassword({
            email: fallbackEmail,
            password: `firebase_${firebaseUid}_chatr`,
          });
          
          if (!fallbackSignIn.session) {
            throw new Error('Unable to authenticate. Please contact support.');
          }
        }
      }

      // Update profile with firebase_uid
      await supabase
        .from('profiles')
        .update({ firebase_uid: firebaseUid })
        .eq('id', existingUserId);

      toast({
        title: 'Welcome back! ✅',
        description: 'Signed in successfully',
      });

      return true;
    } catch (err: any) {
      console.error('[Firebase Phone Auth] PIN verification error:', err);
      setError(err.message || 'PIN verification failed');
      setStep('pin_required');
      return false;
    } finally {
      setLoading(false);
    }
  }, [existingUserId, firebaseUid, phoneNumber, toast]);

  // Reset state
  const reset = useCallback(() => {
    setStep('phone');
    setLoading(false);
    setError(null);
    setCountdown(0);
    setPhoneNumber('');
    setIsExistingUser(false);
    setExistingUserId(null);
    setFirebaseUid(null);
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
    verifyPIN,
    resendOTP,
    reset,
    phoneNumber,
    isExistingUser,
    existingUserId,
  };
};

/**
 * Sync Firebase phone auth user to Supabase
 * For new users or existing users without PIN
 */
async function syncFirebaseUserToSupabase(
  firebaseUid: string, 
  phoneNumber: string,
  existingProfileId: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedPhone = phoneNumber.replace(/\s/g, '');
    const email = `${normalizedPhone.replace(/\+/g, '')}@chatr.local`;
    
    console.log('[Supabase Sync] Syncing Firebase user:', { firebaseUid, email, normalizedPhone, existingProfileId });

    if (existingProfileId) {
      // Existing user without PIN - try to sign in or create new auth
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email,
        password: `firebase_${firebaseUid}_chatr`,
      });

      if (signInData.session) {
        console.log('[Supabase Sync] Signed in existing user');
        await supabase
          .from('profiles')
          .update({ firebase_uid: firebaseUid })
          .eq('id', existingProfileId);
        return { success: true };
      }

      // Create fallback auth entry
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
        const { data: fallbackSignIn } = await supabase.auth.signInWithPassword({
          email: fallbackEmail,
          password: `firebase_${firebaseUid}_chatr`,
        });
        
        if (fallbackSignIn.session) {
          return { success: true };
        }
        
        return { success: false, error: 'Authentication failed. Please try again.' };
      }

      if (newAuthData.session) {
        await supabase
          .from('profiles')
          .update({ firebase_uid: firebaseUid })
          .eq('id', existingProfileId);
        return { success: true };
      }
    }

    // New user - create account
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
      if (signUpError.message?.toLowerCase().includes('already registered')) {
        // User exists in auth - try different password patterns
        const passwordPatterns = [
          `firebase_${firebaseUid}_chatr`,
          normalizedPhone, // Phone as password
        ];
        
        for (const password of passwordPatterns) {
          const { data: signInData } = await supabase.auth.signInWithPassword({
            email,
            password,
          });
          
          if (signInData.session) {
            // Update profile with firebase_uid
            await supabase
              .from('profiles')
              .update({ firebase_uid: firebaseUid, phone_number: normalizedPhone })
              .eq('id', signInData.user.id);
            return { success: true };
          }
        }
        
        // If no password worked, try fallback email
        const fallbackEmail = `${normalizedPhone.replace(/\+/g, '')}_fb@chatr.local`;
        const { data: fallbackAuth, error: fallbackError } = await supabase.auth.signUp({
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
        
        if (fallbackAuth?.session) {
          return { success: true };
        }
        
        if (fallbackError?.message?.toLowerCase().includes('already registered')) {
          const { data: fallbackSignIn } = await supabase.auth.signInWithPassword({
            email: fallbackEmail,
            password: `firebase_${firebaseUid}_chatr`,
          });
          if (fallbackSignIn.session) {
            return { success: true };
          }
        }
        
        return { success: false, error: 'Unable to sign in. Please try Google login or contact support.' };
      }
      throw signUpError;
    }

    if (!signUpData.user) {
      throw new Error('Failed to create user');
    }

    console.log('[Supabase Sync] New user created:', signUpData.user.id);
    
    await new Promise(resolve => setTimeout(resolve, 2000));

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
