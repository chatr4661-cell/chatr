import React, { useState, useEffect } from 'react';
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
  MessageCircle
} from 'lucide-react';

interface SearchResult {
  id: string;
  type: 'service' | 'job' | 'healthcare' | 'food' | 'deal';
  name: string;
  category: string;
  description: string;
  price: string;
  rating: number;
  reviewCount: number;
  location: string;
  distance?: string;
  image?: string;
  seller?: {
    name: string;
    verified: boolean;
  };
}

const UniversalSearch = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [aiIntent, setAiIntent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    setAiLoading(true);

    try {
      // AI Intent Understanding + Database Search
      const aiResponse = await supabase.functions.invoke('universal-ai-search', {
        body: { query }
      });

      // Search Services
      const { data: servicesData } = await supabase
        .from('chatr_plus_services')
        .select('*, chatr_plus_sellers(*)')
        .or(`name.ilike.%${query}%, description.ilike.%${query}%, category.ilike.%${query}%`)
        .eq('is_active', true)
        .limit(10);

      // Set AI Intent
      if (aiResponse.data) {
        setAiIntent(aiResponse.data);
      }
      setAiLoading(false);

      // Combine all results
      const combinedResults: SearchResult[] = [];

      // Add services
      if (servicesData) {
        servicesData.forEach((service: any) => {
          combinedResults.push({
            id: service.id,
            type: 'service',
            name: service.name,
            category: service.category || 'Service',
            description: service.description || '',
            price: `₹${service.price}`,
            rating: service.average_rating || 4.5,
            reviewCount: service.review_count || 0,
            location: service.location || 'Nearby',
            seller: {
              name: service.chatr_plus_sellers?.business_name || 'Seller',
              verified: service.chatr_plus_sellers?.is_verified || false
            }
          });
        });
      }

      setResults(combinedResults);

      // Log search for analytics
      await supabase.from('chatr_search_history').insert({
        search_query: query,
        search_intent: aiResponse.data?.intent || 'general',
        category: aiResponse.data?.category || null,
        results_count: combinedResults.length
      });

    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to perform search');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    performSearch(searchQuery);
  };

  const handleBookNow = (result: SearchResult) => {
    if (result.type === 'service') {
      navigate(`/chatr-plus/service/${result.id}`);
    } else if (result.type === 'job') {
      navigate(`/local-jobs?id=${result.id}`);
    } else if (result.type === 'healthcare') {
      navigate(`/local-healthcare?id=${result.id}`);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'service': return 'bg-blue-500/10 text-blue-600';
      case 'job': return 'bg-green-500/10 text-green-600';
      case 'healthcare': return 'bg-red-500/10 text-red-600';
      case 'food': return 'bg-orange-500/10 text-orange-600';
      case 'deal': return 'bg-purple-500/10 text-purple-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold">Universal AI Search</h1>
              <p className="text-xs text-muted-foreground">Intelligent search across everything</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Find plumber, order biryani, dentist near me..."
                className="pl-10 pr-20"
              />
              {aiLoading && (
                <Sparkles className="absolute right-14 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-pulse" />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2"
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
            <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <div className="flex-1">
                  <p className="text-sm font-medium">AI understands: {aiIntent.intent}</p>
                  <p className="text-xs text-muted-foreground">
                    Category: {aiIntent.category} • {aiIntent.suggestions?.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading && results.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No results found. Try different keywords.' : 'Start searching...'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Found {results.length} results for "{searchQuery}"
            </p>
            {results.map((result) => (
              <Card key={result.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex gap-4">
                  {result.image && (
                    <img 
                      src={result.image} 
                      alt={result.name}
                      className="w-24 h-24 object-cover rounded-lg"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{result.name}</h3>
                          {result.seller?.verified && (
                            <Badge variant="secondary" className="text-xs">
                              ✓ Verified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Badge variant="outline" className={getTypeColor(result.type)}>
                            {result.category}
                          </Badge>
                          {result.seller && (
                            <span>by {result.seller.name}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg text-primary">{result.price}</p>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{result.rating}</span>
                          <span className="text-muted-foreground">({result.reviewCount})</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {result.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{result.location}</span>
                        {result.distance && (
                          <span className="text-primary">• {result.distance}</span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Phone className="w-4 h-4 mr-1" />
                          Call
                        </Button>
                        <Button variant="outline" size="sm">
                          <MessageCircle className="w-4 h-4 mr-1" />
                          Chat
                        </Button>
                        <Button size="sm" onClick={() => handleBookNow(result)}>
                          Book Now
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default UniversalSearch;