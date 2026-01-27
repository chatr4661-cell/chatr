import React from 'react';

/**
 * INSTANT SKELETON COMPONENTS
 * Pre-built skeletons for common layouts to show instantly while content loads
 */

// Base skeleton shimmer styles
const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, hsl(var(--muted)) 25%, hsl(var(--muted) / 0.5) 50%, hsl(var(--muted)) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
};

// Chat list skeleton
export const ChatListSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <div className="flex flex-col divide-y divide-border">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-4" style={{ animationDelay: `${i * 50}ms` }}>
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
        
        {/* Content */}
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded-full w-3/4 animate-pulse" />
          <div className="h-3 bg-muted rounded-full w-1/2 animate-pulse" />
        </div>
        
        {/* Time */}
        <div className="h-3 bg-muted rounded-full w-12 animate-pulse" />
      </div>
    ))}
  </div>
);

// Message thread skeleton
export const MessageThreadSkeleton: React.FC = () => (
  <div className="flex flex-col gap-4 p-4">
    {/* Incoming messages */}
    {[0.6, 0.8, 0.5].map((width, i) => (
      <div key={`in-${i}`} className="flex items-end gap-2 max-w-[80%]">
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
        <div 
          className="h-16 bg-muted rounded-2xl rounded-bl-sm animate-pulse"
          style={{ width: `${width * 100}%`, animationDelay: `${i * 100}ms` }}
        />
      </div>
    ))}
    
    {/* Outgoing messages */}
    {[0.7, 0.4].map((width, i) => (
      <div key={`out-${i}`} className="flex justify-end">
        <div 
          className="h-12 bg-primary/20 rounded-2xl rounded-br-sm animate-pulse"
          style={{ width: `${width * 80}%`, animationDelay: `${(i + 3) * 100}ms` }}
        />
      </div>
    ))}
  </div>
);

// Home feed skeleton
export const HomeFeedSkeleton: React.FC = () => (
  <div className="flex flex-col gap-4 p-4">
    {/* Quick actions row */}
    <div className="flex gap-3 overflow-x-auto pb-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 min-w-[72px]">
          <div className="w-14 h-14 rounded-2xl bg-muted animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
          <div className="w-12 h-3 bg-muted rounded-full animate-pulse" />
        </div>
      ))}
    </div>
    
    {/* Featured card */}
    <div className="h-40 bg-muted rounded-2xl animate-pulse" />
    
    {/* Grid items */}
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" style={{ animationDelay: `${i * 75}ms` }} />
      ))}
    </div>
  </div>
);

// Profile skeleton
export const ProfileSkeleton: React.FC = () => (
  <div className="flex flex-col items-center gap-4 p-6">
    {/* Avatar */}
    <div className="w-24 h-24 rounded-full bg-muted animate-pulse" />
    
    {/* Name */}
    <div className="w-40 h-6 bg-muted rounded-full animate-pulse" />
    
    {/* Status */}
    <div className="w-24 h-4 bg-muted rounded-full animate-pulse" />
    
    {/* Stats row */}
    <div className="flex gap-8 mt-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-2">
          <div className="w-12 h-6 bg-muted rounded-lg animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
          <div className="w-16 h-3 bg-muted rounded-full animate-pulse" />
        </div>
      ))}
    </div>
    
    {/* Settings list */}
    <div className="w-full mt-6 space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
      ))}
    </div>
  </div>
);

// Calls list skeleton
export const CallsListSkeleton: React.FC = () => (
  <div className="flex flex-col divide-y divide-border">
    {Array.from({ length: 10 }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
        
        {/* Info */}
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded-full w-2/3 animate-pulse" />
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted rounded animate-pulse" />
            <div className="h-3 bg-muted rounded-full w-24 animate-pulse" />
          </div>
        </div>
        
        {/* Call button */}
        <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
      </div>
    ))}
  </div>
);

// Generic list skeleton
export const ListSkeleton: React.FC<{ count?: number; height?: number }> = ({ 
  count = 5, 
  height = 64 
}) => (
  <div className="flex flex-col gap-3 p-4">
    {Array.from({ length: count }).map((_, i) => (
      <div 
        key={i} 
        className="bg-muted rounded-xl animate-pulse"
        style={{ height, animationDelay: `${i * 50}ms` }}
      />
    ))}
  </div>
);

// Card grid skeleton
export const CardGridSkeleton: React.FC<{ count?: number; cols?: number }> = ({ 
  count = 6, 
  cols = 2 
}) => (
  <div className={`grid gap-3 p-4`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
    {Array.from({ length: count }).map((_, i) => (
      <div 
        key={i} 
        className="h-32 bg-muted rounded-xl animate-pulse"
        style={{ animationDelay: `${i * 50}ms` }}
      />
    ))}
  </div>
);

// Export skeleton component map for route-based selection
export const skeletonMap = {
  '/chat': ChatListSkeleton,
  '/calls': CallsListSkeleton,
  '/profile': ProfileSkeleton,
  '/home': HomeFeedSkeleton,
  default: ListSkeleton,
} as const;

// Get appropriate skeleton for route
export const getSkeletonForRoute = (path: string): React.FC => {
  const normalizedPath = path.split('/')[1] ? `/${path.split('/')[1]}` : path;
  return (skeletonMap as Record<string, React.FC>)[normalizedPath] || ListSkeleton;
};
