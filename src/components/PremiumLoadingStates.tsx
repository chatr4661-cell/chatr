/**
 * Premium Loading States
 * Beautiful loading skeletons and spinners for the entire app
 */

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Spinner - Smooth rotating loader
 */
export const Spinner = ({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <Loader2 
      className={cn(
        'animate-spin text-primary',
        sizeClasses[size],
        className
      )}
    />
  );
};

/**
 * Full Page Loader
 */
export const PageLoader = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
    <div className="flex flex-col items-center gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-muted-foreground font-medium">Loading...</p>
    </div>
  </div>
);

/**
 * Skeleton - Shimmer loading effect
 */
export const Skeleton = ({ 
  className, 
  variant = 'default' 
}: { 
  className?: string; 
  variant?: 'default' | 'circular' | 'text';
}) => {
  return (
    <div
      className={cn(
        'shimmer bg-muted rounded-lg',
        variant === 'circular' && 'rounded-full',
        variant === 'text' && 'h-4',
        className
      )}
    />
  );
};

/**
 * Card Skeleton - Loading state for cards
 */
export const CardSkeleton = () => (
  <div className="native-card p-4 space-y-3 animate-in fade-in-50">
    <div className="flex items-center gap-3">
      <Skeleton variant="circular" className="h-12 w-12" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <Skeleton className="h-20 w-full" />
    <div className="flex gap-2">
      <Skeleton className="h-8 flex-1" />
      <Skeleton className="h-8 flex-1" />
    </div>
  </div>
);

/**
 * List Skeleton - Loading state for lists
 */
export const ListSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-2">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 animate-in fade-in-50" style={{ animationDelay: `${i * 50}ms` }}>
        <Skeleton variant="circular" className="h-10 w-10 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-2 w-1/2" />
        </div>
        <Skeleton className="h-6 w-6" />
      </div>
    ))}
  </div>
);

/**
 * Chat Message Skeleton
 */
export const ChatMessageSkeleton = () => (
  <div className="space-y-3 px-4">
    {/* Received message */}
    <div className="flex gap-2 animate-in slide-in-from-left-5 fade-in-50">
      <Skeleton variant="circular" className="h-8 w-8 flex-shrink-0" />
      <div className="space-y-2 flex-1 max-w-[75%]">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>

    {/* Sent message */}
    <div className="flex gap-2 justify-end animate-in slide-in-from-right-5 fade-in-50">
      <div className="space-y-2 flex-1 max-w-[75%]">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-3 w-20 ml-auto" />
      </div>
    </div>
  </div>
);

/**
 * Profile Skeleton
 */
export const ProfileSkeleton = () => (
  <div className="space-y-6 animate-in fade-in-50">
    {/* Header */}
    <div className="flex flex-col items-center gap-4">
      <Skeleton variant="circular" className="h-24 w-24" />
      <div className="text-center space-y-2">
        <Skeleton className="h-6 w-32 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
    </div>

    {/* Stats */}
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="text-center space-y-2">
          <Skeleton className="h-8 w-16 mx-auto" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
      ))}
    </div>

    {/* Content */}
    <div className="space-y-3">
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  </div>
);

/**
 * Grid Skeleton - For app grid layouts
 */
export const GridSkeleton = ({ count = 6, columns = 3 }: { count?: number; columns?: number }) => (
  <div className={cn(
    'grid gap-3',
    columns === 2 && 'grid-cols-2',
    columns === 3 && 'grid-cols-3',
    columns === 4 && 'grid-cols-4'
  )}>
    {Array.from({ length: count }).map((_, i) => (
      <div 
        key={i} 
        className="aspect-square flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-muted/30 animate-in fade-in-50"
        style={{ animationDelay: `${i * 50}ms` }}
      >
        <Skeleton variant="circular" className="h-12 w-12" />
        <Skeleton className="h-3 w-16" />
      </div>
    ))}
  </div>
);

/**
 * Inline Loader - Small inline loading state
 */
export const InlineLoader = ({ text }: { text?: string }) => (
  <div className="flex items-center gap-2 text-muted-foreground">
    <Spinner size="sm" />
    {text && <span className="text-sm">{text}</span>}
  </div>
);

/**
 * Button Loader - Loading state for buttons
 */
export const ButtonLoader = () => (
  <Spinner size="sm" className="mr-2" />
);

/**
 * Empty State - No data placeholder
 */
export const EmptyState = ({ 
  icon: Icon,
  title, 
  description,
  action 
}: { 
  icon?: any;
  title: string; 
  description?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-in fade-in-50 zoom-in-95">
    {Icon && (
      <div className="mb-4 p-4 rounded-full bg-muted/50">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
    )}
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    {description && (
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">
        {description}
      </p>
    )}
    {action}
  </div>
);
