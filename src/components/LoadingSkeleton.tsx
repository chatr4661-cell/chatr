import { memo } from 'react';
import { useNetworkQuality } from '@/hooks/useNetworkQuality';

interface LoadingSkeletonProps {
  count?: number;
  height?: string;
  className?: string;
}

export const MessageListSkeleton = memo(({ count = 5 }: { count?: number }) => {
  const quality = useNetworkQuality();
  
  return (
    <div className="space-y-4 p-4">
      {quality === 'slow' && (
        <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 border border-orange-200 dark:border-orange-800 mb-4">
          <p className="text-sm text-orange-800 dark:text-orange-200 text-center">
            Loading on slow network... Please wait
          </p>
        </div>
      )}
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
          <div className="flex gap-2 max-w-[75%]">
            {i % 2 !== 0 && (
              <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
            )}
            <div className="space-y-2">
              <div className={`h-16 rounded-2xl bg-muted animate-pulse ${
                i % 2 === 0 ? 'w-48' : 'w-64'
              }`} />
              <div className="h-3 w-16 bg-muted/50 animate-pulse rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});

MessageListSkeleton.displayName = 'MessageListSkeleton';

export const ConversationListSkeleton = memo(({ count = 10 }: { count?: number }) => {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 p-3">
          <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded w-32" />
            <div className="h-3 bg-muted/70 animate-pulse rounded w-48" />
          </div>
          <div className="h-3 w-12 bg-muted/50 animate-pulse rounded" />
        </div>
      ))}
    </div>
  );
});

ConversationListSkeleton.displayName = 'ConversationListSkeleton';

export const ImageSkeleton = memo(({ className = '' }: { className?: string }) => {
  return (
    <div className={`bg-muted animate-pulse flex items-center justify-center ${className}`}>
      <svg className="w-12 h-12 text-muted-foreground/30" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
      </svg>
    </div>
  );
});

ImageSkeleton.displayName = 'ImageSkeleton';

export const LoadingSkeleton = memo(({ count = 1, height = 'h-4', className = '' }: LoadingSkeletonProps) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`${height} bg-muted animate-pulse rounded`} />
      ))}
    </div>
  );
});

LoadingSkeleton.displayName = 'LoadingSkeleton';
