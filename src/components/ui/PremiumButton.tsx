import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button, ButtonProps } from './button';
import { cn } from '@/lib/utils';

interface PremiumButtonProps extends ButtonProps {
  enableRipple?: boolean;
  enablePress?: boolean;
}

export const PremiumButton = React.forwardRef<HTMLButtonElement, PremiumButtonProps>(
  ({ className, children, enableRipple = true, enablePress = true, onClick, ...props }, ref) => {
    const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (enableRipple) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = Date.now();
        
        setRipples(prev => [...prev, { id, x, y }]);
        
        // Remove ripple after animation
        setTimeout(() => {
          setRipples(prev => prev.filter(r => r.id !== id));
        }, 600);
      }
      
      onClick?.(e);
    };

    return (
      <motion.div
        whileTap={enablePress ? { scale: 0.96 } : undefined}
        transition={{ duration: 0.1 }}
      >
        <Button
          ref={ref}
          className={cn(
            'relative overflow-hidden',
            className
          )}
          onClick={handleClick}
          {...props}
        >
          {children}
          
          {/* Ripple effects */}
          {ripples.map(ripple => (
            <span
              key={ripple.id}
              className="absolute rounded-full bg-white/30 animate-ripple pointer-events-none"
              style={{
                left: ripple.x,
                top: ripple.y,
                width: '10px',
                height: '10px',
                marginLeft: '-5px',
                marginTop: '-5px',
              }}
            />
          ))}
        </Button>
      </motion.div>
    );
  }
);

PremiumButton.displayName = 'PremiumButton';