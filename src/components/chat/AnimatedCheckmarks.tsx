import { motion } from 'framer-motion';
import { Check, CheckCheck } from 'lucide-react';

interface AnimatedCheckmarksProps {
  status: 'sending' | 'sent' | 'delivered' | 'read';
  className?: string;
}

export const AnimatedCheckmarks = ({ status, className = '' }: AnimatedCheckmarksProps) => {
  if (status === 'sending') {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        className={`w-4 h-4 ${className}`}
      >
        <div className="w-2 h-2 rounded-full border border-current border-t-transparent animate-spin" />
      </motion.div>
    );
  }

  if (status === 'sent') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          type: "spring",
          stiffness: 500,
          damping: 25
        }}
        className={className}
      >
        <Check className="w-4 h-4 text-muted-foreground" />
      </motion.div>
    );
  }

  if (status === 'delivered') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          type: "spring",
          stiffness: 500,
          damping: 25
        }}
        className={className}
      >
        <CheckCheck className="w-4 h-4 text-muted-foreground" />
      </motion.div>
    );
  }

  // Read status - blue checkmarks with animation
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        type: "spring",
        stiffness: 400,
        damping: 20
      }}
      className={className}
    >
      <motion.div
        initial={{ color: 'hsl(var(--muted-foreground))' }}
        animate={{ color: 'hsl(211, 100%, 50%)' }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <CheckCheck className="w-4 h-4" />
      </motion.div>
    </motion.div>
  );
};