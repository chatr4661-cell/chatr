import React from 'react';
import { cn } from '@/lib/utils';

interface AppleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'elevated' | 'grouped';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  pressable?: boolean;
  onPress?: () => void;
  /** Shorthand for variant="glass" */
  glass?: boolean;
}

/**
 * Apple-style Card Component
 * Features:
 * - Rounded corners (iOS-like)
 * - Subtle shadows
 * - Glass morphism option
 * - Press feedback with haptics
 */
export const AppleCard = React.forwardRef<HTMLDivElement, AppleCardProps>(
  ({ 
    children, 
    className, 
    variant = 'default',
    padding = 'none',
    rounded = 'xl',
    pressable = false,
    onPress,
    onClick,
    glass = false,
    ...props 
  }, ref) => {
    // Handle glass shorthand prop
    const effectiveVariant = glass ? 'glass' : variant;
    
    const paddingClasses = {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    };

    const roundedClasses = {
      sm: 'rounded-lg',
      md: 'rounded-xl',
      lg: 'rounded-2xl',
      xl: 'rounded-3xl',
      '2xl': 'rounded-[2rem]',
      full: 'rounded-full',
    };

    const variantClasses = {
      default: 'bg-card border border-border/50 shadow-card',
      glass: 'bg-card/80 backdrop-blur-xl border border-border/30 shadow-elevated',
      elevated: 'bg-card shadow-elevated border-0',
      grouped: 'bg-secondary/50 border-0 shadow-none',
    };

    const isClickable = pressable || onPress || onClick;

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (onPress) {
        onPress();
      }
      onClick?.(e);
    };

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'relative overflow-hidden transition-all duration-200',
          variantClasses[effectiveVariant],
          roundedClasses[rounded],
          paddingClasses[padding],
          // Pressable styles
          isClickable && [
            'cursor-pointer',
            'active:scale-[0.98]',
            'active:opacity-90',
            'touch-manipulation',
          ],
          className
        )}
        onClick={handleClick}
        style={{ WebkitTapHighlightColor: 'transparent' }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

/**
 * Apple-style Grouped List Container
 * Like iOS Settings grouped table view
 */
export const AppleGroupedList = ({ 
  children, 
  className,
  header,
  footer,
}: { 
  children: React.ReactNode;
  className?: string;
  header?: string;
  footer?: string;
}) => (
  <div className={cn('space-y-1', className)}>
    {header && (
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-4 pb-1">
        {header}
      </p>
    )}
    <AppleCard variant="default" padding="none" rounded="xl" className="divide-y divide-border/50">
      {children}
    </AppleCard>
    {footer && (
      <p className="text-xs text-muted-foreground px-4 pt-1">
        {footer}
      </p>
    )}
  </div>
);

/**
 * Apple-style List Item
 */
export const AppleListItem = ({
  children,
  className,
  onClick,
  leading,
  trailing,
  icon,
  title,
  subtitle,
  chevron,
  value,
  last,
  destructive,
}: {
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  /** Icon on the left side */
  icon?: React.ReactNode;
  /** Title text */
  title?: string;
  /** Subtitle text */
  subtitle?: string;
  /** Show chevron indicator */
  chevron?: boolean;
  /** Value display on right side */
  value?: React.ReactNode;
  /** Is this the last item */
  last?: boolean;
  /** Destructive style */
  destructive?: boolean;
}) => {
  // Use leading prop, or wrap icon in a styled container
  const effectiveLeading = leading || (icon && (
    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
      {icon}
    </div>
  ));

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3.5 min-h-[52px]',
        'transition-colors duration-150',
        onClick && 'cursor-pointer active:bg-muted/50 touch-manipulation',
        className
      )}
      onClick={onClick}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {effectiveLeading && <div className="flex-shrink-0">{effectiveLeading}</div>}
      <div className="flex-1 min-w-0">
        {title && (
          <p className={cn(
            'text-[17px] leading-tight',
            destructive ? 'text-destructive' : 'text-foreground'
          )}>
            {title}
          </p>
        )}
        {subtitle && (
          <p className="text-sm text-muted-foreground truncate">
            {subtitle}
          </p>
        )}
        {children}
      </div>
      {value && (
        <span className="text-muted-foreground text-[15px] flex-shrink-0">
          {value}
        </span>
      )}
      {trailing && <div className="flex-shrink-0 text-muted-foreground">{trailing}</div>}
      {chevron && (
        <svg className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );
};

export default AppleCard;
