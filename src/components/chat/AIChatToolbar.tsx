import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { 
  Sparkles, 
  MessageSquare, 
  FileText, 
  TrendingUp, 
  Languages,
  Brain,
  Zap,
  ListChecks,
  CalendarClock
} from 'lucide-react';

interface AIChatToolbarProps {
  onSummarize: (type: 'brief' | 'detailed' | 'action_items' | 'meeting_notes') => void;
  onSmartReply: () => void;
  onAnalyze: (type: 'sentiment' | 'topics' | 'urgency' | 'language') => void;
  disabled?: boolean;
}

export const AIChatToolbar: React.FC<AIChatToolbarProps> = ({
  onSummarize,
  onSmartReply,
  onAnalyze,
  disabled
}) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full hover:bg-accent/50"
          disabled={disabled}
        >
          <Sparkles className="h-5 w-5 text-primary" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          AI Assistant
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Summarize
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onSummarize('brief')}>
          <MessageSquare className="h-4 w-4 mr-2" />
          Quick Summary
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSummarize('detailed')}>
          <FileText className="h-4 w-4 mr-2" />
          Detailed Summary
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSummarize('action_items')}>
          <ListChecks className="h-4 w-4 mr-2" />
          Extract Action Items
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSummarize('meeting_notes')}>
          <CalendarClock className="h-4 w-4 mr-2" />
          Meeting Notes
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Smart Features
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={onSmartReply}>
          <Zap className="h-4 w-4 mr-2" />
          Smart Replies
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Analyze
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => onAnalyze('sentiment')}>
          <TrendingUp className="h-4 w-4 mr-2" />
          Sentiment Analysis
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAnalyze('topics')}>
          <FileText className="h-4 w-4 mr-2" />
          Topic Extraction
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAnalyze('urgency')}>
          <Sparkles className="h-4 w-4 mr-2" />
          Urgency Check
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAnalyze('language')}>
          <Languages className="h-4 w-4 mr-2" />
          Language Detection
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
