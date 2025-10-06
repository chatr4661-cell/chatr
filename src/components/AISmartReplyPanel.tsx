import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAIChatFeatures } from '@/hooks/useAIChatFeatures';

interface AISmartReplyPanelProps {
  lastMessage: string;
  onSelectReply: (reply: string) => void;
}

export const AISmartReplyPanel = ({ lastMessage, onSelectReply }: AISmartReplyPanelProps) => {
  const [replies, setReplies] = useState<any[]>([]);
  const { getSmartReplies, loading } = useAIChatFeatures();
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    // Auto-load smart replies when last message changes
    if (lastMessage && !hasLoaded) {
      loadSmartReplies();
    }
  }, [lastMessage]);

  const loadSmartReplies = async () => {
    if (!lastMessage) return;
    setHasLoaded(true);
    const suggestions = await getSmartReplies(lastMessage);
    if (suggestions) {
      setReplies(suggestions);
    }
  };

  if (!lastMessage || replies.length === 0) {
    return null;
  }

  return (
    <div className="px-3 pb-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        {replies.map((reply, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => {
              onSelectReply(reply.text);
              setReplies([]);
              setHasLoaded(false);
            }}
            className="h-7 px-3 rounded-full text-xs font-normal border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all"
          >
            {reply.text}
          </Button>
        ))}
      </div>
    </div>
  );
};
