import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AIDocumentSearchProps {
  conversationId: string;
}

export const AIDocumentSearch = ({ conversationId }: AIDocumentSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-search-messages', {
        body: {
          conversationId,
          query,
        },
      });

      if (error) throw error;

      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: 'Search failed',
        description: 'Could not search messages',
        variant: 'destructive',
      });
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" title="AI Search">
          <Search className="h-5 w-5 text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>AI Document Search</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about messages, files, or topics..."
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          <ScrollArea className="h-[400px]">
            {results.length === 0 && !isSearching && (
              <div className="text-center text-muted-foreground py-12">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Search through your conversation history</p>
                <p className="text-sm mt-2">Try: "Send me the proposal from last week"</p>
              </div>
            )}

            {results.map((result, index) => (
              <div key={index} className="p-4 border rounded-lg mb-3 hover:bg-muted/50 transition-colors">
                <p className="text-sm font-medium mb-1">{result.sender}</p>
                <p className="text-sm mb-2">{result.content}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(result.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};