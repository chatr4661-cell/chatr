/**
 * Native-quality skeleton loaders for instant perceived loading
 * Used during hydration before actual data is available
 */

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ============================================
// CHAT LIST SKELETON
// ============================================

export const ChatListSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => {
  return (
    <div className="flex flex-col gap-0 divide-y divide-border/50">
      {Array.from({ length: count }).map((_, i) => (
        <ChatListItemSkeleton key={i} delay={i * 50} />
      ))}
    </div>
  );
};

const ChatListItemSkeleton: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  return (
    <div 
      className="flex items-center gap-3 p-4 animate-in fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Avatar */}
      <Skeleton className="h-12 w-12 rounded-full shrink-0 shimmer" />
      
      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-4 w-32 shimmer" />
          <Skeleton className="h-3 w-12 shimmer" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-48 shimmer" />
          <Skeleton className="h-5 w-5 rounded-full shimmer" />
        </div>
      </div>
    </div>
  );
};

// ============================================
// MESSAGE LIST SKELETON
// ============================================

export const MessageListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  // Alternate between sent and received messages
  const messageTypes = ['received', 'sent', 'received', 'received', 'sent', 'received'];
  
  return (
    <div className="flex flex-col gap-2 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <MessageItemSkeleton 
          key={i} 
          type={messageTypes[i % messageTypes.length] as 'sent' | 'received'} 
          delay={i * 30}
        />
      ))}
    </div>
  );
};

const MessageItemSkeleton: React.FC<{ 
  type: 'sent' | 'received'; 
  delay?: number;
}> = ({ type, delay = 0 }) => {
  const isSent = type === 'sent';
  
  return (
    <div 
      className={cn(
        "flex animate-in fade-in",
        isSent ? "justify-end" : "justify-start"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn(
        "flex items-end gap-2",
        isSent ? "flex-row-reverse" : "flex-row"
      )}>
        {!isSent && (
          <Skeleton className="h-8 w-8 rounded-full shrink-0 shimmer" />
        )}
        <Skeleton 
          className={cn(
            "rounded-2xl shimmer",
            isSent 
              ? "bg-primary/20 h-10 w-36 rounded-br-md" 
              : "h-10 w-48 rounded-bl-md"
          )} 
        />
      </div>
    </div>
  );
};

// ============================================
// CALL HISTORY SKELETON
// ============================================

export const CallHistorySkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="flex flex-col gap-0 divide-y divide-border/50">
      {Array.from({ length: count }).map((_, i) => (
        <CallItemSkeleton key={i} delay={i * 40} />
      ))}
    </div>
  );
};

const CallItemSkeleton: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  return (
    <div 
      className="flex items-center gap-3 p-4 animate-in fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Avatar */}
      <Skeleton className="h-10 w-10 rounded-full shrink-0 shimmer" />
      
      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <Skeleton className="h-4 w-28 shimmer" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-3 rounded shimmer" />
          <Skeleton className="h-3 w-20 shimmer" />
        </div>
      </div>
      
      {/* Call button */}
      <Skeleton className="h-9 w-9 rounded-full shrink-0 shimmer" />
    </div>
  );
};

// ============================================
// PROFILE SKELETON
// ============================================

export const ProfileSkeleton: React.FC = () => {
  return (
    <div className="flex flex-col items-center gap-4 p-6 animate-in fade-in">
      {/* Avatar */}
      <Skeleton className="h-24 w-24 rounded-full shimmer" />
      
      {/* Name */}
      <Skeleton className="h-6 w-40 shimmer" />
      
      {/* Phone */}
      <Skeleton className="h-4 w-32 shimmer" />
      
      {/* Actions */}
      <div className="flex gap-4 mt-4">
        <Skeleton className="h-12 w-12 rounded-full shimmer" />
        <Skeleton className="h-12 w-12 rounded-full shimmer" />
        <Skeleton className="h-12 w-12 rounded-full shimmer" />
      </div>
    </div>
  );
};

// ============================================
// CONTACT LIST SKELETON
// ============================================

export const ContactListSkeleton: React.FC<{ count?: number }> = ({ count = 10 }) => {
  return (
    <div className="flex flex-col gap-0">
      {Array.from({ length: count }).map((_, i) => (
        <ContactItemSkeleton key={i} delay={i * 30} />
      ))}
    </div>
  );
};

const ContactItemSkeleton: React.FC<{ delay?: number }> = ({ delay = 0 }) => {
  return (
    <div 
      className="flex items-center gap-3 p-3 animate-in fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Skeleton className="h-10 w-10 rounded-full shrink-0 shimmer" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-36 shimmer" />
        <Skeleton className="h-3 w-24 shimmer" />
      </div>
    </div>
  );
};

// ============================================
// FULL PAGE SKELETON
// ============================================

export const PageLoadingSkeleton: React.FC<{ type?: 'chat' | 'calls' | 'contacts' | 'profile' }> = ({ 
  type = 'chat' 
}) => {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <Skeleton className="h-8 w-8 rounded shimmer" />
        <Skeleton className="h-5 w-32 shimmer" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-8 rounded shimmer" />
        <Skeleton className="h-8 w-8 rounded shimmer" />
      </div>
      
      {/* Content skeleton based on type */}
      <div className="flex-1 overflow-hidden">
        {type === 'chat' && <ChatListSkeleton />}
        {type === 'calls' && <CallHistorySkeleton />}
        {type === 'contacts' && <ContactListSkeleton />}
        {type === 'profile' && <ProfileSkeleton />}
      </div>
      
      {/* Bottom nav skeleton */}
      <div className="flex items-center justify-around p-4 border-t border-border/50">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-6 w-6 rounded shimmer" />
        ))}
      </div>
    </div>
  );
};

// ============================================
// SHIMMER ANIMATION STYLE
// ============================================

// Add this to index.css:
// .shimmer {
//   background: linear-gradient(
//     90deg,
//     hsl(var(--muted)) 0%,
//     hsl(var(--muted-foreground) / 0.1) 50%,
//     hsl(var(--muted)) 100%
//   );
//   background-size: 200% 100%;
//   animation: shimmer 1.5s infinite;
// }
// @keyframes shimmer {
//   0% { background-position: 200% 0; }
//   100% { background-position: -200% 0; }
// }
