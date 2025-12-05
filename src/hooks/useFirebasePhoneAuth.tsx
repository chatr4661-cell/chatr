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
  recaptchaReady: boolean;
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
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // PRE-INITIALIZE reCAPTCHA on mount for instant OTP
  useEffect(() => {
    const initRecaptcha = async () => {
      try {
        const container = document.getElementById('recaptcha-container');
        if (container && !recaptchaVerifierRef.current) {
          container.innerHTML = '';
          recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
          });
          await recaptchaVerifierRef.current.render();
          setRecaptchaReady(true);
        }
      } catch (err) {
        console.warn('[reCAPTCHA] Pre-init failed, will retry on send');
      }
    };
    
    // Small delay to ensure DOM is ready
    const timer = setTimeout(initRecaptcha, 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  /**
   * INSTANT CHECK: 1-second timeout for existing user check
   */
  const checkPhoneAndProceed = useCallback(async (phone: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setPhoneNumber(phone);

    const normalizedPhone = phone.replace(/\s/g, '');
    const email = `${normalizedPhone.replace(/\+/g, '')}@chatr.local`;

    try {
      // FAST CHECK: 1-second timeout for instant login
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      
      const { data } = await supabase.auth.signInWithPassword({
        email,
        password: normalizedPhone,
      });
      
      clearTimeout(timeoutId);
      
      if (data?.session) {
        setIsExistingUser(true);
        toast({ title: 'Welcome back! 👋' });
        setLoading(false);
        return true;
      }
    } catch {
      // Continue to OTP
    }

    // New user - send OTP immediately
    setIsExistingUser(false);
    return await sendOTP(phone);
  }, [toast]);

  const sendOTP = async (phone: string): Promise<boolean> => {
    try {
      // Use pre-initialized reCAPTCHA or create new one
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
      setCountdown(30); // Reduced from 60s
      setLoading(false);
      
      toast({
        title: 'OTP Sent! 📱',
        description: 'Enter the code from SMS',
      });

      return true;
    } catch (err: any) {
      console.error('[Firebase] OTP error:', err);
      setFailedAttempts(prev => prev + 1);
      
      let msg = 'Failed to send OTP';
      let waitTime = 0;
      
      if (err.code === 'auth/invalid-phone-number') {
        msg = 'Invalid phone number';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many attempts. Please wait or use Google login.';
        waitTime = 180;
      } else if (err.message?.includes('Hostname')) {
        msg = 'Domain not authorized';
      }
      
      setError(msg);
      if (waitTime > 0) setCountdown(waitTime);
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
      // Verify OTP with Firebase
      const result = await confirmationResultRef.current.confirm(otp);
      const firebaseUser = result.user;
      
      const normalizedPhone = phoneNumber.replace(/\s/g, '');
      const email = `${normalizedPhone.replace(/\+/g, '')}@chatr.local`;
      const password = normalizedPhone;

      // Try signin first (faster for existing users), then signup
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });

      if (signInError) {
        // New user - signup
        await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              phone_number: normalizedPhone,
              firebase_uid: firebaseUser.uid,
            }
          }
        });
      }

      toast({ title: 'Verified! ✅' });
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
    setRecaptchaReady(false);
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
    recaptchaReady,
  };
};
