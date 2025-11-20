import React from 'react';
import { X } from 'lucide-react';

interface InlineReplyUIProps {
  replyToMessage: {
    id: string;
    content: string;
    sender_name: string;
  } | null;
  onClear: () => void;
}

export function InlineReplyUI({ replyToMessage, onClear }: InlineReplyUIProps) {
  if (!replyToMessage) return null;

  return (
    <div className="bg-muted/50 border-l-4 border-primary px-3 py-2 flex items-center justify-between">
      <div className="flex-1">
        <div className="text-xs font-semibold text-primary">{replyToMessage.sender_name}</div>
        <div className="text-sm text-muted-foreground truncate">{replyToMessage.content}</div>
      </div>
      <button
        onClick={onClear}
        className="p-1 hover:bg-muted rounded-full transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
