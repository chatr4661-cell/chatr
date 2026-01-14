import React from 'react';
import { cn } from '@/lib/utils';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';
import { Loader2 } from 'lucide-react';

interface AppleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  rounded?: 'md' | 'lg' | 'xl' | 'full';
  haptic?: 'light' | 'medium' | 'heavy' | 'none';
}

/**
 * Apple-style Button Component
 * Features:
 * - SF Pro-like typography
 * - Smooth press animations
 * - Haptic feedback
 * - Glass morphism option
 * - Loading state
 */
export const AppleButton = React.forwardRef<HTMLButtonElement, AppleButtonProps>(
  ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    loading = false,
    icon,
    iconPosition = 'left',
    rounded = 'xl',
    haptic = 'medium',
    disabled,
    onClick,
    ...props
  }, ref) => {
    const haptics = useNativeHaptics();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;
      
      // Trigger haptic feedback
      if (haptic !== 'none') {
        haptics[haptic]?.();
      }
      
      onClick?.(e);
    };

    const variantClasses = {
      primary: [
        'bg-primary text-primary-foreground',
        'shadow-sm',
        'active:bg-primary/90',
      ],
      secondary: [
        'bg-secondary text-secondary-foreground',
        'active:bg-secondary/80',
      ],
      ghost: [
        'bg-transparent text-primary',
        'active:bg-primary/10',
      ],
      destructive: [
        'bg-destructive text-destructive-foreground',
        'active:bg-destructive/90',
      ],
      glass: [
        'bg-white/20 text-foreground',
        'backdrop-blur-xl border border-white/30',
        'active:bg-white/30',
      ],
    };

    const sizeClasses = {
      sm: 'h-9 px-4 text-sm gap-1.5',
      md: 'h-11 px-5 text-base gap-2',
      lg: 'h-12 px-6 text-base gap-2',
      xl: 'h-14 px-8 text-lg gap-2.5',
    };

    const roundedClasses = {
      md: 'rounded-lg',
      lg: 'rounded-xl',
      xl: 'rounded-2xl',
      full: 'rounded-full',
    };

    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center',
          'font-semibold',
          'transition-all duration-150 ease-out',
          'touch-manipulation',
          // Press animation
          'active:scale-[0.97]',
          // Size
          sizeClasses[size],
          // Rounded
          roundedClasses[rounded],
          // Variant
          variantClasses[variant],
          // Full width
          fullWidth && 'w-full',
          // Disabled
          (disabled || loading) && 'opacity-50 pointer-events-none',
          className
        )}
        onClick={handleClick}
        disabled={disabled || loading}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
            {children}
            {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
          </>
        )}
      </button>
    );
  }
);

AppleButton.displayName = 'AppleButton';

/**
 * Apple-style Icon Button
 */
export const AppleIconButton = React.forwardRef<
  HTMLButtonElement,
  {
    icon: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'filled' | 'glass' | 'ghost';
    className?: string;
    onClick?: (e?: React.MouseEvent) => void;
    disabled?: boolean;
  }
>(({ icon, size = 'md', variant = 'default', className, onClick, disabled }, ref) => {
  const haptics = useNativeHaptics();

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    haptics.light();
    onClick?.(e);
  };

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const variantClasses = {
    default: 'text-primary active:bg-muted',
    filled: 'bg-primary/10 text-primary active:bg-primary/20',
    glass: 'bg-white/20 backdrop-blur-lg text-foreground active:bg-white/30',
    ghost: 'text-primary active:bg-primary/10',
  };

  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center',
        'rounded-full',
        'transition-all duration-150',
        'active:scale-95',
        'touch-manipulation',
        sizeClasses[size],
        variantClasses[variant],
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
      onClick={handleClick}
      disabled={disabled}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {icon}
    </button>
  );
});

AppleIconButton.displayName = 'AppleIconButton';

export default AppleButton;
