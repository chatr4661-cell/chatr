import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CountryCodeSelector } from '@/components/CountryCodeSelector';
import { useFirebasePhoneAuth } from '@/auth/useFirebasePhoneAuth';
import { BiometricLogin } from '@/components/BiometricLogin';
import { cn } from '@/lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
}

const CleanOTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled,
}) => {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // WebOTP API - Auto-read SMS on supported browsers
  useEffect(() => {
    if ('OTPCredential' in window) {
      const ac = new AbortController();
      navigator.credentials
        .get({
          // @ts-ignore - WebOTP API
          otp: { transport: ['sms'] },
          signal: ac.signal,
        })
        .then((otp: any) => {
          if (otp?.code) {
            onChange(otp.code);
            onComplete?.(otp.code);
          }
        })
        .catch(() => {});

      return () => ac.abort();
    }
  }, [onChange, onComplete]);

  const handleChange = (index: number, inputValue: string) => {
    if (disabled) return;
    const digit = inputValue.replace(/\D/g, '').slice(-1);
    const newValue = value.split('');
    newValue[index] = digit;
    const result = newValue.join('').slice(0, length);
    onChange(result);

    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (result.length === length && onComplete) {
      onComplete(result);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    onChange(pastedData);
    if (pastedData.length === length && onComplete) {
      onComplete(pastedData);
    }
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length }).map((_, index) => (
        <Input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          disabled={disabled}
          className={cn(
            "w-11 h-13 text-center text-lg font-bold rounded-xl transition-all",
            "bg-white border text-[#111817]",
            value[index]
              ? "border-[#164E3F] ring-1 ring-[#164E3F] bg-[#E8F0EB]/30"
              : "border-[#DDE3DF] hover:border-stone-400",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          autoFocus={index === 0}
        />
      ))}
    </div>
  );
};

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const {
    step,
    loading,
    error,
    countdown,
    checkPhoneAndProceed,
    verifyOTP,
    resendOTP,
    reset,
  } = useFirebasePhoneAuth();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [otp, setOtp] = useState('');

  // Handle phone submit
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length < 10) return;
    const fullPhone = `${countryCode}${phoneNumber}`;
    await checkPhoneAndProceed(fullPhone);
  };

  // Handle OTP completion
  const handleOTPComplete = async (code: string) => {
    const success = await verifyOTP(code);
    if (success && onSuccess) {
      onSuccess();
    }
  };

  const handleResend = async () => {
    setOtp('');
    await resendOTP();
  };

  const handleBack = () => {
    setOtp('');
    reset();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Invisible reCAPTCHA container for Firebase */}
      <div id="recaptcha-container" />

      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Surface */}
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-[#DDE3DF] shadow-2xl p-6 sm:p-8 z-10 animate-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-stone-400 hover:text-[#111817] hover:bg-[#F8F8F5] transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Back Button during OTP */}
        {step === 'otp' && (
          <button
            onClick={handleBack}
            className="absolute top-5 left-5 p-2 rounded-full text-stone-500 hover:text-[#111817] hover:bg-[#F8F8F5] transition-colors flex items-center gap-1 text-xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        )}

        {/* Brand Header */}
        <div className="text-center space-y-2 mt-2 mb-6">
          <div className="flex justify-center mb-2">
            <img 
              src="/images/chatr-official-logo.png" 
              alt="CHATR" 
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-[#111817]">
            {step === 'phone' ? 'Welcome' : 'Verify Phone'}
          </h2>

          <p className="text-xs sm:text-sm text-[#53605C] max-w-xs mx-auto">
            {step === 'phone'
              ? 'Enter your phone number to continue'
              : `Enter the 6-digit OTP sent to ${countryCode} ${phoneNumber}`}
          </p>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Step 1: Phone Form */}
        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="auth-modal-phone" className="text-xs font-semibold text-[#111817]">
                Phone Number
              </Label>
              <div className="flex gap-2">
                <CountryCodeSelector
                  value={countryCode}
                  onChange={setCountryCode}
                  className="bg-white border-[#DDE3DF] text-[#111817] hover:bg-[#F8F8F5] hover:text-[#111817]"
                />
                <Input
                  id="auth-modal-phone"
                  type="tel"
                  placeholder="Your phone number"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  className="flex-1 h-12 text-sm bg-white border border-[#DDE3DF] text-[#111817] focus-visible:border-[#164E3F] focus-visible:ring-1 focus-visible:ring-[#164E3F] focus-visible:ring-offset-0 focus:outline-none rounded-xl placeholder:text-stone-400"
                  required
                  autoFocus
                  maxLength={15}
                />
              </div>

              <div className="text-[11px] text-[#53605C] pt-1 space-y-0.5 leading-relaxed">
                <p>New users will receive a verification OTP.</p>
                <p className="font-semibold text-[#164E3F]">Existing users login instantly.</p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || phoneNumber.length < 10}
              className="w-full h-12 rounded-full bg-[#164E3F] hover:bg-[#2E6B59] text-white font-semibold text-sm shadow-sm transition-all cursor-pointer mt-3"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="pt-2">
              <BiometricLogin />
            </div>
          </form>
        )}

        {/* Step 2: OTP Verification */}
        {step === 'otp' && (
          <div className="space-y-5">
            <CleanOTPInput
              value={otp}
              onChange={setOtp}
              onComplete={handleOTPComplete}
              disabled={loading}
            />

            <Button
              onClick={() => handleOTPComplete(otp)}
              disabled={loading || otp.length !== 6}
              className="w-full h-12 rounded-full bg-[#164E3F] hover:bg-[#2E6B59] text-white font-semibold text-sm shadow-sm transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Verify & Continue</span>
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            <div className="text-center text-xs text-[#53605C]">
              {countdown > 0 ? (
                <span>Resend OTP in <strong className="text-[#111817]">{countdown}s</strong></span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="font-semibold text-[#164E3F] hover:underline cursor-pointer"
                >
                  Resend OTP
                </button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Syncing Session */}
        {step === 'syncing' && (
          <div className="py-8 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-[#164E3F] animate-spin mx-auto" />
            <h3 className="text-base font-bold text-[#111817]">Signing you in...</h3>
            <p className="text-xs text-[#53605C]">Securing workspace session</p>
          </div>
        )}

      </div>
    </div>
  );
};
