/**
 * Premium Empty States
 * Beautiful, animated empty state illustrations for world-class polish
 */

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Phone, 
  MessageCircle, 
  Users, 
  Search, 
  Inbox, 
  Bell, 
  Heart,
  Sparkles,
  Zap,
  Camera
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  type: 'calls' | 'messages' | 'contacts' | 'search' | 'notifications' | 'generic';
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const iconMap = {
  calls: Phone,
  messages: MessageCircle,
  contacts: Users,
  search: Search,
  notifications: Bell,
  generic: Inbox,
};

const gradientMap = {
  calls: 'from-green-500/20 via-emerald-500/10 to-teal-500/20',
  messages: 'from-blue-500/20 via-indigo-500/10 to-purple-500/20',
  contacts: 'from-purple-500/20 via-pink-500/10 to-rose-500/20',
  search: 'from-amber-500/20 via-orange-500/10 to-red-500/20',
  notifications: 'from-cyan-500/20 via-blue-500/10 to-indigo-500/20',
  generic: 'from-gray-500/20 via-slate-500/10 to-zinc-500/20',
};

const pulseAnimation = {
  scale: [1, 1.05, 1],
  opacity: [0.5, 0.8, 0.5],
};

export const PremiumEmptyState = ({
  type,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) => {
  const Icon = iconMap[type];
  const gradient = gradientMap[type];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center justify-center py-16 px-6 text-center',
        className
      )}
    >
      {/* Animated Background Circles */}
      <div className="relative mb-8">
        {/* Outer pulse */}
        <motion.div
          animate={pulseAnimation}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className={cn(
            'absolute inset-0 -m-8 rounded-full bg-gradient-to-br blur-2xl',
            gradient
          )}
        />
        
        {/* Middle ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0 -m-4"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary/40" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary/30" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-primary/20" />
        </motion.div>

        {/* Icon container */}
        <motion.div
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            'relative z-10 p-6 rounded-3xl',
            'bg-gradient-to-br from-background via-background to-muted',
            'border border-border/50',
            'shadow-lg shadow-primary/5'
          )}
        >
          <Icon className="h-12 w-12 text-primary/70" strokeWidth={1.5} />
        </motion.div>

        {/* Sparkle decorations */}
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
          className="absolute -top-2 -right-2"
        >
          <Sparkles className="h-4 w-4 text-primary/50" />
        </motion.div>
        
        <motion.div
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
          className="absolute -bottom-1 -left-3"
        >
          <Zap className="h-3 w-3 text-primary/40" />
        </motion.div>
      </div>

      {/* Title */}
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xl font-semibold mb-2 text-foreground"
      >
        {title}
      </motion.h3>

      {/* Description */}
      {description && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-sm text-muted-foreground max-w-xs mb-6 leading-relaxed"
        >
          {description}
        </motion.p>
      )}

      {/* Action Button */}
      {actionLabel && onAction && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Button
            onClick={onAction}
            className="gap-2 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all"
          >
            <Icon className="h-4 w-4" />
            {actionLabel}
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

/**
 * Call History Empty State - Specialized for calls
 */
export const CallHistoryEmptyState = ({ 
  onStartCall 
}: { 
  onStartCall?: () => void;
}) => (
  <PremiumEmptyState
    type="calls"
    title="No calls yet"
    description="Start a voice or video call with your contacts. Your call history will appear here."
    actionLabel="Make a Call"
    onAction={onStartCall}
  />
);

/**
 * Messages Empty State
 */
export const MessagesEmptyState = ({ 
  onNewMessage 
}: { 
  onNewMessage?: () => void;
}) => (
  <PremiumEmptyState
    type="messages"
    title="No messages"
    description="Start a conversation with your contacts. All your chats will appear here."
    actionLabel="Start Chat"
    onAction={onNewMessage}
  />
);

/**
 * Contacts Empty State
 */
export const ContactsEmptyState = ({ 
  onSyncContacts 
}: { 
  onSyncContacts?: () => void;
}) => (
  <PremiumEmptyState
    type="contacts"
    title="No contacts"
    description="Sync your phone contacts to find friends on CHATR or invite them to join."
    actionLabel="Sync Contacts"
    onAction={onSyncContacts}
  />
);

/**
 * Search Empty State
 */
export const SearchEmptyState = ({ 
  query,
  onClearSearch 
}: { 
  query?: string;
  onClearSearch?: () => void;
}) => (
  <PremiumEmptyState
    type="search"
    title={query ? `No results for "${query}"` : 'Search for something'}
    description={query ? 'Try a different search term or check your spelling.' : 'Enter a search term to find messages, contacts, or content.'}
    actionLabel={query ? 'Clear Search' : undefined}
    onAction={onClearSearch}
  />
);

/**
 * Notifications Empty State
 */
export const NotificationsEmptyState = () => (
  <PremiumEmptyState
    type="notifications"
    title="All caught up!"
    description="You don't have any new notifications. We'll let you know when something happens."
  />
);

/**
 * Premium Loading Skeleton for Auth
 */
export const AuthLoadingSkeleton = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6"
    >
      {/* Logo placeholder with shimmer */}
      <motion.div
        animate={{ 
          opacity: [0.5, 1, 0.5],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="relative"
      >
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/40 shimmer" />
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="absolute -inset-2 border-2 border-dashed border-primary/20 rounded-[1.75rem]"
        />
      </motion.div>

      {/* Text shimmer */}
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-32 rounded-lg bg-muted shimmer" />
        <div className="h-4 w-48 rounded-md bg-muted/50 shimmer" />
      </div>

      {/* Loading dots */}
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.2,
            }}
            className="w-2 h-2 rounded-full bg-primary"
          />
        ))}
      </div>
    </motion.div>
  </div>
);

/**
 * Call Skeleton for loading states
 */
export const CallItemSkeleton = () => (
  <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
    <div className="w-12 h-12 rounded-full bg-muted shimmer" />
    <div className="flex-1 space-y-2">
      <div className="h-4 w-32 rounded bg-muted shimmer" />
      <div className="h-3 w-24 rounded bg-muted/70 shimmer" />
    </div>
    <div className="flex gap-2">
      <div className="w-8 h-8 rounded-full bg-muted shimmer" />
    </div>
  </div>
);

export const CallListSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="space-y-3 p-4">
    {Array.from({ length: count }).map((_, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.1 }}
      >
        <CallItemSkeleton />
      </motion.div>
    ))}
  </div>
);
