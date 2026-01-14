import React from 'react';
import { cn } from '@/lib/utils';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';

interface AppleToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Apple-style Toggle Switch
 * Features:
 * - iOS-like appearance
 * - Smooth spring animation
 * - Haptic feedback
 */
export const AppleToggle: React.FC<AppleToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  className,
}) => {
  const haptics = useNativeHaptics();

  const handleToggle = () => {
    if (disabled) return;
    haptics.light();
    onChange(!checked);
  };

  const sizeClasses = {
    sm: { track: 'w-10 h-6', thumb: 'w-5 h-5', translate: 'translate-x-4' },
    md: { track: 'w-12 h-7', thumb: 'w-6 h-6', translate: 'translate-x-5' },
    lg: { track: 'w-14 h-8', thumb: 'w-7 h-7', translate: 'translate-x-6' },
  };

  const currentSize = sizeClasses[size];

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={handleToggle}
      disabled={disabled}
      className={cn(
        'relative inline-flex flex-shrink-0',
        'rounded-full',
        'transition-colors duration-200 ease-in-out',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        'touch-manipulation',
        // Track
        currentSize.track,
        // Colors
        checked ? 'bg-primary' : 'bg-muted',
        // Disabled
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Thumb */}
      <span
        className={cn(
          'absolute top-0.5 left-0.5',
          'pointer-events-none inline-block',
          'rounded-full bg-white',
          'shadow-md',
          'transition-transform duration-200 ease-out',
          // Size
          currentSize.thumb,
          // Position
          checked && currentSize.translate
        )}
      />
    </button>
  );
};

export default AppleToggle;
