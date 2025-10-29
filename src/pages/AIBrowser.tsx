import { useState } from 'react';
import { Search, Sparkles, Camera, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface SearchResponse {
  summary: string;
  results: SearchResult[];
  query: string;
}

export default function AIBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const navigate = useNavigate();

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-browser-search', {
        body: { query: query.trim() }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setSearchData(data);
      toast.success('Search completed!');
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-gradient-to-br from-violet-500 to-purple-600 text-white border-b px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-3">
            <h1 className="text-2xl font-bold">Chatr Browser</h1>
            <p className="text-sm text-white/90">Deep Multiverse Search Engine</p>
            <p className="text-xs text-white/70 mt-1">Not a browser. A discovery engine that thinks deeper than the web.</p>
          </div>
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-white/80" />
            <Input
              type="text"
              placeholder="Search or ask AI anything..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
              className="flex-1 bg-white/10 border-white/20 text-white placeholder:text-white/60"
              disabled={loading}
            />
            <Button 
              size="icon" 
              onClick={() => handleSearch(searchQuery)}
              disabled={loading}
              variant="secondary"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
            </Button>
            <Button size="icon" variant="secondary" onClick={() => navigate('/capture')}>
              <Camera className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* AI Input Section */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle>AI Assistant</CardTitle>
            </div>
            <CardDescription>
              AI will search multiple sources and provide a comprehensive answer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Ask AI to search, summarize, or explain..."
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(aiQuery)}
                disabled={loading}
              />
              <Button 
                onClick={() => handleSearch(aiQuery)}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Ask AI
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      <div className="max-w-4xl mx-auto px-4 pb-20">
        {loading && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 mx-auto mb-3 animate-spin text-primary" />
            <p className="text-muted-foreground">Searching across multiple sources...</p>
          </div>
        )}

        {!loading && !searchData && (
          <div className="text-center py-12 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Start searching to see results</p>
          </div>
        )}

        {!loading && searchData && (
          <div className="space-y-6">
            {/* AI Summary */}
            <Card className="border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <CardTitle>AI Summary</CardTitle>
                </div>
                <CardDescription>Generated answer for: {searchData.query}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {searchData.summary}
                </p>
              </CardContent>
            </Card>

            {/* Search Results */}
            {searchData.results.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Sources ({searchData.results.length})</h3>
                <div className="grid gap-4">
                  {searchData.results.map((result, index) => (
                    <Card key={index} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <CardTitle className="text-base line-clamp-2">
                              {result.title}
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {result.source}
                            </CardDescription>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => window.open(result.url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {result.snippet}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Chat Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 rounded-full shadow-lg h-14 w-14 p-0"
        onClick={() => navigate('/chat-ai')}
      >
        <Sparkles className="h-6 w-6" />
      </Button>
    </div>
  );
}
