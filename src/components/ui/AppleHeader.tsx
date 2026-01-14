import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';

interface AppleHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  leftAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  /** Alias for rightAction */
  rightElement?: React.ReactNode;
  transparent?: boolean;
  large?: boolean;
  className?: string;
}

/**
 * Apple-style Navigation Header
 * Features:
 * - Large title support (iOS 11+)
 * - Blur background
 * - Safe area insets
 * - Back button with haptics
 */
export const AppleHeader: React.FC<AppleHeaderProps> = ({
  title,
  subtitle,
  showBack = true,
  onBack,
  leftAction,
  rightAction,
  rightElement,
  transparent = false,
  large = false,
  className,
}) => {
  // Support both rightAction and rightElement
  const effectiveRightAction = rightAction || rightElement;
  const navigate = useNavigate();
  const haptics = useNativeHaptics();

  const handleBack = () => {
    haptics.light();
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <>
      {/* Header container */}
      <header
        className={cn(
          // Base styles
          'fixed top-0 left-0 right-0 z-50',
          'flex flex-col',
          // Safe area for notched devices
          'pt-[max(env(safe-area-inset-top),0px)]',
          // Background
          transparent 
            ? 'bg-transparent' 
            : 'bg-background/80 backdrop-blur-xl border-b border-border/50',
          className
        )}
      >
        {/* Compact header row */}
        <div className="flex items-center justify-between h-11 px-1">
          {/* Left side - Back button or custom action */}
          <div className="flex items-center min-w-[60px]">
            {leftAction || (showBack && (
              <button
                onClick={handleBack}
                className={cn(
                  'flex items-center gap-0.5 px-2 py-2',
                  'text-primary font-medium',
                  'transition-opacity active:opacity-60',
                  'touch-manipulation'
                )}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <ChevronLeft className="w-6 h-6" strokeWidth={2.5} />
                <span className="text-[17px]">Back</span>
              </button>
            ))}
          </div>

          {/* Center - Title (compact mode) */}
          {!large && title && (
            <div className="flex-1 flex flex-col items-center justify-center min-w-0">
              <h1 className="text-[17px] font-semibold text-foreground truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate">
                  {subtitle}
                </p>
              )}
            </div>
          )}

          {/* Right side - Custom action */}
          <div className="flex items-center justify-end min-w-[60px]">
            {effectiveRightAction}
          </div>
        </div>

        {/* Large title (iOS 11+ style) */}
        {large && title && (
          <div className="px-4 pb-2 pt-1">
            <h1 className="text-[34px] font-bold text-foreground leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </header>

      {/* Spacer to push content below header */}
      <div 
        className={cn(
          'pt-[max(env(safe-area-inset-top),0px)]',
          large ? 'h-[calc(44px+60px+env(safe-area-inset-top))]' : 'h-[calc(44px+env(safe-area-inset-top))]'
        )} 
      />
    </>
  );
};

/**
 * Apple-style Action Button for header
 */
export const AppleHeaderAction: React.FC<{
  icon?: React.ReactNode;
  label?: string;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'destructive';
}> = ({ icon, label, onClick, variant = 'default' }) => {
  const haptics = useNativeHaptics();

  const handleClick = () => {
    haptics.light();
    onClick?.();
  };

  const variantClasses = {
    default: 'text-primary',
    primary: 'text-primary font-semibold',
    destructive: 'text-destructive',
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-1 px-3 py-2',
        'text-[17px]',
        variantClasses[variant],
        'transition-opacity active:opacity-60',
        'touch-manipulation'
      )}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
};

export default AppleHeader;
