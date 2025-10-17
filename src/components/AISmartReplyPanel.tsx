import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AISmartReplyPanelProps {
  lastMessage: string;
  onSelectReply: (reply: string) => void;
}

export const AISmartReplyPanel = ({ lastMessage, onSelectReply }: AISmartReplyPanelProps) => {
  const [replies, setReplies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Auto-generate smart replies when a new message arrives
    if (lastMessage && lastMessage.trim()) {
      generateReplies();
    }
  }, [lastMessage]);

  const generateReplies = async () => {
    if (!lastMessage || loading) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-smart-reply', {
        body: { 
          lastMessage,
          replyCount: 3
        }
      });

      if (error) throw error;

      if (data?.replies) {
        setReplies(data.replies.map((r: any) => r.text || r));
      }
    } catch (error) {
      console.error('Error generating smart replies:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!lastMessage || replies.length === 0) {
    return null;
  }

  return (
    <div className="px-3 pb-2 border-t bg-muted/30">
      <div className="flex items-center gap-2 py-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs text-muted-foreground font-medium">AI Suggestions</span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {replies.map((reply, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={() => {
              onSelectReply(reply);
              setReplies([]);
            }}
            className="h-8 px-3 rounded-full text-xs font-normal border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all"
          >
            {reply}
          </Button>
        ))}
      </div>
    </div>
  );
};
