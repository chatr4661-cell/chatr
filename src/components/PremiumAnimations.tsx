/**
 * Premium Animation Components
 * Smooth, delightful animations for UI interactions
 */

import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';

/**
 * Fade In - Smooth fade entrance
 */
export const FadeIn = ({ 
  children, 
  delay = 0,
  duration = 0.3,
  className
}: { 
  children: ReactNode; 
  delay?: number;
  duration?: number;
  className?: string;
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ 
      duration,
      delay,
      ease: [0.4, 0, 0.2, 1]
    }}
  >
    {children}
  </motion.div>
);

/**
 * Slide In - Slide from direction
 */
export const SlideIn = ({ 
  children, 
  direction = 'bottom',
  delay = 0 
}: { 
  children: ReactNode; 
  direction?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}) => {
  const directions = {
    top: { y: -20 },
    bottom: { y: 20 },
    left: { x: -20 },
    right: { x: 20 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      exit={{ opacity: 0, ...directions[direction] }}
      transition={{ 
        duration: 0.3,
        delay,
        ease: [0.4, 0, 0.2, 1]
      }}
    >
      {children}
    </motion.div>
  );
};

/**
 * Scale In - Pop in effect
 */
export const ScaleIn = ({ 
  children, 
  delay = 0 
}: { 
  children: ReactNode; 
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ 
      duration: 0.2,
      delay,
      ease: [0.4, 0, 0.2, 1]
    }}
  >
    {children}
  </motion.div>
);

/**
 * Stagger Children - Animate list items sequentially
 */
export const StaggerChildren = ({ 
  children,
  className 
}: { 
  children: ReactNode;
  className?: string;
}) => (
  <motion.div
    className={className}
    initial="hidden"
    animate="visible"
    variants={{
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: 0.05,
        },
      },
    }}
  >
    {children}
  </motion.div>
);

/**
 * Stagger Item - Individual item in staggered list
 */
export const StaggerItem = ({ children }: { children: ReactNode }) => (
  <motion.div
    variants={{
      hidden: { opacity: 0, y: 10 },
      visible: { opacity: 1, y: 0 },
    }}
    transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
  >
    {children}
  </motion.div>
);

/**
 * Press - Scale down on press
 */
export const Press = ({ children }: { children: ReactNode }) => (
  <motion.div
    whileTap={{ scale: 0.95 }}
    transition={{ duration: 0.1 }}
  >
    {children}
  </motion.div>
);

/**
 * Hover Lift - Lift on hover
 */
export const HoverLift = ({ children }: { children: ReactNode }) => (
  <motion.div
    whileHover={{ y: -4, scale: 1.02 }}
    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
  >
    {children}
  </motion.div>
);

/**
 * Page Transition - Smooth page changes
 */
export const PageTransition = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ 
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }}
    className="page-transition"
  >
    {children}
  </motion.div>
);

/**
 * Modal Animation - Smooth modal entrance
 */
export const ModalAnimation = ({ children }: { children: ReactNode }) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ 
        duration: 0.2,
        ease: [0.4, 0, 0.2, 1]
      }}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);

/**
 * Notification Animation - Toast/notification entrance
 */
export const NotificationAnimation = ({ children }: { children: ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, x: 100, scale: 0.95 }}
    animate={{ opacity: 1, x: 0, scale: 1 }}
    exit={{ opacity: 0, x: 100, scale: 0.95 }}
    transition={{ 
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1]
    }}
  >
    {children}
  </motion.div>
);

/**
 * Number Counter - Animated number transition
 */
export const NumberCounter = ({ 
  value, 
  duration = 1 
}: { 
  value: number; 
  duration?: number;
}) => (
  <motion.span
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    key={value}
    transition={{ duration: 0.3 }}
  >
    {value}
  </motion.span>
);
