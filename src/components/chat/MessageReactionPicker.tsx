import React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Smile } from 'lucide-react';

interface MessageReactionPickerProps {
  onReact: (emoji: string) => void;
  existingReactions?: Record<string, string[]>;
  userId: string;
}

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏', '🔥', '🎉'];

export const MessageReactionPicker: React.FC<MessageReactionPickerProps> = ({
  onReact,
  existingReactions = {},
  userId
}) => {
  const [open, setOpen] = React.useState(false);

  const handleReact = (emoji: string) => {
    onReact(emoji);
    setOpen(false);
  };

  // Check if user already reacted with this emoji
  const hasUserReacted = (emoji: string) => {
    return existingReactions[emoji]?.includes(userId);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-accent/50"
          onClick={(e) => e.stopPropagation()}
        >
          <Smile className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-2" 
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-1">
          {QUICK_REACTIONS.map((emoji) => (
            <Button
              key={emoji}
              variant="ghost"
              size="sm"
              onClick={() => handleReact(emoji)}
              className={`h-10 w-10 text-2xl hover:scale-125 transition-transform ${
                hasUserReacted(emoji) ? 'bg-primary/10' : ''
              }`}
            >
              {emoji}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
