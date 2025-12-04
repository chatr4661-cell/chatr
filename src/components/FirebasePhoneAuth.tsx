import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, ArrowRight, RefreshCw, CheckCircle } from 'lucide-react';
import { CountryCodeSelector } from './CountryCodeSelector';
import { useFirebasePhoneAuth } from '@/hooks/useFirebasePhoneAuth';
import { cn } from '@/lib/utils';

interface OTPInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
}

const OTPInput: React.FC<OTPInputProps> = ({ 
  length = 6, 
  value, 
  onChange, 
  onComplete,
  disabled 
}) => {
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

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
            "w-12 h-14 text-center text-xl font-bold",
            "border-2 rounded-xl transition-all duration-200",
            value[index] 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/30 bg-background",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          autoFocus={index === 0}
        />
      ))}
    </div>
  );
};

export const FirebasePhoneAuth: React.FC = () => {
  const {
    step,
    loading,
    error,
    countdown,
    checkPhoneAndProceed,
    verifyOTP,
    resendOTP,
    reset,
    phoneNumber: verifiedPhone,
    isExistingUser,
  } = useFirebasePhoneAuth();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [otp, setOtp] = useState('');

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (phoneNumber.length < 10) {
      return;
    }

    const fullPhone = `${countryCode}${phoneNumber}`;
    await checkPhoneAndProceed(fullPhone);
  };

  const handleOTPComplete = async (code: string) => {
    await verifyOTP(code);
  };

  const handleResend = async () => {
    setOtp('');
    await resendOTP();
  };

  const handleBack = () => {
    setOtp('');
    reset();
  };

  return (
    <>
      {/* Hidden reCAPTCHA container */}
      <style>{`
        .grecaptcha-badge { visibility: hidden !important; }
      `}</style>
      <div id="recaptcha-container" />

      <Card className="w-full bg-white/90 backdrop-blur-sm border-white/20 shadow-xl">
        <CardHeader className="space-y-2 pb-4">
          <CardTitle className="text-2xl font-bold text-foreground">
            {step === 'phone' && 'Welcome'}
            {step === 'otp' && 'Verify Phone'}
            {step === 'syncing' && 'Signing in...'}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {step === 'phone' && 'Enter your phone number to continue'}
            {step === 'otp' && `Enter the 6-digit OTP sent to ${countryCode} ${phoneNumber}`}
            {step === 'syncing' && 'Please wait...'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Phone Number Input */}
          {step === 'phone' && (
            <form onSubmit={handlePhoneSubmit} className="space-y-5">
              <div className="space-y-3">
                <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                  Phone Number
                </Label>
                <div className="flex gap-3">
                  <CountryCodeSelector
                    value={countryCode}
                    onChange={setCountryCode}
                  />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Your phone number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 h-14 text-base bg-white border-2 border-gray-200 focus:border-primary rounded-xl transition-all"
                    required
                    autoFocus
                    maxLength={15}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  New users will receive a verification OTP. Existing users login instantly.
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all"
                disabled={loading || phoneNumber.length < 10}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {isExistingUser ? 'Logging in...' : 'Checking...'}
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* OTP Verification (New Users Only) */}
          {step === 'otp' && (
            <div className="space-y-5">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="mb-2 hover:bg-muted/50 rounded-lg"
                disabled={loading}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Change Number
              </Button>

              <div className="space-y-4">
                <OTPInput
                  length={6}
                  value={otp}
                  onChange={setOtp}
                  onComplete={handleOTPComplete}
                  disabled={loading}
                />

                {/* Resend Timer */}
                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Resend OTP in <span className="font-semibold text-primary">{countdown}s</span>
                    </p>
                  ) : (
                    <Button
                      variant="ghost"
                      onClick={handleResend}
                      disabled={loading}
                      className="text-primary hover:text-primary/80"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Resend OTP
                    </Button>
                  )}
                </div>
              </div>

              <Button
                onClick={() => handleOTPComplete(otp)}
                disabled={loading || otp.length < 6}
                className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white font-semibold text-base rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Verify OTP
                    <CheckCircle className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Syncing State */}
          {step === 'syncing' && (
            <div className="flex flex-col items-center justify-center gap-4 py-8">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                <Loader2 className="h-12 w-12 animate-spin text-primary relative" />
              </div>
              <div className="text-center">
                <p className="font-medium">
                  {isExistingUser ? 'Welcome back!' : 'Setting up your account...'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  This will only take a moment
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};
