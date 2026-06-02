import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { auth } from '@/firebase';
import { supabase } from '@/integrations/supabase/client';

// On native (Android/iOS) Firebase verifies the phone number through
// Play Integrity / APNs — NO web reCAPTCHA and NO authorized-domain check.
// On web we keep the invisible reCAPTCHA flow.
const isNative = Capacitor.isNativePlatform();

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
  
  const [step, setStep] = useState<PhoneAuthStep>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [recaptchaReady, setRecaptchaReady] = useState(false);
  
  // Web flow
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  // Native flow
  const verificationIdRef = useRef<string | null>(null);

  // PRE-INITIALIZE reCAPTCHA on mount for instant OTP (web only)
  useEffect(() => {
    if (isNative) {
      setRecaptchaReady(true);
      return;
    }

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
        console.log('✅ [Auth] Welcome back');
        setLoading(false);
        return true;
      }
    } catch {
      // Continue to OTP
    }

    // New user - send OTP immediately
    setIsExistingUser(false);
    return await sendOTP(phone);
  }, []);

  /**
   * Native phone verification (Android/iOS) — uses the device's native
   * Firebase SDK. Resolves with a verificationId once the SMS is dispatched.
   */
  const sendOTPNative = async (phone: string): Promise<boolean> => {
    try {
      const verificationId = await new Promise<string>(async (resolve, reject) => {
        let codeListener: { remove: () => Promise<void> } | null = null;
        try {
          codeListener = await (FirebaseAuthentication as any).addListener(
            'phoneCodeSent',
            async (event: { verificationId: string }) => {
              await codeListener?.remove();
              resolve(event.verificationId);
            }
          );

          await FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber: phone });
        } catch (e) {
          await codeListener?.remove();
          reject(e);
        }
      });

      verificationIdRef.current = verificationId;
      setStep('otp');
      setCountdown(30);
      setLoading(false);
      console.log('📱 [Auth] OTP sent successfully (native)');
      return true;
    } catch (err: any) {
      console.error('[Firebase Native] OTP error:', err);
      setFailedAttempts(prev => prev + 1);

      let msg = 'Failed to send OTP';
      const code: string = err?.code || err?.message || '';
      if (/invalid.*phone|phone.*invalid/i.test(code)) {
        msg = 'Invalid phone number';
      } else if (/too-many|quota/i.test(code)) {
        msg = 'Too many attempts. Please wait and try again.';
        setCountdown(180);
      } else if (/network/i.test(code)) {
        msg = 'Network error. Check your connection and try again.';
      }

      setError(msg);
      setStep('phone');
      setLoading(false);
      return false;
    }
  };

  const sendOTP = async (phone: string): Promise<boolean> => {
    if (isNative) {
      return sendOTPNative(phone);
    }

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
      
      console.log('📱 [Auth] OTP sent successfully');

      return true;
    } catch (err: any) {
      console.error('[Firebase] OTP error:', err);
      setFailedAttempts(prev => prev + 1);
      
      let msg = 'Failed to send OTP';
      let waitTime = 0;
      
      if (err.code === 'auth/invalid-phone-number') {
        msg = 'Invalid phone number';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many attempts. Please wait and try again.';
        waitTime = 180;
      } else if (
        err.code === 'auth/captcha-check-failed' ||
        err.message?.includes('Hostname')
      ) {
        // This domain is not listed in Firebase Authorized Domains.
        // Add the app's current domain in Firebase Console → Authentication → Settings.
        msg = `This app's domain (${window.location.hostname}) is not authorized for OTP. Please add it to Firebase Authorized Domains.`;
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Network error. Check your connection and try again.';
      }
      
      setError(msg);
      if (waitTime > 0) setCountdown(waitTime);
      setStep('phone');
      setLoading(false);
      recaptchaVerifierRef.current = null;
      return false;
    }
  };

  /**
   * Exchange a verified Firebase user for a Supabase session via edge function.
   */
  const completeSupabaseSession = async (firebaseUid: string): Promise<boolean> => {
    const normalizedPhone = phoneNumber.replace(/\s/g, '');

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/firebase-phone-auth`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          phone_number: normalizedPhone,
          firebase_uid: firebaseUid,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || 'Authentication failed');
    }

    if (data.session) {
      await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      });
    }

    return true;
  };

  const verifyOTP = useCallback(async (otp: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      let firebaseUid: string | undefined;

      if (isNative) {
        if (!verificationIdRef.current) {
          setError('Session expired. Please try again.');
          setLoading(false);
          return false;
        }
        // Step 1: Confirm code with native Firebase SDK
        await FirebaseAuthentication.confirmVerificationCode({
          verificationId: verificationIdRef.current,
          verificationCode: otp,
        });
        const { user } = await FirebaseAuthentication.getCurrentUser();
        firebaseUid = user?.uid;
      } else {
        if (!confirmationResultRef.current) {
          setError('Session expired. Please try again.');
          setLoading(false);
          return false;
        }
        // Step 1: Verify OTP with Firebase web SDK (~1-2s)
        const result = await confirmationResultRef.current.confirm(otp);
        firebaseUid = result.user.uid;
      }

      if (!firebaseUid) {
        throw new Error('Verification failed');
      }

      // Step 2: Exchange for a Supabase session
      await completeSupabaseSession(firebaseUid);

      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('[OTP Verify] Error:', err);
      const codeStr: string = err?.code || err?.message || '';
      const msg = /invalid.*(verification|code)|code.*invalid/i.test(codeStr)
        ? 'Invalid code. Please check and try again.'
        : err.message || 'Verification failed';
      setError(msg);
      setLoading(false);
      return false;
    }
  }, [phoneNumber]);

  const resendOTP = useCallback(async (): Promise<boolean> => {
    if (countdown > 0) return false;
    if (!isNative) {
      recaptchaVerifierRef.current = null;
      setRecaptchaReady(false);
    }
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
    verificationIdRef.current = null;
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
