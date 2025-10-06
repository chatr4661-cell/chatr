import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Loader2, Zap, MessageSquare, Clock } from 'lucide-react';
import { useAIChatFeatures } from '@/hooks/useAIChatFeatures';

interface AISmartReplyPanelProps {
  lastMessage: string;
  onSelectReply: (reply: string) => void;
}

export const AISmartReplyPanel = ({ lastMessage, onSelectReply }: AISmartReplyPanelProps) => {
  const [replies, setReplies] = useState<any[]>([]);
  const { getSmartReplies, loading } = useAIChatFeatures();
  const [showPanel, setShowPanel] = useState(false);

  const loadSmartReplies = async () => {
    if (!lastMessage) return;
    const suggestions = await getSmartReplies(lastMessage);
    if (suggestions) {
      setReplies(suggestions);
      setShowPanel(true);
    }
  };

  const getToneIcon = (tone: string) => {
    switch (tone) {
      case 'professional':
        return <MessageSquare className="h-3 w-3" />;
      case 'friendly':
        return <Sparkles className="h-3 w-3" />;
      case 'quick':
        return <Zap className="h-3 w-3" />;
      default:
        return <MessageSquare className="h-3 w-3" />;
    }
  };

  const getToneBadgeVariant = (tone: string) => {
    switch (tone) {
      case 'professional':
        return 'default';
      case 'friendly':
        return 'secondary';
      case 'quick':
        return 'outline';
      default:
        return 'default';
    }
  };

  if (!lastMessage) return null;

  return (
    <div className="space-y-2">
      {!showPanel ? (
        <Button
          variant="outline"
          size="sm"
          onClick={loadSmartReplies}
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          AI Suggestions
        </Button>
      ) : (
        <Card className="p-4 space-y-3 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">AI Suggestions</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPanel(false)}
              className="h-6 px-2 text-xs"
            >
              Hide
            </Button>
          </div>
          <div className="space-y-2">
            {replies.map((reply, index) => (
              <button
                key={index}
                onClick={() => {
                  onSelectReply(reply.text);
                  setShowPanel(false);
                }}
                className="w-full text-left p-3 rounded-lg bg-background hover:bg-primary/10 transition-colors border border-primary/10 hover:border-primary/30 group"
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge variant={getToneBadgeVariant(reply.tone)} className="gap-1 text-xs">
                    {getToneIcon(reply.tone)}
                    {reply.tone}
                  </Badge>
                </div>
                <p className="text-sm group-hover:text-primary transition-colors">
                  {reply.text}
                </p>
              </button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadSmartReplies}
            disabled={loading}
            className="w-full gap-2"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Clock className="h-3 w-3" />
            )}
            Regenerate
          </Button>
        </Card>
      )}
    </div>
  );
};
