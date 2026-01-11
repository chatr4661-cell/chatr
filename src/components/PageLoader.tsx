import React from 'react';

/**
 * Lightweight page loader for Suspense fallbacks
 * Uses shimmer animation for perceived performance
 */
export const PageLoader: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Animated logo placeholder */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/40 animate-pulse" />
        
        {/* Loading shimmer bars */}
        <div className="flex flex-col gap-2 w-48">
          <div className="h-3 bg-muted rounded-full animate-shimmer" style={{ width: '100%' }} />
          <div className="h-3 bg-muted rounded-full animate-shimmer" style={{ width: '75%', animationDelay: '0.1s' }} />
          <div className="h-3 bg-muted rounded-full animate-shimmer" style={{ width: '50%', animationDelay: '0.2s' }} />
        </div>
      </div>
    </div>
  );
};

/**
 * Minimal inline loader for smaller components
 */
export const InlineLoader: React.FC = () => (
  <div className="flex items-center justify-center p-4">
    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);
