import { motion } from 'framer-motion';

const SkeletonPulse = ({ className, width }: { className?: string; width?: string }) => (
  <div 
    className={`relative overflow-hidden bg-gradient-to-r from-muted via-muted/60 to-muted rounded-lg ${className}`}
    style={{
      backgroundSize: '200% 100%',
      animation: 'skeleton-wave 1.5s ease-in-out infinite',
      width: width,
    }}
  >
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
  </div>
);

export const ConversationListSkeleton = () => {
  const widths = ['180px', '140px', '200px', '160px', '190px', '150px'];
  const msgWidths = ['140px', '120px', '160px', '130px', '145px', '115px'];

  return (
    <div className="space-y-1 p-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <motion.div 
          key={i} 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ 
            delay: i * 0.05,
            duration: 0.3,
            ease: [0.32, 0.72, 0, 1]
          }}
          className="flex items-center gap-3 p-3 rounded-xl"
        >
          {/* Avatar skeleton with gradient */}
          <div className="relative">
            <SkeletonPulse className="h-12 w-12 rounded-full" />
            {/* Online indicator placeholder */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-muted border-2 border-background" />
          </div>
          
          <div className="flex-1 space-y-2.5">
            {/* Name skeleton */}
            <SkeletonPulse className="h-4 rounded-md" width={widths[i]} />
            {/* Message preview skeleton */}
            <SkeletonPulse className="h-3 rounded-md" width={msgWidths[i]} />
          </div>
          
          <div className="flex flex-col items-end gap-2">
            {/* Time skeleton */}
            <SkeletonPulse className="h-3 w-10 rounded-md" />
            {/* Unread badge placeholder */}
            {i < 2 && (
              <SkeletonPulse className="h-5 w-5 rounded-full" />
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};