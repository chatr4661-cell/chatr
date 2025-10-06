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
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-all shadow-sm ${
            reaction.userReacted
              ? 'bg-primary/20 border border-primary/50'
              : 'bg-background/90 backdrop-blur-sm border border-border/50 hover:bg-muted/80'
          }`}
        >
          <span className="text-sm">{reaction.emoji}</span>
          <span className="font-semibold text-[11px]">{reaction.count}</span>
        </button>
      ))}
      
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 rounded-full hover:bg-accent/80 transition-colors border border-border/50 bg-background/90 backdrop-blur-sm"
          >
            <Smile className="h-3 w-3 text-muted-foreground" />
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
