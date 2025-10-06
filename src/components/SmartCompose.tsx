import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SmartComposeProps {
  messages: any[];
  onSelectSuggestion: (text: string) => void;
}

export const SmartCompose = ({ messages, onSelectSuggestion }: SmartComposeProps) => {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (messages.length > 0) {
      generateSuggestions();
    }
  }, [messages]);

  const generateSuggestions = async () => {
    setIsLoading(true);
    
    try {
      const recentMessages = messages.slice(-5).map(msg => ({
        sender: msg.sender?.username || 'User',
        content: msg.content
      }));

      const { data, error } = await supabase.functions.invoke('smart-compose', {
        body: { recentMessages, context: 'general conversation' }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setSuggestions(data.suggestions || []);
    } catch (error: any) {
      console.error('Smart compose error:', error);
      
      // Only show toast for errors other than rate limits
      if (!error.message?.includes('Rate limit') && !error.message?.includes('credits')) {
        toast({
          title: 'Smart Compose Unavailable',
          description: error.message || 'Could not generate suggestions',
          variant: 'destructive',
        });
      }
      
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  if (messages.length === 0) return null;

  return (
    <div className="p-2 bg-muted/30 border-t border-border">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">Smart Replies</span>
      </div>
      
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-xs">Generating suggestions...</span>
        </div>
      ) : suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => onSelectSuggestion(suggestion)}
              className="rounded-full text-xs hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {suggestion}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
