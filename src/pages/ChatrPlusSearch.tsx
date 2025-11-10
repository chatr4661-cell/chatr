import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Sparkles, 
  MapPin, 
  Star, 
  ArrowLeft,
  Loader2,
  Filter,
  SlidersHorizontal
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function ChatrPlusSearch() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [aiResults, setAiResults] = useState<any[]>([]);
  const [isAiSearching, setIsAiSearching] = useState(false);

  // Fetch services based on search query
  const { data: services, isLoading } = useQuery({
    queryKey: ['chatr-plus-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];

      const { data, error } = await supabase
        .from('chatr_plus_services')
        .select(`
          *,
          seller:chatr_plus_sellers(business_name, logo_url, city, rating_average, is_verified),
          category:chatr_plus_categories(name, slug)
        `)
        .eq('is_active', true)
        .or(`service_name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .limit(20);
      
      if (error) throw error;
      return data;
    },
    enabled: searchQuery.length > 0
  });

  // AI-powered search
  const performAiSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsAiSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('chatr-plus-ai-search', {
        body: { query: searchQuery }
      });

      if (error) throw error;
      
      if (data?.suggestions) {
        setAiResults(data.suggestions);
        toast.success('AI found relevant services!');
      }
    } catch (error) {
      console.error('AI search error:', error);
      toast.error('AI search unavailable, showing standard results');
    } finally {
      setIsAiSearching(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      performAiSearch();
    }
  }, [searchQuery]);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/chatr-plus/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const allResults = [...(aiResults || []), ...(services || [])];

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/chatr-plus')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold">Search Results</h1>
          </div>

          {/* Search Bar */}
          <div className="relative flex items-center gap-2 bg-muted rounded-full p-2">
            <Sparkles className="w-5 h-5 text-primary ml-3" />
            <Input
              type="text"
              placeholder="Find a dentist, order biryani, hire a plumber..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1 border-0 bg-transparent focus-visible:ring-0"
            />
            <Button
              onClick={handleSearch}
              size="sm"
              className="rounded-full"
              disabled={isAiSearching}
            >
              {isAiSearching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {isAiSearching && (
            <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AI is finding the best results for you...</span>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : allResults.length === 0 ? (
          <div className="text-center py-12">
            <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No results found</h3>
            <p className="text-muted-foreground mb-4">
              Try searching for something else or browse our categories
            </p>
            <Button onClick={() => navigate('/chatr-plus')}>
              Browse Categories
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold">
                  Found {allResults.length} services
                </h2>
                <p className="text-sm text-muted-foreground">
                  Showing results for "{searchQuery}"
                </p>
              </div>
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allResults.map((service: any, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className="cursor-pointer hover:shadow-lg transition-all overflow-hidden h-full"
                    onClick={() => navigate(`/chatr-plus/service/${service.id}`)}
                  >
                    {service.image_url && (
                      <div className="h-40 bg-muted overflow-hidden">
                        <img
                          src={service.image_url}
                          alt={service.service_name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-lg line-clamp-1">
                          {service.service_name}
                        </h3>
                        {service.is_featured && (
                          <Badge className="bg-primary/10 text-primary text-xs">Featured</Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {service.description}
                      </p>

                      <div className="flex items-center gap-2 mb-3">
                        {service.seller?.logo_url && (
                          <img
                            src={service.seller.logo_url}
                            alt={service.seller.business_name}
                            className="w-6 h-6 rounded-full"
                          />
                        )}
                        <span className="text-sm font-medium line-clamp-1">
                          {service.seller?.business_name}
                        </span>
                        {service.seller?.is_verified && (
                          <Badge variant="secondary" className="text-xs">✓</Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                            <span className="text-sm font-medium">
                              {service.rating_average || service.seller?.rating_average || '4.5'}
                            </span>
                          </div>
                          {service.seller?.city && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              <span className="text-xs">{service.seller.city}</span>
                            </div>
                          )}
                        </div>
                        {service.price && (
                          <div className="text-lg font-bold text-primary">
                            ₹{service.price}
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
