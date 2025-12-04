import React from 'react';
import { cn } from '@/lib/utils';
import { useSmartReplies } from '@/hooks/useSmartReplies';
import { Sparkles } from 'lucide-react';

interface SmartReplySuggestionsProps {
  suggestions: Array<{ id: string; text: string; confidence: number }>;
  onSelect: (text: string) => void;
  isLoading?: boolean;
  className?: string;
}

export const SmartReplySuggestions: React.FC<SmartReplySuggestionsProps> = ({
  suggestions,
  onSelect,
  isLoading,
  className,
}) => {
  if (suggestions.length === 0 && !isLoading) return null;

  return (
    <div className={cn('flex items-center gap-2 overflow-x-auto py-2 px-1', className)}>
      <div className="flex items-center gap-1 text-muted-foreground shrink-0">
        <Sparkles className="w-3 h-3" />
        <span className="text-xs">Quick reply:</span>
      </div>
      
      {isLoading ? (
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-8 w-20 bg-muted animate-pulse rounded-full"
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              onClick={() => onSelect(suggestion.text)}
              className={cn(
                'px-3 py-1.5 text-sm rounded-full',
                'bg-secondary hover:bg-secondary/80',
                'border border-border/50',
                'transition-all duration-200',
                'whitespace-nowrap',
                'hover:scale-105 active:scale-95'
              )}
            >
              {suggestion.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
