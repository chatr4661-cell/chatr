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
  
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  /**
   * FAST CHECK: If user exists → instant login (no OTP)
   * New user → Firebase OTP
   */
  const checkPhoneAndProceed = useCallback(async (phone: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setPhoneNumber(phone);

    const normalizedPhone = phone.replace(/\s/g, '');
    const email = `${normalizedPhone.replace(/\+/g, '')}@chatr.local`;
    const password = normalizedPhone; // Standard password = phone number

    try {
      // FAST PATH: Try direct login first (instant for existing users)
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInData?.session) {
        console.log('[Phone Auth] Instant login success!');
        setIsExistingUser(true);
        toast({
          title: 'Welcome back! 👋',
          description: 'Logged in instantly',
        });
        setLoading(false);
        return true;
      }

      // Not found with primary email, check if profile exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, onboarding_completed')
        .eq('phone_number', normalizedPhone)
        .maybeSingle();

      if (existingProfile?.onboarding_completed) {
        // Profile exists but login failed - try creating auth entry
        const { data: newAuth } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { phone_number: normalizedPhone }
          }
        });
        
        if (newAuth?.session) {
          setIsExistingUser(true);
          toast({ title: 'Welcome back! 👋' });
          setLoading(false);
          return true;
        }
      }

      // NEW USER → Firebase OTP flow
      console.log('[Phone Auth] New user, sending OTP...');
      setIsExistingUser(false);
      return await sendOTP(phone);

    } catch (err: any) {
      console.error('[Phone Auth] Error:', err);
      // Fallback to OTP
      return await sendOTP(phone);
    }
  }, [toast]);

  const sendOTP = async (phone: string): Promise<boolean> => {
    try {
      // Initialize reCAPTCHA
      if (!recaptchaVerifierRef.current) {
        const container = document.getElementById('recaptcha-container');
        if (container) container.innerHTML = '';
        
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: failedAttempts >= 2 ? 'normal' : 'invisible',
        });
      }

      const confirmationResult = await signInWithPhoneNumber(auth, phone, recaptchaVerifierRef.current);
      confirmationResultRef.current = confirmationResult;
      
      setStep('otp');
      setCountdown(60);
      setLoading(false);
      
      toast({
        title: 'OTP Sent! 📱',
        description: `Code sent to ${phone}`,
      });

      return true;
    } catch (err: any) {
      console.error('[Firebase] OTP error:', err);
      setFailedAttempts(prev => prev + 1);
      
      let msg = 'Failed to send OTP';
      if (err.code === 'auth/invalid-phone-number') msg = 'Invalid phone number';
      else if (err.code === 'auth/too-many-requests') msg = 'Too many attempts. Try later.';
      else if (err.message?.includes('Hostname')) msg = 'Domain not authorized';
      
      setError(msg);
      setStep('phone');
      setLoading(false);
      recaptchaVerifierRef.current = null;
      return false;
    }
  };

  const verifyOTP = useCallback(async (otp: string): Promise<boolean> => {
    if (!confirmationResultRef.current) {
      setError('Session expired. Please try again.');
      return false;
    }

    setLoading(true);
    setError(null);
    setStep('syncing');

    try {
      const result = await confirmationResultRef.current.confirm(otp);
      const firebaseUser = result.user;
      
      // Create Supabase account
      const normalizedPhone = phoneNumber.replace(/\s/g, '');
      const email = `${normalizedPhone.replace(/\+/g, '')}@chatr.local`;
      const password = normalizedPhone;

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            phone_number: normalizedPhone,
            firebase_uid: firebaseUser.uid,
          }
        }
      });

      if (signUpError?.message?.includes('already registered')) {
        await supabase.auth.signInWithPassword({ email, password });
      }

      toast({
        title: 'Verified! ✅',
        description: 'Account created successfully',
      });

      return true;
    } catch (err: any) {
      console.error('[OTP Verify] Error:', err);
      setError(err.code === 'auth/invalid-verification-code' ? 'Invalid code' : 'Verification failed');
      setStep('otp');
      return false;
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, toast]);

  const resendOTP = useCallback(async (): Promise<boolean> => {
    if (countdown > 0) return false;
    recaptchaVerifierRef.current = null;
    return sendOTP(phoneNumber);
  }, [countdown, phoneNumber]);

  const reset = useCallback(() => {
    setStep('phone');
    setLoading(false);
    setError(null);
    setCountdown(0);
    setPhoneNumber('');
    setIsExistingUser(false);
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
    verifyOTP,
    resendOTP,
    reset,
    phoneNumber,
    isExistingUser,
  };
};
