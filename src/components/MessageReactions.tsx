import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const EMOJI_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏', '👏', '🔥', '🎉', '💯'];

interface MessageReactionsProps {
  reactions: Array<{ emoji: string; count: number; userReacted: boolean }>;
  onReact: (emoji: string) => void;
}

export const MessageReactions = ({ reactions, onReact }: MessageReactionsProps) => {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {reactions.map((reaction) => (
        <button
          key={reaction.emoji}
          onClick={() => onReact(reaction.emoji)}
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all shadow-md hover:shadow-lg hover:scale-105 ${
            reaction.userReacted
              ? 'bg-primary text-primary-foreground border-2 border-primary/20'
              : 'bg-background/95 backdrop-blur-sm border-2 border-border/40 hover:border-primary/30 text-foreground'
          }`}
        >
          <span className="text-base leading-none">{reaction.emoji}</span>
          <span className="font-bold text-[10px]">{reaction.count}</span>
        </button>
      ))}
      
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 rounded-full hover:bg-accent transition-all hover:scale-110 border-2 border-border/40 bg-background/95 backdrop-blur-sm shadow-md hover:shadow-lg"
          >
            <Smile className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2 bg-popover/95 backdrop-blur-sm">
          <div className="grid grid-cols-5 gap-1.5">
            {EMOJI_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                className="text-2xl hover:bg-accent/80 rounded-md p-1.5 transition-all hover:scale-110"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
