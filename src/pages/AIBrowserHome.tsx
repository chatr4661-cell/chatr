import { useState, useEffect } from 'react';
import { Search, Mic, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useVoiceAI } from '@/hooks/useVoiceAI';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

const AIBrowserHome = () => {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [aiAnswer, setAiAnswer] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const { isListening, startListening, transcript } = useVoiceAI();

  useEffect(() => {
    if (transcript) {
      setQuery(transcript);
      handleSearch(transcript);
    }
  }, [transcript]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setHasSearched(true);
    setResults([]);
    setAiAnswer('');

    try {
      const { data, error } = await supabase.functions.invoke('ai-browser-search', {
        body: { query: searchQuery }
      });

      if (error) throw error;

      setAiAnswer(data.answer || '');
      setResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleVoiceSearch = async () => {
    try {
      await startListening();
    } catch (error) {
      toast.error('Voice search not available');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Google-style centered layout when no search */}
      {!hasSearched ? (
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-2xl">
            {/* Logo */}
            <div className="text-center mb-8">
              <h1 className="text-6xl font-bold mb-2">
                <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Chatr
                </span>
                <span className="text-foreground"> AI</span>
              </h1>
              <p className="text-muted-foreground text-sm">Powered by Lovable AI</p>
            </div>

            {/* Search Bar */}
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                placeholder="Ask me anything..."
                className="pl-12 pr-12 h-14 rounded-full border-2 text-base shadow-lg hover:shadow-xl transition-shadow"
                autoFocus
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={handleVoiceSearch}
                className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full ${
                  isListening ? 'bg-destructive text-destructive-foreground animate-pulse' : ''
                }`}
              >
                <Mic className="h-5 w-5" />
              </Button>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-3">
              <Button
                onClick={() => handleSearch(query)}
                disabled={!query.trim()}
                className="rounded-full"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI Search
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Results Layout */
        <div className="min-h-screen">
          {/* Compact Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
              <h1 className="text-xl font-bold">
                <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Chatr
                </span>
                <span className="text-foreground"> AI</span>
              </h1>
              
              <div className="flex-1 relative max-w-2xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                  placeholder="Ask me anything..."
                  className="pl-10 pr-10 h-10 rounded-full"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleVoiceSearch}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full ${
                    isListening ? 'bg-destructive text-destructive-foreground animate-pulse' : ''
                  }`}
                >
                  <Mic className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Results Content */}
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {/* AI Overview - Google-style */}
            {searching && (
              <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-5 w-5 text-primary animate-spin" />
                  <span className="font-semibold text-primary">Generating AI Overview...</span>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-primary/10 rounded animate-pulse w-full" />
                  <div className="h-4 bg-primary/10 rounded animate-pulse w-5/6" />
                  <div className="h-4 bg-primary/10 rounded animate-pulse w-4/6" />
                </div>
              </Card>
            )}

            {aiAnswer && !searching && (
              <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-primary">AI Overview</span>
                </div>
                <div className="prose prose-sm max-w-none">
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">{aiAnswer}</p>
                </div>
              </Card>
            )}

            {/* Search Results */}
            {results.length > 0 && (
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div key={index} className="group">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block hover:no-underline"
                    >
                      <div className="mb-1">
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          {new URL(result.url).hostname}
                          <ExternalLink className="h-3 w-3" />
                        </p>
                      </div>
                      <h3 className="text-xl text-primary group-hover:underline mb-1 line-clamp-1">
                        {result.title}
                      </h3>
                      <p className="text-sm text-foreground/70 line-clamp-2">
                        {result.snippet}
                      </p>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIBrowserHome;
