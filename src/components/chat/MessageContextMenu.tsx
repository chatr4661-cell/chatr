import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';
import { cn } from '@/lib/utils';
import { Reply, Forward, Star, Pin, Trash2, AlertTriangle, Sparkles, Languages, MessageSquare, ListTodo, Info, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageAction {
  icon: React.ElementType;
  label: string;
  action: () => void;
  variant?: 'default' | 'destructive' | 'ai';
  show?: boolean;
  section?: 'main' | 'ai';
}

interface MessageContextMenuProps {
  open: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  actions: MessageAction[];
  message: any;
  onReply?: () => void;
  onForward?: () => void;
  onStar?: () => void;
  onPin?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onAISummarize?: () => void;
  onAITranslate?: () => void;
  onAISmartReply?: () => void;
  onAIExtractAction?: () => void;
  onReaction?: (emoji: string) => void;
  isStarred?: boolean;
  isPinned?: boolean;
}

// WhatsApp-style emoji reactions
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '🎉'];

export const MessageContextMenu = ({ 
  open, 
  onClose, 
  actions,
  message,
  onReply,
  onForward,
  onStar,
  onPin,
  onDelete,
  onReport,
  onAISummarize,
  onAITranslate,
  onAISmartReply,
  onAIExtractAction,
  onReaction,
  isStarred = false,
  isPinned = false
}: MessageContextMenuProps) => {
  const haptics = useNativeHaptics();
  const [pressedIndex, setPressedIndex] = useState<string | null>(null);
  const [pressedEmoji, setPressedEmoji] = useState<string | null>(null);

  const handleActionClick = async (action: MessageAction, id: string) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(25);
    }
    await haptics.light();
    action.action();
    onClose();
  };

  const handleEmojiReaction = async (emoji: string) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(25);
    }
    await haptics.light();
    onReaction?.(emoji);
    onClose();
  };

  // WhatsApp-style main actions - icons on right, text on left
  const mainMenuActions: MessageAction[] = [
    { icon: Reply, label: 'Reply', action: onReply || (() => {}), show: !!onReply, section: 'main' },
    { icon: Info, label: 'Info', action: () => {}, show: true, section: 'main' },
    { icon: Star, label: isStarred ? 'Unstar' : 'Star', action: onStar || (() => {}), show: !!onStar, section: 'main' },
    { icon: Pin, label: isPinned ? 'Unpin' : 'Pin', action: onPin || (() => {}), show: !!onPin, section: 'main' },
    { icon: Trash2, label: 'Delete', action: onDelete || (() => {}), variant: 'destructive', show: !!onDelete, section: 'main' },
  ];

  const allActions = actions.length > 0 ? actions : mainMenuActions;
  const visibleActions = allActions.filter(a => a.show !== false && a.section !== 'ai');

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent 
        side="bottom" 
        className="p-0 pb-safe border-none bg-transparent shadow-none"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Message Actions</SheetTitle>
          <SheetDescription>Choose an action for this message</SheetDescription>
        </SheetHeader>
        
        {/* Backdrop with blur */}
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10" onClick={onClose} />

        <div className="px-4 pb-8 space-y-3">
          {/* WhatsApp-style Emoji Reactions Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="flex justify-center"
          >
            <div className="inline-flex items-center gap-2 bg-white dark:bg-zinc-800 rounded-full px-4 py-2.5 shadow-lg">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  onMouseDown={() => setPressedEmoji(emoji)}
                  onMouseUp={() => setPressedEmoji(null)}
                  onMouseLeave={() => setPressedEmoji(null)}
                  onTouchStart={() => setPressedEmoji(emoji)}
                  onTouchEnd={() => setPressedEmoji(null)}
                  onClick={() => handleEmojiReaction(emoji)}
                  className={cn(
                    "text-2xl transition-all duration-150 touch-manipulation p-1",
                    pressedEmoji === emoji ? "scale-125" : "hover:scale-110 active:scale-125"
                  )}
                >
                  {emoji}
                </button>
              ))}
              <button 
                onClick={() => {/* Open emoji picker */}}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          {/* WhatsApp-style Menu Card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut', delay: 0.05 }}
            className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl overflow-hidden"
          >
            {visibleActions.map((action, index) => {
              const Icon = action.icon;
              const id = `action-${index}`;
              const isPressed = pressedIndex === id;
              const isDestructive = action.variant === 'destructive';
              const isLast = index === visibleActions.length - 1;
              
              return (
                <button
                  key={id}
                  onMouseDown={() => setPressedIndex(id)}
                  onMouseUp={() => setPressedIndex(null)}
                  onMouseLeave={() => setPressedIndex(null)}
                  onTouchStart={() => setPressedIndex(id)}
                  onTouchEnd={() => setPressedIndex(null)}
                  onClick={() => handleActionClick(action, id)}
                  className={cn(
                    "w-full flex items-center justify-between px-5 py-4 text-left transition-all duration-150 touch-manipulation",
                    "hover:bg-zinc-50 dark:hover:bg-zinc-700/50",
                    isPressed && "bg-zinc-100 dark:bg-zinc-700",
                    !isLast && "border-b border-zinc-100 dark:border-zinc-700"
                  )}
                >
                  {/* Text on left - WhatsApp style */}
                  <span className={cn(
                    "text-[17px] font-normal",
                    isDestructive 
                      ? "text-red-500" 
                      : "text-zinc-900 dark:text-zinc-100"
                  )}>
                    {action.label}
                  </span>
                  
                  {/* Icon on right - WhatsApp style */}
                  <Icon className={cn(
                    "w-5 h-5",
                    isDestructive 
                      ? "text-red-500" 
                      : "text-zinc-400 dark:text-zinc-500"
                  )} strokeWidth={1.5} />
                </button>
              );
            })}
          </motion.div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
