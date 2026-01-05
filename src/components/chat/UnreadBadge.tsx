import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface UnreadBadgeProps {
  count: number;
  className?: string;
}

export const UnreadBadge: React.FC<UnreadBadgeProps> = ({ count, className = '' }) => {
  if (count <= 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ 
          type: "spring", 
          stiffness: 500, 
          damping: 25,
          duration: 0.2 
        }}
        className={`absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center 
          bg-gradient-to-br from-red-500 to-red-600 
          text-white text-[11px] font-bold 
          rounded-full shadow-lg shadow-red-500/30
          unread-badge-pulse
          ${className}`}
      >
        {displayCount}
      </motion.div>
    </AnimatePresence>
  );
};
