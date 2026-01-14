import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';

interface AppleGroupedListProps {
  children: React.ReactNode;
  header?: string;
  footer?: string;
  className?: string;
}

/**
 * Apple-style Grouped List Container
 * Similar to iOS Settings grouped table view
 */
export const AppleGroupedList: React.FC<AppleGroupedListProps> = ({
  children,
  header,
  footer,
  className,
}) => {
  return (
    <div className={cn('space-y-1', className)}>
      {header && (
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 pb-1">
          {header}
        </p>
      )}
      <div className="bg-card rounded-xl overflow-hidden divide-y divide-border/50">
        {children}
      </div>
      {footer && (
        <p className="text-xs text-muted-foreground px-4 pt-1">
          {footer}
        </p>
      )}
    </div>
  );
};

interface AppleListItemProps {
  children?: React.ReactNode;
  /** Icon on the left side */
  icon?: React.ReactNode;
  /** Leading element (alias for icon wrapper) */
  leading?: React.ReactNode;
  /** Title text */
  title?: string;
  /** Subtitle text */
  subtitle?: string;
  /** Trailing element on the right */
  trailing?: React.ReactNode;
  /** Show chevron indicator */
  chevron?: boolean;
  /** Value display on right side */
  value?: React.ReactNode;
  /** Is this the last item (no bottom border) */
  last?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Destructive style (red text) */
  destructive?: boolean;
  className?: string;
}

/**
 * Apple-style List Item
 * For use inside AppleGroupedList
 */
export const AppleListItem: React.FC<AppleListItemProps> = ({
  children,
  icon,
  leading,
  title,
  subtitle,
  trailing,
  chevron = false,
  value,
  last = false,
  onClick,
  destructive = false,
  className,
}) => {
  const haptics = useNativeHaptics();

  const handleClick = () => {
    if (onClick) {
      haptics.light();
      onClick();
    }
  };

  const effectiveLeading = leading || (icon && (
    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
      {icon}
    </div>
  ));

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 min-h-[44px]',
        'transition-colors duration-100',
        onClick && 'active:bg-muted/50 cursor-pointer',
        className
      )}
      onClick={handleClick}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {effectiveLeading}
      
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
        <span className="text-muted-foreground text-[15px]">
          {value}
        </span>
      )}
      
      {trailing}
      
      {chevron && (
        <ChevronRight className="w-5 h-5 text-muted-foreground/50 flex-shrink-0" />
      )}
    </div>
  );
};

export default AppleGroupedList;
