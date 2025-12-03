import { memo } from 'react';
import chatrIconLogo from '@/assets/chatr-icon-logo.png';

interface PageLoadingProps {
  message?: string;
  showLogo?: boolean;
}

/**
 * Consistent full-page loading state used across all pages
 * Replaces inconsistent loading patterns (spinners vs skeletons)
 */
export const PageLoading = memo(({ message = 'Loading...', showLogo = true }: PageLoadingProps) => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      {showLogo && (
        <img 
          src={chatrIconLogo} 
          alt="Chatr" 
          className="h-16 w-16 animate-pulse"
          width={64}
          height={64}
        />
      )}
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
});

PageLoading.displayName = 'PageLoading';

/**
 * Inline loading spinner for buttons and small areas
 */
export const InlineSpinner = memo(({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3'
  };

  return (
    <div className={`${sizeClasses[size]} border-current border-t-transparent rounded-full animate-spin`} />
  );
});

InlineSpinner.displayName = 'InlineSpinner';

/**
 * Card loading skeleton for grid layouts
 */
export const CardSkeleton = memo(({ count = 4 }: { count?: number }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl bg-card border border-border p-4 space-y-3">
          <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
          <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
          <div className="h-3 bg-muted/60 animate-pulse rounded w-1/2" />
        </div>
      ))}
    </div>
  );
});

CardSkeleton.displayName = 'CardSkeleton';

/**
 * List loading skeleton for list layouts
 */
export const ListSkeleton = memo(({ count = 5 }: { count?: number }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
          <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded w-1/3" />
            <div className="h-3 bg-muted/60 animate-pulse rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
});

ListSkeleton.displayName = 'ListSkeleton';
