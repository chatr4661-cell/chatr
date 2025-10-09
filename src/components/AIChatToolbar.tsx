import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  FileText, 
  CheckSquare, 
  Smile, 
  Loader2,
  Wand2
} from 'lucide-react';
import { useAIChatFeatures } from '@/hooks/useAIChatFeatures';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AIChatToolbarProps {
  messages: any[];
  onCreateTask: (task: any) => void;
}

export const AIChatToolbar = ({ messages, onCreateTask }: AIChatToolbarProps) => {
  const { summarizeConversation, extractTasks, analyzeSentiment, loading } = useAIChatFeatures();
  const [summary, setSummary] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [sentiment, setSentiment] = useState<any>(null);

  const handleSummarize = async () => {
    const result = await summarizeConversation(messages);
    if (result) {
      setSummary(result);
      toast.success('Conversation summarized!');
    }
  };

  const handleExtractTasks = async () => {
    const lastMessage = messages[messages.length - 1]?.content;
    if (!lastMessage) return;
    
    const extractedTasks = await extractTasks(lastMessage);
    if (extractedTasks && extractedTasks.length > 0) {
      setTasks(extractedTasks);
      toast.success(`Found ${extractedTasks.length} tasks!`);
    } else {
      toast.info('No tasks found in this message');
    }
  };

  const handleAnalyzeSentiment = async () => {
    const lastMessage = messages[messages.length - 1]?.content;
    if (!lastMessage) return;
    
    const analysis = await analyzeSentiment(lastMessage);
    if (analysis) {
      setSentiment(analysis);
      toast.success('Sentiment analyzed!');
    }
  };

  return (
    <div className="flex gap-2 items-center p-3 bg-gradient-to-r from-primary/5 to-primary/10 border-t border-primary/20">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Wand2 className="h-4 w-4 text-primary" />
        <span className="font-medium">AI Tools:</span>
      </div>

      {/* Summarize */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSummarize}
            disabled={loading || messages.length === 0}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Summarize
          </Button>
        </PopoverTrigger>
        {summary && (
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Conversation Summary
              </h4>
              <p className="text-sm text-muted-foreground">{summary.summary}</p>
              {summary.keyPoints && summary.keyPoints.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1">Key Points:</p>
                  <ul className="text-xs space-y-1">
                    {summary.keyPoints.map((point: string, i: number) => (
                      <li key={i} className="text-muted-foreground">• {point}</li>
                    ))}
                  </ul>
                </div>
              )}
              {summary.actionItems && summary.actionItems.length > 0 && (
                <div>
                  <p className="text-xs font-medium mb-1">Action Items:</p>
                  <ul className="text-xs space-y-1">
                    {summary.actionItems.map((item: string, i: number) => (
                      <li key={i} className="text-muted-foreground">✓ {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </PopoverContent>
        )}
      </Popover>

      {/* Extract Tasks */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExtractTasks}
            disabled={loading || messages.length === 0}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckSquare className="h-4 w-4" />
            )}
            Extract Tasks
          </Button>
        </PopoverTrigger>
        {tasks.length > 0 && (
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                Extracted Tasks
              </h4>
              <ScrollArea className="h-[200px]">
                <div className="space-y-2">
                  {tasks.map((task, i) => (
                    <div key={i} className="p-2 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{task.title}</span>
                        <Badge variant={
                          task.priority === 'high' ? 'destructive' :
                          task.priority === 'medium' ? 'default' : 'secondary'
                        }>
                          {task.priority}
                        </Badge>
                      </div>
                      {task.dueDate && (
                        <p className="text-xs text-muted-foreground">Due: {task.dueDate}</p>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCreateTask(task)}
                        className="w-full mt-2"
                      >
                        Create Task
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </PopoverContent>
        )}
      </Popover>

      {/* Sentiment Analysis */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAnalyzeSentiment}
            disabled={loading || messages.length === 0}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Smile className="h-4 w-4" />
            )}
            Sentiment
          </Button>
        </PopoverTrigger>
        {sentiment && (
          <PopoverContent className="w-80">
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Smile className="h-4 w-4 text-primary" />
                Sentiment Analysis
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Sentiment:</span>
                  <Badge variant={
                    sentiment.sentiment === 'positive' ? 'default' :
                    sentiment.sentiment === 'negative' ? 'destructive' : 'secondary'
                  }>
                    {sentiment.sentiment}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Confidence:</span>
                  <span className="text-sm font-medium">{Math.round(sentiment.confidence * 100)}%</span>
                </div>
                {sentiment.tone && (
                  <div>
                    <span className="text-sm">Tone: </span>
                    <span className="text-sm text-muted-foreground capitalize">{sentiment.tone}</span>
                  </div>
                )}
                {sentiment.suggestedReactions && sentiment.suggestedReactions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium mb-2">Suggested Reactions:</p>
                    <div className="flex flex-wrap gap-1">
                      {sentiment.suggestedReactions.map((reaction: string, i: number) => (
                        <Badge key={i} variant="outline">{reaction}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
};
