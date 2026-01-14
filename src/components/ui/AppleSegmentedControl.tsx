import React from 'react';
import { cn } from '@/lib/utils';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';

interface SegmentOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface AppleSegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

/**
 * Apple-style Segmented Control
 * Features:
 * - Smooth sliding indicator
 * - Haptic feedback
 * - iOS-like appearance
 */
export const AppleSegmentedControl: React.FC<AppleSegmentedControlProps> = ({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  className,
}) => {
  const haptics = useNativeHaptics();
  const activeIndex = options.findIndex(opt => opt.value === value);

  const handleSelect = (optionValue: string) => {
    if (optionValue !== value) {
      haptics.light();
      onChange(optionValue);
    }
  };

  const sizeClasses = {
    sm: 'h-8 text-xs',
    md: 'h-10 text-sm',
    lg: 'h-12 text-base',
  };

  return (
    <div
      className={cn(
        'relative inline-flex',
        // Background
        'bg-muted/70 rounded-xl p-1',
        // Full width
        fullWidth && 'w-full',
        sizeClasses[size],
        className
      )}
    >
      {/* Sliding indicator */}
      <div
        className={cn(
          'absolute top-1 bottom-1',
          'bg-background rounded-lg',
          'shadow-sm',
          'transition-transform duration-200 ease-out'
        )}
        style={{
          width: `calc(${100 / options.length}% - 4px)`,
          left: '2px',
          transform: `translateX(calc(${activeIndex * 100}% + ${activeIndex * 4}px))`,
        }}
      />

      {/* Options */}
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            className={cn(
              'relative z-10 flex-1',
              'flex items-center justify-center gap-1.5',
              'font-medium',
              'transition-colors duration-200',
              'touch-manipulation',
              // Text color
              isActive ? 'text-foreground' : 'text-muted-foreground'
            )}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {option.icon && (
              <span className="flex-shrink-0">{option.icon}</span>
            )}
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default AppleSegmentedControl;
