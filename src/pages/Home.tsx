import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { QuickAccessBrowser } from '@/components/QuickAccessBrowser';
import { TrendingSearches } from '@/components/search/TrendingSearches';
import { CategoryShortcuts } from '@/components/search/CategoryShortcuts';
import { Search, Mic, Sparkles, Navigation, Heart, Briefcase, UtensilsCrossed, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentLocation } from '@/utils/locationService';
import { useAnonymousSearchLimit } from '@/hooks/useAnonymousSearchLimit';
import { LoginPromptModal } from '@/components/LoginPromptModal';
import { SEOHead } from '@/components/SEOHead';

const Home = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [gpsEnabled, setGpsEnabled] = useState(false);
  
  const {
    canSearch,
    searchCount,
    remainingSearches,
    isAuthenticated,
    showLoginPrompt,
    incrementSearch,
    closeLoginPrompt,
    loading,
    maxSearches,
  } = useAnonymousSearchLimit();

  const activateGPS = async () => {
    try {
      const coords = await getCurrentLocation();
      if (coords) {
        setGpsEnabled(true);
        toast.success('GPS activated for local results');
      }
    } catch (error) {
      toast.error('Failed to get location');
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    // Check if user can search
    if (!canSearch) {
      return; // Login prompt is already showing
    }

    // Increment search count (will show login prompt if limit reached)
    const allowed = incrementSearch();
    
    if (allowed) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      
      // Show remaining searches warning
      if (!isAuthenticated && remainingSearches > 0 && remainingSearches <= 2) {
        toast.info(`${remainingSearches} free search${remainingSearches === 1 ? '' : 'es'} remaining`);
      }
    }
  };

  const handleCategoryClick = (query: string) => {
    // Check if user can search
    if (!canSearch) {
      return; // Login prompt is already showing
    }

    const allowed = incrementSearch();
    
    if (allowed) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
      
      if (!isAuthenticated && remainingSearches > 0 && remainingSearches <= 2) {
        toast.info(`${remainingSearches} free search${remainingSearches === 1 ? '' : 'es'} remaining`);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Chatr - Universal Search | AI-Powered Multi-Source Search"
        description="Find anything instantly with Chatr's Universal Search. Search across web, local services, jobs, healthcare, and marketplace with AI-powered intelligence, GPS location, and visual search."
        keywords="universal search, AI search engine, multi-source search, local search, GPS search, visual search, smart search, perplexity alternative, openai search"
      />
      
      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={closeLoginPrompt}
        searchCount={searchCount}
        maxSearches={maxSearches}
      />
      
      <div className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        
        <div className="relative max-w-5xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Universal Search
              </h1>
            </div>
            <p className="text-xl text-muted-foreground font-medium">
              Ask Anything. Find Everything. Instantly.
            </p>
          </div>

          {/* Main Search Bar */}
          <Card className="p-6 bg-card/50 backdrop-blur-xl border-2 shadow-xl">
            {/* Anonymous Search Counter */}
            {!isAuthenticated && (
              <div className="mb-4 p-3 bg-primary/5 border border-primary/10 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    {remainingSearches === Infinity 
                      ? 'Unlimited searches' 
                      : `${remainingSearches} free search${remainingSearches === 1 ? '' : 'es'} remaining`}
                  </span>
                </div>
                {remainingSearches !== Infinity && remainingSearches <= 1 && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      sessionStorage.setItem('auth_redirect', '/home');
                      navigate('/auth');
                    }}
                    className="text-xs h-7"
                  >
                    Sign in
                  </Button>
                )}
              </div>
            )}
            
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Find plumber, order food, doctor, hire driver..."
                  className="pl-12 pr-14 h-14 text-lg border-2 focus-visible:ring-2"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                >
                  <Mic className="w-5 h-5" />
                </Button>
              </div>
              <Button 
                size="lg" 
                onClick={handleSearch}
                className="h-14 px-8 text-base font-semibold"
              >
                Search
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button
                  variant={gpsEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={activateGPS}
                  className="gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  {gpsEnabled ? 'GPS Active' : 'Activate GPS'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Powered by AI • Multi-source results
              </p>
            </div>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <Card className="p-4 text-center bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <p className="text-2xl font-bold text-blue-600">∞</p>
              <p className="text-xs text-muted-foreground">Web Sources</p>
            </Card>
            <Card className="p-4 text-center bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <p className="text-2xl font-bold text-green-600">AI</p>
              <p className="text-xs text-muted-foreground">Visual Search</p>
            </Card>
            <Card className="p-4 text-center bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <p className="text-2xl font-bold text-purple-600">Smart</p>
              <p className="text-xs text-muted-foreground">Alerts</p>
            </Card>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Quick Access to Live Services */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card 
            className="p-4 cursor-pointer hover:shadow-lg transition-all bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20"
            onClick={() => navigate('/local-healthcare')}
          >
            <Heart className="w-6 h-6 text-blue-600 mb-2" />
            <h4 className="font-semibold text-sm">Healthcare</h4>
            <p className="text-xs text-muted-foreground">Find doctors & clinics</p>
          </Card>
          <Card 
            className="p-4 cursor-pointer hover:shadow-lg transition-all bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20"
            onClick={() => navigate('/chatr-world?tab=jobs')}
          >
            <Briefcase className="w-6 h-6 text-green-600 mb-2" />
            <h4 className="font-semibold text-sm">Jobs</h4>
            <p className="text-xs text-muted-foreground">Find opportunities</p>
          </Card>
          <Card 
            className="p-4 cursor-pointer hover:shadow-lg transition-all bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20"
            onClick={() => navigate('/chatr-world?tab=food')}
          >
            <UtensilsCrossed className="w-6 h-6 text-orange-600 mb-2" />
            <h4 className="font-semibold text-sm">Food</h4>
            <p className="text-xs text-muted-foreground">Order food nearby</p>
          </Card>
          <Card 
            className="p-4 cursor-pointer hover:shadow-lg transition-all bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20"
            onClick={() => navigate('/chatr-world?tab=deals')}
          >
            <Tag className="w-6 h-6 text-purple-600 mb-2" />
            <h4 className="font-semibold text-sm">Deals</h4>
            <p className="text-xs text-muted-foreground">Cashback & offers</p>
          </Card>
        </div>

        {/* AI Browser */}
        <div>
          <h3 className="font-semibold text-sm mb-3">AI-Powered Features</h3>
          <QuickAccessBrowser />
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-transparent">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-2">AI-Powered</h3>
            <p className="text-sm text-muted-foreground">
              Smart intent understanding with multi-source results
            </p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-500/5 to-transparent">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold mb-2">Web Search</h3>
            <p className="text-sm text-muted-foreground">
              Integrates with Perplexity, OpenAI, and major search engines
            </p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-500/5 to-transparent">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <Navigation className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold mb-2">GPS-Based</h3>
            <p className="text-sm text-muted-foreground">
              Find services nearby with real-time location tracking
            </p>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-500/5 to-transparent">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold mb-2">Visual Search</h3>
            <p className="text-sm text-muted-foreground">
              Upload photos to find similar services and products
            </p>
          </Card>
        </div>

        {/* New Features Highlight */}
        <Card className="p-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <h3 className="font-semibold text-lg mb-4">🚀 New Features</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Saved Searches
              </h4>
              <p className="text-sm text-muted-foreground">
                Save your searches and get notified when new results appear
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Search className="w-4 h-4 text-primary" />
                Web Integration
              </h4>
              <p className="text-sm text-muted-foreground">
                Search across Google, Perplexity, OpenAI, and more sources
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-primary" />
                Visual Search
              </h4>
              <p className="text-sm text-muted-foreground">
                Upload images to find similar items, services, and products
              </p>
            </div>
          </div>
        </Card>

        {/* Example Searches */}
        <Card className="p-6 bg-gradient-to-br from-muted/50 to-transparent">
          <h3 className="font-semibold mb-4">Try these searches:</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              '"plumber near me"',
              '"biryani delivery"',
              '"doctor available now"',
              '"hire a driver"',
              '"AC repair service"',
              '"yoga classes nearby"',
              '"best restaurants"',
              '"job openings"'
            ].map((example) => (
              <Button
                key={example}
                variant="outline"
                className="justify-start text-left h-auto py-3"
                onClick={() => {
                  const query = example.replace(/"/g, '');
                  setSearchQuery(query);
                  handleCategoryClick(query);
                }}
              >
                <Search className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{example}</span>
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </div>
    </>
  );
};

export default Home;
