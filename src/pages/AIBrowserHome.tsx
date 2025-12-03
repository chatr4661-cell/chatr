import { useState, useEffect } from 'react';
import { Search, Mic, Sparkles, ExternalLink, Image, TrendingUp, Heart, Briefcase, ShoppingBag, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useVoiceAI } from '@/hooks/useVoiceAI';
import { useNavigate } from 'react-router-dom';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

const AIBrowserHome = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [aiAnswer, setAiAnswer] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [relatedQuestions, setRelatedQuestions] = useState<string[]>([]);
  const { isListening, startListening, transcript } = useVoiceAI();

  const quickCategories = [
    { icon: Heart, label: 'Healthcare', query: 'doctors near me', color: 'bg-red-500' },
    { icon: Briefcase, label: 'Jobs', query: 'job openings', color: 'bg-blue-500' },
    { icon: ShoppingBag, label: 'Deals', query: 'best deals today', color: 'bg-green-500' },
    { icon: MapPin, label: 'Local', query: 'restaurants near me', color: 'bg-orange-500' },
  ];

  const trendingSearches = [
    'Best doctors in my area',
    'Food delivery near me',
    'Latest job openings',
    'Healthcare checkup packages',
    'Restaurant deals today',
  ];

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
    setRelatedQuestions([]);

    try {
      const { data, error } = await supabase.functions.invoke('ai-browser-search', {
        body: { query: searchQuery }
      });

      if (error) throw error;

      setAiAnswer(data.answer || '');
      setResults(data.results || []);
      
      // Generate related questions
      const related = [
        `What are the best ${searchQuery.split(' ')[0]} options?`,
        `How to find ${searchQuery} near me?`,
        `${searchQuery} reviews and ratings`,
      ];
      setRelatedQuestions(related);
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

  const handleCategoryClick = (categoryQuery: string) => {
    setQuery(categoryQuery);
    handleSearch(categoryQuery);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Google-style centered layout when no search */}
      {!hasSearched ? (
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-2xl">
            {/* Logo */}
            <div className="text-center mb-8">
              <h1 className="text-5xl font-bold mb-2">
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
                className="pl-12 pr-24 h-14 rounded-full border-2 text-base shadow-lg hover:shadow-xl transition-shadow"
                autoFocus
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleVoiceSearch}
                  className={`rounded-full h-10 w-10 ${
                    isListening ? 'bg-destructive text-destructive-foreground animate-pulse' : ''
                  }`}
                >
                  <Mic className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-3 mb-8">
              <Button
                onClick={() => handleSearch(query)}
                disabled={!query.trim()}
                className="rounded-full px-6"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI Search
              </Button>
              <Button
                variant="outline"
                className="rounded-full px-6"
                onClick={() => navigate('/visual-search')}
              >
                <Image className="h-4 w-4 mr-2" />
                Visual Search
              </Button>
            </div>

            {/* Quick Categories */}
            <div className="flex justify-center gap-3 mb-8">
              {quickCategories.map((cat) => (
                <Button
                  key={cat.label}
                  variant="outline"
                  className="rounded-full gap-2"
                  onClick={() => handleCategoryClick(cat.query)}
                >
                  <cat.icon className="h-4 w-4" />
                  {cat.label}
                </Button>
              ))}
            </div>

            {/* Trending Searches */}
            <Card className="p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Trending Searches</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingSearches.map((search, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => {
                      setQuery(search);
                      handleSearch(search);
                    }}
                  >
                    {search}
                  </Badge>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* Results Layout */
        <div className="min-h-screen">
          {/* Compact Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b">
            <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
              <h1 
                className="text-xl font-bold cursor-pointer"
                onClick={() => {
                  setHasSearched(false);
                  setQuery('');
                  setResults([]);
                  setAiAnswer('');
                }}
              >
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
            {/* AI Overview */}
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

            {/* Related Questions */}
            {relatedQuestions.length > 0 && !searching && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">People also ask</h3>
                {relatedQuestions.map((question, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3"
                    onClick={() => {
                      setQuery(question);
                      handleSearch(question);
                    }}
                  >
                    <Search className="h-4 w-4 mr-2 flex-shrink-0 text-muted-foreground" />
                    {question}
                  </Button>
                ))}
              </div>
            )}

            {/* Search Results */}
            {results.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Web Results</h3>
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

            {/* No Results */}
            {!searching && results.length === 0 && hasSearched && (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium mb-2">No results found</p>
                <p className="text-sm text-muted-foreground">Try a different search term</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIBrowserHome;
