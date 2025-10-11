import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface PINInputProps {
  length?: number;
  onComplete: (pin: string) => void;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export const PINInput = ({ 
  length = 6,
  onComplete, 
  disabled = false,
  error = false,
  className 
}: PINInputProps) => {
  const [pin, setPin] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Auto-focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto-focus next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Call onComplete when all digits entered
    if (newPin.every(digit => digit !== '') && newPin.join('').length === length) {
      onComplete(newPin.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    // Handle paste
    if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        const digits = text.replace(/\D/g, '').slice(0, length);
        const newPin = [...pin];
        
        for (let i = 0; i < digits.length; i++) {
          if (index + i < length) {
            newPin[index + i] = digits[i];
          }
        }
        
        setPin(newPin);
        
        if (newPin.every(digit => digit !== '')) {
          onComplete(newPin.join(''));
        } else {
          const nextEmptyIndex = newPin.findIndex(d => d === '');
          if (nextEmptyIndex !== -1) {
            inputRefs.current[nextEmptyIndex]?.focus();
          }
        }
      });
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, length);
    
    const newPin = [...pin];
    for (let i = 0; i < digits.length; i++) {
      newPin[i] = digits[i];
    }
    
    setPin(newPin);
    
    if (newPin.every(digit => digit !== '')) {
      onComplete(newPin.join(''));
    }
  };

  const reset = () => {
    setPin(Array(length).fill(''));
    inputRefs.current[0]?.focus();
  };

  // Expose reset method
  useEffect(() => {
    (window as any).resetPIN = reset;
    return () => {
      delete (window as any).resetPIN;
    };
  }, []);

  return (
    <div className={cn("flex gap-2 justify-center flex-wrap", className)}>
      {pin.map((digit, index) => (
        <Input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            "w-14 h-14 text-center text-xl font-bold rounded-full",
            "bg-background border-2 border-primary/30",
            error && "border-destructive",
            "transition-all duration-200",
            "focus:scale-105 focus:border-primary focus:ring-2 focus:ring-primary/20",
            "shadow-sm"
          )}
          autoComplete="off"
        />
      ))}
    </div>
  );
};
