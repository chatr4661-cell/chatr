import React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';

interface AppleSheetProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  showHandle?: boolean;
  showClose?: boolean;
  height?: 'auto' | 'half' | 'full';
  className?: string;
}

/**
 * Apple-style Bottom Sheet
 * Features:
 * - Drag handle
 * - Smooth animations
 * - Backdrop blur
 * - Safe area support
 */
export const AppleSheet: React.FC<AppleSheetProps> = ({
  open,
  onClose,
  children,
  title,
  showHandle = true,
  showClose = true,
  height = 'auto',
  className,
}) => {
  const haptics = useNativeHaptics();

  const handleClose = () => {
    haptics.light();
    onClose();
  };

  const heightClasses = {
    auto: 'max-h-[90vh]',
    half: 'h-[50vh]',
    full: 'h-[95vh]',
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[200]',
          'bg-black/40 backdrop-blur-sm',
          'animate-ios-fade'
        )}
        onClick={handleClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed left-0 right-0 bottom-0 z-[201]',
          // Apple-style appearance
          'bg-background',
          'rounded-t-[2rem]',
          // Shadow
          'shadow-[0_-4px_30px_rgba(0,0,0,0.1)]',
          // Animation
          'animate-ios-slide-up',
          // Height
          heightClasses[height],
          // Safe area
          'pb-[max(1rem,env(safe-area-inset-bottom))]',
          className
        )}
      >
        {/* Drag Handle */}
        {showHandle && (
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-9 h-1 rounded-full bg-muted-foreground/30" />
          </div>
        )}

        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
            <div className="w-10">
              {/* Spacer for centering */}
            </div>
            
            {title && (
              <h2 className="text-base font-semibold text-foreground flex-1 text-center">
                {title}
              </h2>
            )}
            
            {showClose && (
              <button
                onClick={handleClose}
                className={cn(
                  'w-8 h-8 rounded-full',
                  'bg-muted/80 flex items-center justify-center',
                  'transition-colors active:bg-muted',
                  'touch-manipulation'
                )}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </>
  );
};

export default AppleSheet;
