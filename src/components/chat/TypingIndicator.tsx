import React from 'react';
import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  username?: string;
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  username = 'Someone',
  className = ''
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className={`flex items-center gap-2 px-4 py-2 ${className}`}
    >
      <div className="bg-muted/60 dark:bg-gray-800 rounded-2xl px-4 py-3 flex items-center gap-2 shadow-sm border border-border/30">
        <span className="text-sm text-muted-foreground">{username}</span>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-primary/60 rounded-full"
              animate={{
                y: [0, -4, 0],
                opacity: [0.5, 1, 0.5]
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground/70">is typing</span>
      </div>
    </motion.div>
  );
};

export const TypingIndicatorBubble: React.FC = () => {
  return (
    <div className="flex items-center gap-1 pl-1">
      <div className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full"
            animate={{
              y: [0, -3, 0],
              opacity: [0.4, 1, 0.4]
            }}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              delay: i * 0.12,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  );
};
