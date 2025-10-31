import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Languages, MessageSquare, Zap, Clock, Calendar } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface AIAssistantButtonProps {
  onAction: (action: AIAction) => void;
  loading?: boolean;
}

export type AIAction = 
  | 'smart_reply'
  | 'summarize'
  | 'translate'
  | 'extract_action'
  | 'improve_tone';

export const AIAssistantButton: React.FC<AIAssistantButtonProps> = ({ 
  onAction, 
  loading = false 
}) => {
  const [open, setOpen] = useState(false);

  const actions = [
    {
      id: 'smart_reply' as AIAction,
      label: 'Smart Replies',
      icon: MessageSquare,
      description: 'Get AI suggestions',
      color: 'bg-blue-500'
    },
    {
      id: 'summarize' as AIAction,
      label: 'Summarize',
      icon: Zap,
      description: 'Get chat summary',
      color: 'bg-purple-500'
    },
    {
      id: 'translate' as AIAction,
      label: 'Translate',
      icon: Languages,
      description: 'Auto-translate',
      color: 'bg-green-500'
    },
    {
      id: 'extract_action' as AIAction,
      label: 'Extract Actions',
      icon: Clock,
      description: 'Find tasks & reminders',
      color: 'bg-orange-500'
    }
  ];

  const handleAction = (action: AIAction) => {
    setOpen(false);
    onAction(action);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full h-10 w-10 hover:bg-primary/10 transition-all relative"
          disabled={loading}
        >
          <Sparkles className={`w-5 h-5 text-primary ${loading ? 'animate-pulse' : ''}`} />
          {loading && (
            <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" align="start" side="top">
        <div className="space-y-1">
          <div className="px-2 py-1.5 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">AI Assistant</span>
            <Badge variant="secondary" className="ml-auto text-xs">Beta</Badge>
          </div>
          <div className="grid gap-1">
            {actions.map((action) => (
              <Button
                key={action.id}
                variant="ghost"
                className="w-full justify-start h-auto py-2.5 px-3 hover:bg-muted"
                onClick={() => handleAction(action.id)}
              >
                <div className={`w-8 h-8 rounded-lg ${action.color} flex items-center justify-center mr-3 shrink-0`}>
                  <action.icon className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium">{action.label}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
