import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Sparkles, X } from 'lucide-react';

interface SmartRepliesPanelProps {
  replies: string[];
  onSelect: (reply: string) => void;
  onClose: () => void;
  loading?: boolean;
}

export const SmartRepliesPanel: React.FC<SmartRepliesPanelProps> = ({
  replies,
  onSelect,
  onClose,
  loading
}) => {
  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-3">
        <div className="flex items-center gap-2 text-sm text-primary">
          <Sparkles className="h-4 w-4 animate-pulse" />
          <span>Generating smart replies...</span>
        </div>
      </Card>
    );
  }

  if (!replies || replies.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-3 animate-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          Smart Replies
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-2">
        {replies.map((reply, index) => (
          <Button
            key={index}
            variant="outline"
            className="w-full justify-start text-left h-auto py-2 px-3 bg-background hover:bg-primary/10 hover:border-primary/30 transition-all"
            onClick={() => onSelect(reply)}
          >
            <span className="text-sm line-clamp-2">{reply}</span>
          </Button>
        ))}
      </div>
    </Card>
  );
};
