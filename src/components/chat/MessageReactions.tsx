import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Reaction {
  emoji: string;
  user_id: string;
  created_at: string;
}

interface MessageReactionsProps {
  reactions?: Reaction[];
  userId: string;
  onReact: (emoji: string) => void;
  isOwn?: boolean;
}

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions = [],
  userId,
  onReact,
  isOwn = false
}) => {
  const [showPicker, setShowPicker] = useState(false);

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = { count: 0, users: [], hasUserReacted: false };
    }
    acc[reaction.emoji].count++;
    acc[reaction.emoji].users.push(reaction.user_id);
    if (reaction.user_id === userId) {
      acc[reaction.emoji].hasUserReacted = true;
    }
    return acc;
  }, {} as Record<string, { count: number; users: string[]; hasUserReacted: boolean }>);

  const handleReact = (emoji: string) => {
    onReact(emoji);
    setShowPicker(false);
  };

  return (
    <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
      {/* Existing reactions */}
      <AnimatePresence>
        {Object.entries(groupedReactions).map(([emoji, data]) => (
          <motion.button
            key={emoji}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => handleReact(emoji)}
            className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all ${
              data.hasUserReacted
                ? 'bg-primary/20 border border-primary/30'
                : 'bg-muted/60 border border-border/30 hover:bg-muted'
            }`}
          >
            <span className="text-sm">{emoji}</span>
            {data.count > 1 && (
              <span className="text-[10px] text-muted-foreground font-medium">
                {data.count}
              </span>
            )}
          </motion.button>
        ))}
      </AnimatePresence>

      {/* Add reaction button */}
      <Popover open={showPicker} onOpenChange={setShowPicker}>
        <PopoverTrigger asChild>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="p-1 rounded-full hover:bg-muted/60 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Plus className="w-3 h-3 text-muted-foreground" />
          </motion.button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-2 bg-card/95 backdrop-blur-sm border shadow-lg" 
          side={isOwn ? 'left' : 'right'}
          align="center"
        >
          <div className="flex gap-1">
            {QUICK_REACTIONS.map((emoji) => (
              <motion.button
                key={emoji}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleReact(emoji)}
                className="p-1.5 text-lg hover:bg-muted rounded-md transition-colors"
              >
                {emoji}
              </motion.button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

// Quick reaction picker that shows on long press
export const QuickReactionPicker: React.FC<{
  onReact: (emoji: string) => void;
  onClose: () => void;
}> = ({ onReact, onClose }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: 10 }}
      className="absolute -top-12 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm border shadow-lg rounded-full px-2 py-1.5 flex gap-0.5 z-50"
    >
      {QUICK_REACTIONS.map((emoji) => (
        <motion.button
          key={emoji}
          whileHover={{ scale: 1.3 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            onReact(emoji);
            onClose();
          }}
          className="p-1.5 text-xl hover:bg-muted rounded-full transition-colors"
        >
          {emoji}
        </motion.button>
      ))}
    </motion.div>
  );
};
