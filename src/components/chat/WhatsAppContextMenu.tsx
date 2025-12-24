import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Reply, ArrowRight, Star, Pin, Trash2, Copy, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';

// WhatsApp-style quick reactions
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉'];

interface WhatsAppContextMenuProps {
  open: boolean;
  onClose: () => void;
  message: any;
  isOwn: boolean;
  onReply?: () => void;
  onForward?: () => void;
  onStar?: () => void;
  onPin?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onReact?: (emoji: string) => void;
  isStarred?: boolean;
  isPinned?: boolean;
}

export const WhatsAppContextMenu: React.FC<WhatsAppContextMenuProps> = ({
  open,
  onClose,
  message,
  isOwn,
  onReply,
  onForward,
  onStar,
  onPin,
  onDelete,
  onCopy,
  onReact,
  isStarred = false,
  isPinned = false,
}) => {
  const haptics = useNativeHaptics();
  const [showAllEmojis, setShowAllEmojis] = useState(false);
  const [pressedItem, setPressedItem] = useState<string | null>(null);

  // Extended emoji list
  const ALL_EMOJIS = [
    '👍', '❤️', '😂', '😮', '😢', '🙏', '🎉',
    '🔥', '👏', '💯', '🥰', '😍', '🤔', '👀',
    '✨', '💪', '🙌', '😎', '🤣', '😅', '🥺',
  ];

  const handleReaction = async (emoji: string) => {
    if (navigator.vibrate) navigator.vibrate(15);
    await haptics.light();
    onReact?.(emoji);
    onClose();
  };

  const handleAction = async (action: () => void, id: string) => {
    if (navigator.vibrate) navigator.vibrate(25);
    await haptics.light();
    action();
    onClose();
  };

  const menuItems = [
    { id: 'reply', icon: Reply, label: 'Reply', action: onReply, show: !!onReply },
    { id: 'forward', icon: ArrowRight, label: 'Forward', action: onForward, show: !!onForward },
    { id: 'star', icon: Star, label: isStarred ? 'Unstar' : 'Star', action: onStar, show: !!onStar },
    { id: 'pin', icon: Pin, label: isPinned ? 'Unpin' : 'Pin', action: onPin, show: !!onPin },
    { id: 'copy', icon: Copy, label: 'Copy', action: onCopy, show: !!onCopy },
    { id: 'delete', icon: Trash2, label: 'Delete', action: onDelete, show: isOwn && !!onDelete, destructive: true },
  ].filter(item => item.show);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onClose}
          />

          {/* Menu Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed left-4 right-4 bottom-8 z-50 flex flex-col gap-2 max-w-md mx-auto"
          >
            {/* Quick Reactions Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-card rounded-full p-2 shadow-xl border border-border/50 flex items-center justify-center gap-1"
            >
              {(showAllEmojis ? ALL_EMOJIS : QUICK_REACTIONS).map((emoji, index) => (
                <motion.button
                  key={emoji}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.02 * index, type: 'spring', stiffness: 400 }}
                  whileTap={{ scale: 1.3 }}
                  onClick={() => handleReaction(emoji)}
                  className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-accent rounded-full transition-colors"
                >
                  {emoji}
                </motion.button>
              ))}
              
              {/* Expand/Close button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowAllEmojis(!showAllEmojis)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-muted hover:bg-accent transition-colors ml-1"
              >
                {showAllEmojis ? (
                  <X className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Plus className="w-5 h-5 text-muted-foreground" />
                )}
              </motion.button>
            </motion.div>

            {/* Action Menu */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl shadow-xl border border-border/50 overflow-hidden"
            >
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                const isPressed = pressedItem === item.id;
                const isDestructive = item.destructive;
                
                return (
                  <button
                    key={item.id}
                    onTouchStart={() => setPressedItem(item.id)}
                    onTouchEnd={() => setPressedItem(null)}
                    onMouseDown={() => setPressedItem(item.id)}
                    onMouseUp={() => setPressedItem(null)}
                    onMouseLeave={() => setPressedItem(null)}
                    onClick={() => item.action && handleAction(item.action, item.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3.5 transition-all duration-150",
                      "active:bg-accent/80",
                      isPressed && "bg-accent/60",
                      index !== menuItems.length - 1 && "border-b border-border/30",
                      isDestructive ? "text-destructive" : "text-foreground"
                    )}
                  >
                    <span className="text-[16px] font-normal">{item.label}</span>
                    <Icon className={cn(
                      "w-5 h-5",
                      isDestructive ? "text-destructive" : "text-muted-foreground"
                    )} />
                  </button>
                );
              })}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
