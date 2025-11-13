import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  Search, 
  MapPin, 
  Star, 
  ArrowLeft, 
  Mic, 
  Sparkles,
  Loader2,
  Phone,
  MessageCircle,
  Navigation,
  Heart,
  Wallet,
  ExternalLink,
  Bookmark,
  Globe,
  Image as ImageIcon
} from 'lucide-react';
import { TrendingSearches } from '@/components/search/TrendingSearches';
import { CategoryShortcuts } from '@/components/search/CategoryShortcuts';
import { SavedSearches } from '@/components/search/SavedSearches';
import { FavoriteResults } from '@/components/search/FavoriteResults';
import { VisualSearchUpload } from '@/components/search/VisualSearchUpload';
import { getCurrentLocation } from '@/utils/locationService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  contact?: string;
  address?: string;
  distance?: number;
  rating: number;
  review_count: number;
  price?: string;
  image_url?: string;
  verified: boolean;
  source: string;
  result_type: string;
  metadata?: any;
}

const UniversalSearch = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [webResults, setWebResults] = useState<any>(null);
  const [visualResults, setVisualResults] = useState<any>(null);
  const [aiIntent, setAiIntent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [webSearchLoading, setWebSearchLoading] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [isFavorite, setIsFavorite] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const activateGPS = async () => {
    try {
      const coords = await getCurrentLocation();
      if (coords) {
        setLocation(coords);
        setGpsEnabled(true);
        toast.success('GPS activated for local results');
      }
    } catch (error) {
      toast.error('Failed to get location');
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const searchPayload: any = { 
        query,
        userId: user?.id
      };

      if (location) {
        searchPayload.latitude = location.latitude;
        searchPayload.longitude = location.longitude;
        searchPayload.maxDistance = 10;
      }

      // Parallel search: Internal + Web
      const [internalData, webData] = await Promise.all([
        supabase.functions.invoke('universal-search-engine', { body: searchPayload }),
        supabase.functions.invoke('web-search-aggregator', { 
          body: { query, sources: ['perplexity', 'openai', 'web'], maxResults: 10 } 
        })
      ]);

      if (internalData.data) {
        setAiIntent(internalData.data.intent);
        setResults(internalData.data.results || []);
      }

      if (webData.data) {
        setWebResults(webData.data);
      }

      // Save search if user is logged in
      if (user && query) {
        await supabase.from('saved_searches').upsert({
          user_id: user.id,
          query,
          results_count: (internalData.data?.results?.length || 0) + (webData.data?.results?.length || 0)
        }, {
          onConflict: 'user_id,query',
          ignoreDuplicates: false
        });
      }

    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    performSearch(searchQuery);
  };

  const trackInteraction = async (resultId: string, action: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_search_interactions').insert({
        user_id: user.id,
        result_id: resultId,
        action
      });
    }
  };

  const toggleFavorite = async (result: SearchResult) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please login to save favorites');
      return;
    }

    try {
      if (isFavorite[result.id]) {
        // Remove from favorites
        await supabase
          .from('favorite_results')
          .delete()
          .eq('user_id', user.id)
          .eq('result_id', result.id);
        
        setIsFavorite(prev => ({ ...prev, [result.id]: false }));
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        await supabase
          .from('favorite_results')
          .insert({
            user_id: user.id,
            result_id: result.id
          });
        
        setIsFavorite(prev => ({ ...prev, [result.id]: true }));
        toast.success('Added to favorites');
      }
      
      trackInteraction(result.id, isFavorite[result.id] ? 'unfavorited' : 'favorited');
    } catch (error) {
      toast.error('Failed to update favorites');
    }
  };

  const handleCall = (result: SearchResult) => {
    if (result.contact) {
      trackInteraction(result.id, 'called');
      window.location.href = `tel:${result.contact}`;
    } else {
      toast.error('Contact information not available');
    }
  };

  const handleChat = (result: SearchResult) => {
    trackInteraction(result.id, 'chat_clicked');
    toast.info('Opening chat...');
  };

  const handleGetDirections = (result: SearchResult) => {
    if (result.address) {
      trackInteraction(result.id, 'directions_clicked');
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.address)}`, '_blank');
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'service': return 'bg-blue-500/10 text-blue-600';
      case 'job': return 'bg-green-500/10 text-green-600';
      case 'healthcare': return 'bg-red-500/10 text-red-600';
      case 'food': return 'bg-orange-500/10 text-orange-600';
      case 'seller': return 'bg-purple-500/10 text-purple-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">Universal AI Search</h1>
              <p className="text-xs text-muted-foreground">Ask Anything. Find Everything. Instantly.</p>
            </div>
            <Button 
              variant={gpsEnabled ? "default" : "outline"} 
              size="sm"
              onClick={activateGPS}
              className="gap-2"
            >
              <Navigation className="w-4 h-4" />
              {gpsEnabled ? 'GPS On' : 'GPS'}
            </Button>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Find plumber, order food, doctor, jobs..."
                className="pl-10 pr-12"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2"
              >
                <Mic className="w-4 h-4" />
              </Button>
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
            </Button>
          </div>

          {/* AI Intent Banner */}
          {aiIntent && (
            <div className="mt-3 p-3 bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-primary mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-1">
                    AI understands: {aiIntent.intent}
                  </p>
                  {aiIntent.suggestions && (
                    <div className="flex flex-wrap gap-1">
                      {aiIntent.suggestions.slice(0, 3).map((suggestion: string, i: number) => (
                        <Badge 
                          key={i}
                          variant="outline" 
                          className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground"
                          onClick={() => {
                            setSearchQuery(suggestion);
                            performSearch(suggestion);
                          }}
                        >
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {!searchQuery && !loading && results.length === 0 && (
          <>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="saved">Saved</TabsTrigger>
                <TabsTrigger value="visual">Visual Search</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-6">
                <TrendingSearches onSearchClick={(query) => {
                  setSearchQuery(query);
                  performSearch(query);
                }} />
                <CategoryShortcuts onCategoryClick={(query) => {
                  setSearchQuery(query);
                  performSearch(query);
                }} />
              </TabsContent>
              
              <TabsContent value="saved" className="mt-6">
                <SavedSearches onSearchClick={(query) => {
                  setSearchQuery(query);
                  performSearch(query);
                }} />
                <FavoriteResults onResultClick={(result) => {
                  setSearchQuery(result.title);
                  performSearch(result.title);
                }} />
              </TabsContent>
              
              <TabsContent value="visual" className="mt-6">
                <VisualSearchUpload onSearchComplete={(data) => {
                  setVisualResults(data);
                  if (data.search_query) {
                    setSearchQuery(data.search_query);
                    performSearch(data.search_query);
                  }
                }} />
              </TabsContent>
            </Tabs>
          </>
        )}

        {/* Visual Search Results */}
        {visualResults && (
          <Card className="p-5 mb-6 bg-gradient-to-br from-primary/5 to-transparent">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              Visual Search Analysis
            </h3>
            <div className="space-y-3">
              {visualResults.detected_objects && (
                <div>
                  <p className="text-sm font-medium mb-2">Detected Objects:</p>
                  <div className="flex flex-wrap gap-2">
                    {visualResults.detected_objects.map((obj: string, i: number) => (
                      <Badge key={i} variant="secondary">{obj}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {visualResults.ai_recommendations && (
                <div>
                  <p className="text-sm font-medium mb-2">AI Recommendations:</p>
                  <p className="text-sm text-muted-foreground">{visualResults.ai_recommendations}</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Web Search Results */}
        {webResults && webResults.synthesis && (
          <Card className="p-5 mb-6 bg-gradient-to-br from-blue-500/5 to-transparent border-blue-500/20">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Web Search Summary
            </h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{webResults.synthesis}</p>
          </Card>
        )}

        {loading && results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Searching across all sources...</p>
          </div>
        ) : results.length === 0 && searchQuery ? (
          <div className="text-center py-16">
            <Search className="w-20 h-20 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium mb-2">No results found</p>
            <p className="text-muted-foreground mb-4">Try different keywords or activate GPS for local results</p>
            <Button onClick={activateGPS} variant="outline" className="gap-2">
              <Navigation className="w-4 h-4" />
              Activate GPS
            </Button>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found <span className="font-semibold text-foreground">{results.length}</span> results
              </p>
              {gpsEnabled && (
                <Badge variant="secondary" className="gap-1">
                  <Navigation className="w-3 h-3" />
                  Showing nearby
                </Badge>
              )}
            </div>

            {results.map((result) => (
              <Card key={result.id} className="p-5 hover:shadow-lg transition-all">
                <div className="flex gap-4">
                  {result.image_url && (
                    <img 
                      src={result.image_url} 
                      alt={result.title}
                      className="w-28 h-28 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-lg">{result.title}</h3>
                          {result.verified && (
                            <Badge variant="secondary" className="text-xs">
                              ✓ Verified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge variant="outline" className={getTypeColor(result.result_type)}>
                            {result.result_type}
                          </Badge>
                          {result.metadata?.category && (
                            <span className="text-xs text-muted-foreground">
                              {result.metadata.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {result.price && (
                          <p className="font-bold text-lg text-primary mb-1">{result.price}</p>
                        )}
                        {result.rating > 0 && (
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{result.rating.toFixed(1)}</span>
                            <span className="text-muted-foreground">({result.review_count})</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {result.description}
                    </p>

                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {result.address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            <span className="line-clamp-1">{result.address}</span>
                          </div>
                        )}
                        {result.distance && (
                          <Badge variant="outline" className="text-primary gap-1">
                            <Navigation className="w-3 h-3" />
                            {result.distance.toFixed(1)} km
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3 flex-wrap">
                      {result.contact && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleCall(result)}
                          className="gap-1"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          Call
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleChat(result)}
                        className="gap-1"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Chat
                      </Button>
                      {result.address && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleGetDirections(result)}
                          className="gap-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Directions
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleFavorite(result)}
                        className="gap-1"
                      >
                        <Heart className={`w-3.5 h-3.5 ${isFavorite[result.id] ? 'fill-red-500 text-red-500' : ''}`} />
                        {isFavorite[result.id] ? 'Saved' : 'Save'}
                      </Button>
                      <Button 
                        size="sm"
                        className="gap-1"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        Book
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default UniversalSearch;
