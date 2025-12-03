import { useState } from 'react';
import { Globe, Search, Sparkles, Send, Loader2, ExternalLink, Bot } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  results?: any[];
}

export function ChatrWorldBrowser() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      // First get search results
      const { data: searchData, error: searchError } = await supabase.functions.invoke('chatr-world-search', {
        body: { query: query, type: 'web' }
      });

      if (searchError) throw searchError;

      // Then get AI analysis
      const { data: aiData, error: aiError } = await supabase.functions.invoke('chatr-world-ai', {
        body: {
          type: 'summary',
          data: { query, results: searchData?.items?.slice(0, 5) }
        }
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: aiData?.result || 'I found some results for you.',
        results: searchData?.items?.slice(0, 5)
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Browser error:', error);
      toast.error('Failed to process your request');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <Card className="bg-gradient-to-br from-purple-500/10 via-violet-500/10 to-indigo-500/10 border-purple-500/20">
        <CardContent className="p-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-violet-500 mb-4">
            <Globe className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Chatr AI Browser</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Browse the web with AI assistance. Ask questions and get intelligent summaries.
          </p>
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="h-[500px] flex flex-col">
        <CardHeader className="border-b py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI-Powered Search
          </CardTitle>
        </CardHeader>

        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center">
              <div className="space-y-4">
                <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <div>
                  <p className="font-medium mb-1">Start browsing with AI</p>
                  <p className="text-sm text-muted-foreground">
                    Ask anything and get AI-powered answers with sources
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['Best restaurants in Mumbai', 'Weather today', 'Latest tech news'].map(suggestion => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQuery(suggestion);
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl p-4 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    
                    {/* Search Results */}
                    {message.results && message.results.length > 0 && (
                      <div className="mt-4 space-y-2 pt-4 border-t border-border/50">
                        <p className="text-xs font-medium opacity-70">Sources:</p>
                        {message.results.map((result, i) => (
                          <a
                            key={i}
                            href={result.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-2 rounded-lg bg-background/50 hover:bg-background transition-colors"
                          >
                            <p className="text-xs font-medium line-clamp-1 flex items-center gap-1">
                              {result.title}
                              <ExternalLink className="h-3 w-3" />
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{result.displayLink}</p>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl p-4">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="border-t p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1"
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !query.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}