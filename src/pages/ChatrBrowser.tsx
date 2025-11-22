import { useState, useEffect } from 'react';
import { Search, MapPin, Sparkles, Loader2, ExternalLink, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface Source {
  title: string;
  url: string;
  snippet: string;
  citation_id: number;
}

interface SearchResponse {
  answer: string;
  sources: Source[];
  next_actions: string[];
  mode: string;
  research_plan?: string[];
}

type SearchMode = 'quick' | 'deep' | 'academic' | 'news' | 'jobs' | 'healthcare' | 'code' | 'travel';

const MODES: { value: SearchMode; label: string; icon: string }[] = [
  { value: 'quick', label: 'Quick', icon: '⚡' },
  { value: 'deep', label: 'Deep Research', icon: '🔬' },
  { value: 'academic', label: 'Academic', icon: '📚' },
  { value: 'news', label: 'News', icon: '📰' },
  { value: 'jobs', label: 'Jobs', icon: '💼' },
  { value: 'healthcare', label: 'Healthcare', icon: '🏥' },
  { value: 'code', label: 'Code/Dev', icon: '💻' },
  { value: 'travel', label: 'Travel', icon: '✈️' },
];

export default function ChatrBrowser() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [mode, setMode] = useState<SearchMode>('quick');
  const [location, setLocation] = useState<{ lat: number; lon: number; city?: string } | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('chatr-browser-search', {
        body: { query: searchQuery, location, mode }
      });

      if (error) throw error;

      setResult(data as SearchResponse);
      toast.success('Search complete');
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error(error.message || 'Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const activateGPS = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    setIsLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        // Reverse geocode to get city name
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          const city = data.address?.city || data.address?.town || data.address?.village || 'Unknown';
          
          setLocation({ lat: latitude, lon: longitude, city });
          toast.success(`Location set to ${city}`);
        } catch (error) {
          setLocation({ lat: latitude, lon: longitude });
          toast.success('Location activated');
        }
        
        setIsLoadingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Could not get your location');
        setIsLoadingLocation(false);
      }
    );
  };

  const handleQuickAction = (action: string) => {
    setQuery(action);
    handleSearch(action);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">CHATR BROWSER</h1>
                <p className="text-sm text-muted-foreground">Advanced Research Engine</p>
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={activateGPS}
              disabled={isLoadingLocation}
            >
              {isLoadingLocation ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <MapPin className="h-4 w-4 mr-2" />
              )}
              {location ? location.city : 'Enable GPS'}
            </Button>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Ask anything... CHATR Browser will research it for you"
              className="flex-1 h-12 text-lg"
              disabled={isSearching}
            />
            <Button 
              onClick={() => handleSearch()} 
              disabled={isSearching}
              size="lg"
            >
              {isSearching ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Search className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Mode Selector */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
            {MODES.map((m) => (
              <Button
                key={m.value}
                variant={mode === m.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode(m.value)}
                className="whitespace-nowrap"
              >
                <span className="mr-1">{m.icon}</span>
                {m.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 py-8">
        {isSearching && (
          <div className="text-center py-12">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg text-muted-foreground">
              {mode === 'deep' ? 'Conducting deep research...' : 'Searching...'}
            </p>
          </div>
        )}

        {result && !isSearching && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Mode Badge */}
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {MODES.find(m => m.value === mode)?.icon} {MODES.find(m => m.value === mode)?.label} Mode
              </Badge>
              {result.research_plan && (
                <Badge variant="outline">Multi-step Research</Badge>
              )}
            </div>

            {/* Research Plan */}
            {result.research_plan && result.research_plan.length > 0 && (
              <Card className="p-4 bg-primary/5">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Research Plan
                </h3>
                <ol className="space-y-1 text-sm">
                  {result.research_plan.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-medium text-primary">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </Card>
            )}

            {/* Answer */}
            <Card className="p-6">
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{result.answer}</ReactMarkdown>
              </div>
            </Card>

            {/* Sources */}
            {result.sources.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Sources ({result.sources.length})
                </h3>
                <div className="grid gap-3">
                  {result.sources.map((source) => (
                    <Card key={source.citation_id} className="p-4 hover:border-primary/50 transition-colors">
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <div className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-1">
                            [{source.citation_id}]
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm mb-1 text-primary hover:underline">
                              {source.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mb-2 truncate">
                              {source.url}
                            </p>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {source.snippet}
                            </p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                        </div>
                      </a>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Next Actions */}
            {result.next_actions.length > 0 && (
              <Card className="p-4 bg-secondary/10">
                <h3 className="font-semibold mb-3">Next Actions</h3>
                <div className="space-y-2">
                  {result.next_actions.map((action, i) => (
                    <Button
                      key={i}
                      variant="ghost"
                      size="sm"
                      onClick={() => handleQuickAction(action)}
                      className="w-full justify-start text-left h-auto py-2 px-3"
                    >
                      <ChevronRight className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="text-sm">{action}</span>
                    </Button>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Empty State */}
        {!result && !isSearching && (
          <div className="text-center py-12 max-w-2xl mx-auto">
            <Sparkles className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-2">Ask CHATR Browser Anything</h2>
            <p className="text-muted-foreground mb-6">
              Get comprehensive answers with real-time research, citations, and actionable next steps
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8">
              {[
                'Best restaurants near me',
                'Latest AI developments 2024',
                'How to learn Python programming',
                'Healthcare options in my area',
                'Job opportunities for software engineers',
                'Compare electric cars 2024',
              ].map((example, i) => (
                <Button
                  key={i}
                  variant="outline"
                  onClick={() => handleQuickAction(example)}
                  className="text-left justify-start h-auto py-3"
                >
                  <Search className="h-4 w-4 mr-2 flex-shrink-0" />
                  {example}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
