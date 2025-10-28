import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Sparkles, TrendingUp, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';

interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
  favicon?: string;
}

interface AISummary {
  tldr: string;
  bullets: string[];
  followUps: string[];
  confidence: number;
  citations: { text: string; url: string }[];
}

interface Recommendation {
  title: string;
  reason: string;
  url: string;
  score: number;
}

export default function AIBrowser() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const performSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    try {
      // Call AI browser search function
      const { data, error } = await supabase.functions.invoke('ai-browser-search', {
        body: { query }
      });

      if (error) throw error;

      setResults(data.results || []);

      // Get AI summary
      const { data: summaryData } = await supabase.functions.invoke('ai-browser-summarize', {
        body: { 
          query,
          results: data.results.slice(0, 5)
        }
      });

      if (summaryData) {
        setSummary(summaryData.summary);
        setRecommendations(summaryData.recommendations || []);
      }

      toast.success(`Found ${data.results.length} results`);
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error(error.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 p-4">
      {/* Search Bar */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md rounded-full p-2 border border-primary/20">
          <Search className="w-5 h-5 text-gray-400 ml-3" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && performSearch()}
            placeholder="Ask anything... powered by AI"
            className="flex-1 bg-transparent border-none focus-visible:ring-0 text-white"
          />
          <Button
            onClick={performSearch}
            disabled={isSearching}
            className="rounded-full px-6"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Search
              </>
            )}
          </Button>
        </div>
      </div>

      {/* AI Summary */}
      {summary && (
        <div className="max-w-4xl mx-auto mb-8">
          <Card className="bg-gradient-to-br from-primary/20 to-purple-500/10 border-primary/30 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="text-white font-semibold">AI Summary</h3>
              <span className="ml-auto text-xs text-gray-400">
                {Math.round(summary.confidence * 100)}% confidence
              </span>
            </div>

            {/* TL;DR */}
            <p className="text-gray-200 mb-4 leading-relaxed">{summary.tldr}</p>

            {/* Bullets */}
            <ul className="space-y-2 mb-4">
              {summary.bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2 text-gray-300 text-sm">
                  <span className="text-primary mt-1">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            {/* Citations */}
            <div className="border-t border-primary/20 pt-4 mb-4">
              <p className="text-xs text-gray-400 mb-2">Sources:</p>
              <div className="flex flex-wrap gap-2">
                {summary.citations.map((citation, idx) => (
                  <a
                    key={idx}
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    {citation.text}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>

            {/* Follow-up Questions */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Ask next:</p>
              <div className="flex flex-wrap gap-2">
                {summary.followUps.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuery(q);
                      performSearch();
                    }}
                    className="text-xs bg-primary/20 hover:bg-primary/30 text-primary px-3 py-1 rounded-full transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="text-white font-semibold">Recommended for You</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec, idx) => (
              <Card key={idx} className="bg-black/40 border-primary/20 p-4 hover:border-primary/50 transition-colors">
                <a href={rec.url} target="_blank" rel="noopener noreferrer" className="block">
                  <h4 className="text-white font-medium mb-2 line-clamp-2">{rec.title}</h4>
                  <p className="text-sm text-gray-400 mb-2 line-clamp-2">{rec.reason}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-primary">Score: {Math.round(rec.score * 100)}%</span>
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                  </div>
                </a>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <div className="max-w-4xl mx-auto">
          <h3 className="text-white font-semibold mb-4">All Results</h3>
          <div className="space-y-4">
            {results.map((result, idx) => (
              <Card key={idx} className="bg-black/40 border-primary/20 p-4 hover:border-primary/50 transition-colors">
                <a href={result.url} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="flex items-start gap-3">
                    {result.favicon && (
                      <img src={result.favicon} alt="" className="w-5 h-5 mt-1" />
                    )}
                    <div className="flex-1">
                      <h4 className="text-primary font-medium mb-1 line-clamp-1">{result.title}</h4>
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">{result.snippet}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{result.source}</span>
                        <ExternalLink className="w-3 h-3 text-gray-600" />
                      </div>
                    </div>
                  </div>
                </a>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
