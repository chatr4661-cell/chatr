import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Button } from './ui/button';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';
import { cn } from '@/lib/utils';

interface NativeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  hapticFeedback?: 'light' | 'medium' | 'heavy';
}

/**
 * Button with native haptic feedback
 * Use this instead of regular Button for native feel
 */
export const NativeButton = forwardRef<HTMLButtonElement, NativeButtonProps>(
  ({ onClick, hapticFeedback = 'light', className, ...props }, ref) => {
    const haptics = useNativeHaptics();

    const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
      // Trigger haptic feedback
      if (hapticFeedback === 'light') await haptics.light();
      if (hapticFeedback === 'medium') await haptics.medium();
      if (hapticFeedback === 'heavy') await haptics.heavy();

      // Call original onClick
      onClick?.(e);
    };

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        className={cn(
          // Native-style transitions
          'transition-all duration-150 active:scale-95',
          className
        )}
        {...props}
      />
    );
  }
);

NativeButton.displayName = 'NativeButton';
