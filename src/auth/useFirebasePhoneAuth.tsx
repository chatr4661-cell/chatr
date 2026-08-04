import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
} from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { auth } from './firebase';
import { supabase } from '@/integrations/supabase/client';
import { exchangeFirebaseSession } from './SessionManager';
import { registerCurrentDevice } from './DeviceManager';

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
   * Entry point from the phone screen.
   *
   * SECURITY: there is deliberately NO phone-number-derived credential path
   * here. A phone number is public information and must never act as a
   * password. Returning users get their fast path from a restored backend
   * session (see SessionManager/AuthProvider); anyone without a valid session
   * must prove ownership of the number via OTP.
   */
  const checkPhoneAndProceed = useCallback(async (phone: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    setPhoneNumber(phone);

    // A live session means the device is already authenticated — no OTP needed.
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      setIsExistingUser(true);
      setLoading(false);
      return true;
    }

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

  const verifyOTP = useCallback(async (otp: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      let idToken: string | undefined;

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
        const tokenResult = await FirebaseAuthentication.getIdToken({ forceRefresh: true });
        idToken = tokenResult?.token;
      } else {
        if (!confirmationResultRef.current) {
          setError('Session expired. Please try again.');
          setLoading(false);
          return false;
        }
        // Step 1: Verify OTP with Firebase web SDK (~1-2s)
        const result = await confirmationResultRef.current.confirm(otp);
        idToken = await result.user.getIdToken(true);
      }

      if (!idToken) {
        throw new Error('Verification failed');
      }

      // Step 2: Exchange the Google-verified ID token for a backend session.
      // The server re-verifies the token and mints the session — the client
      // never holds or derives a credential.
      await exchangeFirebaseSession({ phoneNumber, idToken });

      // Step 3: Register this device against the shared device_sessions table.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await registerCurrentDevice({ userId: user.id });
      }


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
