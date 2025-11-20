import React, { useState } from 'react';
import { Heart, Laugh, ThumbsUp, Flame, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const REACTIONS = [
  { emoji: '❤️', icon: Heart, value: 'heart' },
  { emoji: '😂', icon: Laugh, value: 'laugh' },
  { emoji: '👍', icon: ThumbsUp, value: 'thumbs_up' },
  { emoji: '🔥', icon: Flame, value: 'fire' },
  { emoji: '❗', icon: AlertCircle, value: 'exclaim' },
];

interface MessageReactionsProps {
  messageId: string;
  userId: string;
  existingReactions?: Array<{ emoji: string; user_id: string }>;
  onReactionAdded?: () => void;
}

export function MessageReactions({ messageId, userId, existingReactions = [], onReactionAdded }: MessageReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [reactions, setReactions] = useState(existingReactions);

  const handleReaction = async (emoji: string) => {
    const existing = reactions.find(r => r.user_id === userId);
    
    if (existing?.emoji === emoji) {
      // Remove reaction
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', userId);
      
      if (!error) {
        setReactions(reactions.filter(r => r.user_id !== userId));
        onReactionAdded?.();
      }
    } else {
      // Add/update reaction
      const { error } = await supabase
        .from('message_reactions')
        .upsert({ message_id: messageId, user_id: userId, emoji });
      
      if (!error) {
        const newReactions = reactions.filter(r => r.user_id !== userId);
        newReactions.push({ emoji, user_id: userId });
        setReactions(newReactions);
        onReactionAdded?.();
      }
    }
    setShowPicker(false);
  };

  const userReaction = reactions.find(r => r.user_id === userId);
  const reactionCounts = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="relative inline-block">
      {Object.entries(reactionCounts).length > 0 && (
        <div className="flex items-center gap-1 mb-1">
          {Object.entries(reactionCounts).map(([emoji, count]) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              className={`text-xs px-2 py-0.5 rounded-full border ${
                userReaction?.emoji === emoji
                  ? 'bg-primary/10 border-primary'
                  : 'bg-muted/50 border-border/50'
              }`}
            >
              {emoji} {count}
            </button>
          ))}
        </div>
      )}
      
      {showPicker && (
        <div className="absolute bottom-full mb-2 left-0 bg-card border border-border rounded-lg shadow-lg p-2 flex gap-2 z-10">
          {REACTIONS.map(({ emoji, value }) => (
            <button
              key={value}
              onClick={() => handleReaction(emoji)}
              className="text-2xl hover:scale-125 transition-transform p-1"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        React
      </button>
    </div>
  );
}
