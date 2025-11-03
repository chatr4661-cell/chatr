import { useState } from 'react';
import { Search, Mic, Globe, Sparkles, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useVoiceAI } from '@/hooks/useVoiceAI';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  aiAnswer?: string;
}

const AIBrowserHome = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [aiAnswer, setAiAnswer] = useState('');
  const { isListening, startListening } = useVoiceAI();

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
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
      // The voice transcript will be available in the hook
    } catch (error) {
      toast.error('Voice search not available');
    }
  };

  const openWebsite = (url: string) => {
    navigate(`/ai-browser?url=${encodeURIComponent(url)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-4xl mx-auto p-4">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                AI Browser
              </h1>
              <p className="text-xs text-muted-foreground">
                Powered by Lovable AI
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
              placeholder="Search anything or enter URL..."
              className="pl-10 pr-12 h-12 rounded-full bg-secondary/50 border-primary/20 focus:border-primary"
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

          {/* Quick Actions */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSearch(query)}
              disabled={searching}
              className="rounded-full"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              AI Search
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/ai-browser')}
              className="rounded-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Tab
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* AI Answer */}
        {searching && (
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary animate-spin" />
              <span className="font-medium text-primary">AI is thinking...</span>
            </div>
          </Card>
        )}

        {aiAnswer && (
          <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-medium text-primary">AI Answer</span>
            </div>
            <p className="text-foreground leading-relaxed">{aiAnswer}</p>
          </Card>
        )}

        {/* Search Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground px-2">
              Search Results
            </h2>
            {results.map((result, index) => (
              <Card
                key={index}
                className="p-4 cursor-pointer hover:bg-accent/50 transition-all hover:border-primary/30"
                onClick={() => openWebsite(result.url)}
              >
                <h3 className="font-medium text-primary mb-1 line-clamp-1">
                  {result.title}
                </h3>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">
                  {result.url}
                </p>
                <p className="text-sm text-foreground/80 line-clamp-2">
                  {result.snippet}
                </p>
              </Card>
            ))}
          </div>
        )}

        {/* Popular Sites */}
        {!searching && results.length === 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground px-2">
              Quick Access
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'Google', url: 'https://google.com', icon: '🔍' },
                { name: 'YouTube', url: 'https://youtube.com', icon: '📺' },
                { name: 'Twitter', url: 'https://twitter.com', icon: '🐦' },
                { name: 'Wikipedia', url: 'https://wikipedia.org', icon: '📚' },
              ].map((site) => (
                <Card
                  key={site.name}
                  className="p-4 cursor-pointer hover:bg-accent/50 transition-all hover:border-primary/30 text-center"
                  onClick={() => openWebsite(site.url)}
                >
                  <div className="text-3xl mb-2">{site.icon}</div>
                  <p className="font-medium text-sm">{site.name}</p>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIBrowserHome;
