import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Reply, 
  Forward, 
  Star, 
  Copy, 
  Download, 
  Share2, 
  Edit, 
  Trash 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageAction {
  icon: React.ElementType;
  label: string;
  action: () => void;
  variant?: 'default' | 'destructive';
  show?: boolean;
}

interface MessageContextMenuProps {
  open: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  actions: MessageAction[];
  message: any;
}

export const MessageContextMenu = ({ 
  open, 
  onClose, 
  position, 
  actions 
}: MessageContextMenuProps) => {
  React.useEffect(() => {
    if (open) {
      const handleClick = () => onClose();
      const handleScroll = () => onClose();
      
      document.addEventListener('click', handleClick);
      document.addEventListener('scroll', handleScroll, true);
      
      return () => {
        document.removeEventListener('click', handleClick);
        document.removeEventListener('scroll', handleScroll, true);
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl"
        style={{
          top: position.y,
          left: position.x,
          minWidth: '180px'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="py-1">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                onClick={() => {
                  action.action();
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  action.variant === 'destructive'
                    ? 'text-destructive hover:bg-destructive/10'
                    : 'text-foreground hover:bg-accent/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{action.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
