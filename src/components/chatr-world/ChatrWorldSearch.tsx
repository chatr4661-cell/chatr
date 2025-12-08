import { useState, useEffect } from 'react';
import { Search, Sparkles, ExternalLink, Image, Loader2, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AISummaryContent } from '@/components/ai/AISummaryContent';

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  image?: string;
  displayLink?: string;
  source: string;
}

interface ChatrWorldSearchProps {
  initialQuery?: string;
  location?: { lat: number; lon: number; city?: string } | null;
}

export function ChatrWorldSearch({ initialQuery = '', location }: ChatrWorldSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState('0');
  const [source, setSource] = useState('');

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = async (searchQuery?: string) => {
    const q = searchQuery || query;
    if (!q.trim()) return;

    setLoading(true);
    setAiSummary('');
    setResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('chatr-world-search', {
        body: { query: q, type: 'all', location, page }
      });

      if (error) throw error;

      setResults(data.items || []);
      setTotalResults(data.totalResults || '0');
      setSource(data.source || 'unknown');

    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const generateAISummary = async () => {
    if (results.length === 0) return;

    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('chatr-world-ai', {
        body: {
          type: 'summary',
          data: { query, results: results.slice(0, 5) }
        }
      });

      if (error) throw error;
      setAiSummary(data.result || '');
    } catch (error) {
      console.error('AI summary error:', error);
      toast.error('Failed to generate AI summary');
    } finally {
      setLoadingAI(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    handleSearch();
  };

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the web..."
            className="pl-10"
          />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
        </Button>
      </form>

      {/* Results Info */}
      {results.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            About {parseInt(totalResults).toLocaleString()} results
            {source && <Badge variant="outline" className="ml-2">{source}</Badge>}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={generateAISummary}
            disabled={loadingAI}
            className="gap-2"
          >
            {loadingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI Summary
          </Button>
        </div>
      )}

      {/* AI Summary */}
      {aiSummary && (
        <Card className="bg-gradient-to-br from-primary/5 via-background to-background border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-primary">AI Summary</h3>
            </div>
            <AISummaryContent content={aiSummary} />
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Search Results */}
      {!loading && results.length > 0 && (
        <div className="space-y-4">
          {results.map((result, index) => (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex gap-4">
                  {result.image && (
                    <div className="flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-muted">
                      <img
                        src={result.image}
                        alt={result.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <a
                      href={result.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group"
                    >
                      <h3 className="font-semibold text-primary group-hover:underline line-clamp-1 flex items-center gap-2">
                        {result.title}
                        <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h3>
                    </a>
                    <p className="text-xs text-green-600 mb-1">{result.displayLink || result.link}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2">{result.snippet}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {results.length > 0 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setPage(p => Math.max(1, p - 1));
              handleSearch();
            }}
            disabled={page === 1 || loading}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm">Page {page}</span>
          <Button
            variant="outline"
            onClick={() => {
              setPage(p => p + 1);
              handleSearch();
            }}
            disabled={loading}
          >
            Next
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && query && (
        <div className="text-center py-12">
          <Image className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">No results found</h3>
          <p className="text-sm text-muted-foreground">Try a different search term</p>
        </div>
      )}
    </div>
  );
}