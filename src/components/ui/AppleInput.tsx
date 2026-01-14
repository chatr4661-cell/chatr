import React, { forwardRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, X, Eye, EyeOff } from 'lucide-react';

interface AppleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'outline';
  rounded?: 'md' | 'lg' | 'xl' | 'full';
  clearable?: boolean;
  onClear?: () => void;
}

/**
 * Apple-style Input Component
 * Features:
 * - iOS-like rounded design
 * - Floating label animation
 * - Clear button
 * - Error states
 */
export const AppleInput = forwardRef<HTMLInputElement, AppleInputProps>(
  ({
    className,
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    variant = 'filled',
    rounded = 'xl',
    clearable = false,
    onClear,
    type,
    value,
    onChange,
    ...props
  }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
    const hasValue = value !== undefined && value !== '';

    const variantClasses = {
      default: 'bg-transparent border border-border focus:border-primary',
      filled: 'bg-muted/50 border-0 focus:bg-muted/70',
      outline: 'bg-transparent border-2 border-border focus:border-primary',
    };

    const roundedClasses = {
      md: 'rounded-lg',
      lg: 'rounded-xl',
      xl: 'rounded-2xl',
      full: 'rounded-full',
    };

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label className="text-sm font-medium text-foreground pl-1">
            {label}
          </label>
        )}
        
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {leftIcon}
            </div>
          )}

          {/* Input */}
          <input
            ref={ref}
            type={inputType}
            value={value}
            onChange={onChange}
            className={cn(
              // Base styles
              'w-full h-12 px-4',
              'text-base text-foreground',
              'placeholder:text-muted-foreground',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary/20',
              // Variant
              variantClasses[variant],
              // Rounded
              roundedClasses[rounded],
              // Icons padding
              leftIcon && 'pl-10',
              (rightIcon || clearable || isPassword) && 'pr-10',
              // Error state
              error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
              className
            )}
            {...props}
          />

          {/* Right side icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {/* Clear button */}
            {clearable && hasValue && (
              <button
                type="button"
                onClick={onClear}
                className="p-1 rounded-full bg-muted/80 text-muted-foreground hover:bg-muted transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Password toggle */}
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="p-1 text-muted-foreground"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            )}

            {/* Custom right icon */}
            {rightIcon && !isPassword && (
              <div className="text-muted-foreground">{rightIcon}</div>
            )}
          </div>
        </div>

        {/* Error or hint text */}
        {(error || hint) && (
          <p className={cn(
            'text-xs pl-1',
            error ? 'text-destructive' : 'text-muted-foreground'
          )}>
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

AppleInput.displayName = 'AppleInput';

/**
 * Apple-style Search Bar
 */
export const AppleSearchBar = forwardRef<
  HTMLInputElement,
  Omit<AppleInputProps, 'variant' | 'leftIcon'> & {
    onSearch?: (value: string) => void;
  }
>(({ className, onSearch, value, onChange, onClear, ...props }, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    onSearch?.(e.target.value);
  };

  return (
    <AppleInput
      ref={ref}
      variant="filled"
      rounded="xl"
      leftIcon={<Search className="w-5 h-5" />}
      clearable
      value={value}
      onChange={handleChange}
      onClear={onClear}
      placeholder="Search"
      className={cn('h-10', className)}
      {...props}
    />
  );
});

AppleSearchBar.displayName = 'AppleSearchBar';

export default AppleInput;
