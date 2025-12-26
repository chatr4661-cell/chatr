import { useState, useEffect, useCallback, useRef } from 'react';
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
  Image as ImageIcon,
  Zap,
  Briefcase
} from 'lucide-react';
import { TrendingSearches } from '@/components/search/TrendingSearches';
import { CategoryShortcuts } from '@/components/search/CategoryShortcuts';
import { SavedSearches } from '@/components/search/SavedSearches';
import { FavoriteResults } from '@/components/search/FavoriteResults';
import { VisualSearchUpload } from '@/components/search/VisualSearchUpload';
import { useLocation } from '@/contexts/LocationContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AISummaryContent } from '@/components/ai/AISummaryContent';
import { useLocalAI } from '@/hooks/useLocalAI';
import { detectJobIntent, JobIntent } from '@/services/intentEngine/jobIntentDetector';
import { JobActionCards, JobListing } from '@/components/jobs/JobActionCards';
import { crawlJobs } from '@/lib/api/jobCrawler';

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

// Helper function for time ago
const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

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
  const { location, isLoading: locationLoading, error: locationError } = useLocation();
  const [isFavorite, setIsFavorite] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState('all');
  
  // Job Intent Engine state
  const [jobIntent, setJobIntent] = useState<JobIntent | null>(null);
  const [jobListings, setJobListings] = useState<JobListing[]>([]);
  const [jobsLoading, setJobsLoading] = useState(false);
  
  // Local AI for instant responses
  const { analyzeIntent, supportsWebGPU } = useLocalAI();
  const [instantAnswer, setInstantAnswer] = useState<string | null>(null);
  const [localSuggestions, setLocalSuggestions] = useState<string[]>([]);
  const searchStartTime = useRef(Date.now());

  // Instant local analysis when typing
  const handleQueryChange = useCallback(async (value: string) => {
    setSearchQuery(value);
    
    // Instant local AI analysis (no network delay)
    if (value.trim().length > 2) {
      const localResult = await analyzeIntent(value);
      setLocalSuggestions(localResult.suggestedQueries);
      if (localResult.quickAnswer) {
        setInstantAnswer(localResult.quickAnswer);
      } else {
        setInstantAnswer(null);
      }
    } else {
      setLocalSuggestions([]);
      setInstantAnswer(null);
    }
  }, [analyzeIntent]);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const performSearch = async (query: string, additionalFilter?: string) => {
    if (!query.trim()) return;
    
    const fullQuery = additionalFilter ? `${query} ${additionalFilter}` : query;
    
    searchStartTime.current = Date.now();
    setLoading(true);
    setWebSearchLoading(true);
    setResults([]);
    setInstantAnswer(null);
    setWebResults(null);
    setJobListings([]);
    setJobIntent(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // 🔥 INTENT ENGINE: Check if this is a job search
      const detectedJobIntent = detectJobIntent(fullQuery);
      
      if (detectedJobIntent.isJobSearch && detectedJobIntent.confidence > 0.3) {
        // This is a job search - use Action Engine instead of web search
        setJobIntent(detectedJobIntent);
        setJobsLoading(true);
        
        // Fetch jobs from internal database first
        let jobQuery = supabase
          .from('chatr_jobs')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(20);
        
        // Apply location filter if detected
        if (detectedJobIntent.extractedData.location) {
          jobQuery = jobQuery.ilike('location', `%${detectedJobIntent.extractedData.location}%`);
        }
        
        // Apply job type filter if detected
        if (detectedJobIntent.extractedData.jobType) {
          jobQuery = jobQuery.eq('job_type', detectedJobIntent.extractedData.jobType);
        }
        
        // Apply category filter if detected
        if (detectedJobIntent.extractedData.category) {
          jobQuery = jobQuery.eq('category', detectedJobIntent.extractedData.category);
        }
        
        const { data: jobs, error: jobsError } = await jobQuery;
        
        if (!jobsError && jobs && jobs.length > 0) {
          // Calculate posted_ago
          const jobsWithMeta = jobs.map(job => ({
            ...job,
            posted_ago: getTimeAgo(job.created_at),
            is_urgent: detectedJobIntent.extractedData.urgency === 'immediate',
          }));
          
          setJobListings(jobsWithMeta);
          setJobsLoading(false);
          setLoading(false);
          setWebSearchLoading(false);
          
          // Also set AI intent for display
          setAiIntent({
            intent: `Found ${jobs.length} job${jobs.length > 1 ? 's' : ''} matching your search`,
            suggestions: detectedJobIntent.suggestedFilters,
          });
          
          // Save search
          if (user && query) {
            try {
              await supabase.from('saved_searches').upsert({
                user_id: user.id,
                query,
                results_count: jobs.length
              }, {
                onConflict: 'user_id,query',
                ignoreDuplicates: false
              });
            } catch (err) {
              console.error('Failed to save search:', err);
            }
          }
          
          return; // Exit early - job action cards will be shown
        }
        
        // No internal jobs found - trigger crawler to fetch from public sources
        console.log('🔄 No internal jobs found, triggering crawler...');
        
        // Trigger background crawl for this location/query
        const crawlResult = await crawlJobs({
          query: detectedJobIntent.extractedData.category || fullQuery,
          location: detectedJobIntent.extractedData.location || 'India',
          limit: 15
        });
        
        if (crawlResult.success && crawlResult.jobs && crawlResult.jobs.length > 0) {
          // Use the crawled & normalized jobs
          const crawledJobs = crawlResult.jobs.map((job: any) => ({
            ...job,
            id: job.id || `crawled-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            posted_ago: 'Just added',
            is_urgent: detectedJobIntent.extractedData.urgency === 'immediate',
          }));
          
          setJobListings(crawledJobs);
          setJobsLoading(false);
          setLoading(false);
          setWebSearchLoading(false);
          
          setAiIntent({
            intent: `Found ${crawledJobs.length} jobs from public sources`,
            suggestions: detectedJobIntent.suggestedFilters,
          });
          
          toast.success(`Found ${crawledJobs.length} jobs matching your search`);
          return;
        }
        
        setJobsLoading(false);
        // If crawl also failed, fall through to web search
      }

      // Generate or get session ID
      let sessionId = localStorage.getItem('chatr_session_id');
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('chatr_session_id', sessionId);
      }

      // Call CHATR Universal Search (Google Custom Search + AI)
      console.log('Calling universal-search function...');
      const { data: searchData, error: searchError } = await supabase.functions.invoke('universal-search', {
        body: { 
          query, 
          sessionId,
          userId: user?.id || null,
          gpsLat: location?.latitude || null,
          gpsLon: location?.longitude || null
        }
      });

      setWebSearchLoading(false);

      if (searchError) {
        console.error('Universal search error:', searchError);
        toast.error('Search error. Please try again.');
      } else if (searchData) {
        console.log('Universal search results:', searchData);

        const aiError = (searchData as any).aiAnswerError || searchData.aiAnswer?.error;
        if (aiError) {
          toast.error(aiError);
        }

        // Set web results with AI answer and images
        // Filter out favicons - only use real images (AI images or images from Google Image Search)
        const aiImages = searchData.aiAnswer?.images || [];
        // Only use result images if they're real images (not favicons)
        const realImages = aiImages.length > 0 ? aiImages : [];

        setWebResults({
          synthesis: searchData.aiAnswer?.text || null,
          results: searchData.results || [],
          suggestions: [],
          sources: searchData.aiAnswer?.sources || [],
          images: realImages
        });

        // Convert to SearchResult format for display
        const searchResults: SearchResult[] = (searchData.results || []).map((r: any, idx: number) => ({
          id: `web-${idx}`,
          title: r.title,
          description: r.snippet,
          contact: undefined,
          address: r.displayUrl,
          rating: 0,
          review_count: 0,
          price: undefined,
          verified: false,
          source: r.source || 'google',
          result_type: r.detectedType || 'generic_web',
          metadata: { 
            url: r.url,
            faviconUrl: r.faviconUrl,
            score: r.score,
            rank: r.rank,
            searchId: searchData.searchId,
            sessionId
          }
        }));

        setResults(searchResults);

        // AI intent
        setAiIntent({
          intent: searchData.aiAnswer?.text ? 'AI Summary Available' : `Searching for: "${query}"`,
          suggestions: [
            `${query} near me`,
            `best ${query}`,
            `${query} reviews`
          ]
        });
      }

      // Save search if user is logged in
      if (user && query) {
        try {
          await supabase.from('saved_searches').upsert({
            user_id: user.id,
            query,
            results_count: searchData?.results?.length || 0
          }, {
            onConflict: 'user_id,query',
            ignoreDuplicates: false
          });
        } catch (err) {
          console.error('Failed to save search:', err);
        }
      }

    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
      setWebSearchLoading(false);
    }
  };

  const handleSearch = () => {
    performSearch(searchQuery);
  };

  const logClick = async (result: SearchResult, startTime: number) => {
    try {
      const sessionId = localStorage.getItem('chatr_session_id');
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.functions.invoke('click-log', {
        body: {
          searchId: result.metadata?.searchId,
          sessionId: sessionId || '',
          userId: user?.id || null,
          resultUrl: result.metadata?.url,
          resultRank: result.metadata?.rank || 0,
          resultType: result.result_type || 'generic_web',
          timeToClickMs: Date.now() - startTime
        }
      });
    } catch (error) {
      console.error('Failed to log click:', error);
    }
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
              variant="outline"
              size="sm"
              disabled={locationLoading}
              className="gap-2"
            >
              <Navigation className="w-4 h-4" />
              {locationLoading ? 'Loading...' : location ? 'Location On' : 'No Location'}
            </Button>
          </div>

          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
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

          {/* Instant Local AI Suggestions (appears while typing) */}
          {localSuggestions.length > 0 && !loading && (
            <div className="mt-2 p-2 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex flex-wrap gap-1.5">
                {localSuggestions.map((suggestion, i) => (
                  <Badge 
                    key={i}
                    variant="outline" 
                    className="text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => {
                      setSearchQuery(suggestion);
                      performSearch(suggestion);
                    }}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>
              {instantAnswer && (
                <p className="text-xs text-muted-foreground mt-2">{instantAnswer}</p>
              )}
            </div>
          )}

          {/* Removed AI Intent Banner - was redundant */}
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
          <Card className="p-4 mb-4 bg-card">
            <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
              <ImageIcon className="w-4 h-4 text-primary" />
              Visual Search Analysis
            </h3>
            <div className="space-y-2">
              {visualResults.detected_objects && (
                <div>
                  <p className="text-xs font-medium mb-1">Detected Objects:</p>
                  <div className="flex flex-wrap gap-1">
                    {visualResults.detected_objects.map((obj: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{obj}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {visualResults.ai_recommendations && (
                <div>
                  <p className="text-xs font-medium mb-1">AI Recommendations:</p>
                  <p className="text-xs text-muted-foreground">{visualResults.ai_recommendations}</p>
                </div>
              )}
            </div>
          </Card>
        )}


        {/* Perplexity-Style AI Summary with Images */}
        {webResults && webResults.synthesis && (
          <Card className="p-5 mb-6 bg-gradient-to-br from-primary/5 via-background to-background border-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wide">AI Answer</span>
            </div>
            <AISummaryContent 
              content={webResults.synthesis}
              sources={webResults.sources}
              images={webResults.images}
            />
          </Card>
        )}

        {/* 🔥 JOB ACTION CARDS - Show when job intent detected */}
        {jobIntent?.isJobSearch && jobListings.length > 0 && (
          <JobActionCards
            jobs={jobListings}
            intent={jobIntent}
            onApply={(job) => navigate(`/jobs/${job.id}`)}
            onFilterSelect={(filter) => performSearch(searchQuery, filter)}
            isLoading={jobsLoading}
          />
        )}

        {loading && results.length === 0 && !jobListings.length ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground font-medium mb-1">Searching the web at lightning speed...</p>
            <p className="text-xs text-muted-foreground">Powered by DuckDuckGo + AI</p>
          </div>
        ) : results.length === 0 && searchQuery && !jobListings.length ? (
          <div className="text-center py-16">
            <Search className="w-20 h-20 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium mb-2">No results found</p>
            <p className="text-muted-foreground mb-4">Try different keywords</p>
          </div>
        ) : results.length > 0 && !jobListings.length ? (
          <div className="space-y-3">
            {/* Map placeholder */}
            {location && (
              <Card className="p-0 mb-4 overflow-hidden">
                <div className="h-48 bg-gradient-to-br from-blue-100 to-green-100 relative flex items-center justify-center">
                  <MapPin className="w-12 h-12 text-primary/40" />
                  <p className="absolute bottom-3 left-3 text-xs bg-background/90 px-2 py-1 rounded">
                    📍 Showing results near {location.city || 'you'}
                  </p>
                </div>
              </Card>
            )}

            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Search Results
            </h2>

            {results.map((result) => (
              <Card key={result.id} className="p-4 hover:shadow-md transition-all border border-border/50">
                <div className="flex gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-base text-primary hover:underline cursor-pointer flex items-center gap-1"
                          onClick={() => {
                            logClick(result, Date.now());
                            window.open(result.metadata?.url, '_blank');
                          }}>
                        {result.title}
                        <ExternalLink className="w-3 h-3" />
                      </h3>
                      <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
                        {result.source}
                      </Badge>
                    </div>
                    
                    {result.metadata?.url && (
                      <a 
                        href={result.metadata.url}
                        target="_blank"
                        rel="noopener noreferrer" 
                        className="text-xs text-muted-foreground hover:underline line-clamp-1 mb-2 flex items-center gap-1"
                      >
                        {new URL(result.metadata.url).hostname}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}

                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                      {result.description}
                    </p>

                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(result.metadata?.url, '_blank')}
                        className="gap-1 text-xs h-7"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Visit Site
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleFavorite(result)}
                        className="gap-1 text-xs h-7"
                      >
                        <Heart className={`w-3 h-3 ${isFavorite[result.id] ? 'fill-red-500 text-red-500' : ''}`} />
                        Save
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
