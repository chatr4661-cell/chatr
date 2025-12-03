import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, Mic, Navigation, Heart, Briefcase, UtensilsCrossed, Tag, 
  Sparkles, Globe, Bot, Shield, MapPin, TrendingUp, Camera, Bell
} from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentLocation } from '@/utils/locationService';
import { useAnonymousSearchLimit } from '@/hooks/useAnonymousSearchLimit';
import { LoginPromptModal } from '@/components/LoginPromptModal';
import { SEOHead } from '@/components/SEOHead';

const Home = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  
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
    setIsLocating(true);
    try {
      const coords = await getCurrentLocation();
      if (coords) {
        setGpsEnabled(true);
        toast.success('Location enabled');
      }
    } catch (error) {
      toast.error('Failed to get location');
    } finally {
      setIsLocating(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    if (!canSearch) return;
    const allowed = incrementSearch();
    if (allowed) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      if (!isAuthenticated && remainingSearches > 0 && remainingSearches <= 2) {
        toast.info(`${remainingSearches} free search${remainingSearches === 1 ? '' : 'es'} remaining`);
      }
    }
  };

  const handleQuickSearch = (query: string) => {
    if (!canSearch) return;
    const allowed = incrementSearch();
    if (allowed) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  const quickAccessItems = [
    { icon: Heart, title: 'Healthcare', desc: 'Find doctors', route: '/local-healthcare', gradient: 'from-rose-500 to-pink-600' },
    { icon: Briefcase, title: 'Jobs', desc: 'Find work', route: '/chatr-world?tab=jobs', gradient: 'from-emerald-500 to-teal-600' },
    { icon: UtensilsCrossed, title: 'Food', desc: 'Order now', route: '/chatr-world?tab=food', gradient: 'from-orange-500 to-amber-600' },
    { icon: Tag, title: 'Deals', desc: 'Save money', route: '/chatr-world?tab=deals', gradient: 'from-violet-500 to-purple-600' },
  ];

  const features = [
    { icon: Globe, title: 'AI Browser', desc: 'Smart web search', route: '/ai-browser-home' },
    { icon: Bot, title: 'AI Assistant', desc: 'Get instant help', route: '/ai-assistant' },
    { icon: Camera, title: 'Visual Search', desc: 'Search with images', route: '/search' },
    { icon: Bell, title: 'Smart Alerts', desc: 'Stay updated', route: '/notifications' },
  ];

  const trendingSearches = [
    'plumber near me', 'biryani delivery', 'doctor available now',
    'AC repair', 'yoga classes', 'job openings'
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <SEOHead
        title="Chatr - Universal Search | AI-Powered Multi-Source Search"
        description="Find anything instantly with Chatr's Universal Search. Search across web, local services, jobs, healthcare, and marketplace with AI-powered intelligence."
        keywords="universal search, AI search engine, multi-source search, local search, GPS search"
      />
      
      <LoginPromptModal
        isOpen={showLoginPrompt}
        onClose={closeLoginPrompt}
        searchCount={searchCount}
        maxSearches={maxSearches}
      />
      
      <div className="min-h-screen bg-background pb-24">
        {/* Hero Header */}
        <div className="bg-primary px-4 pt-8 pb-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary-foreground/10 opacity-90" />
          <div className="relative max-w-2xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
              <h1 className="text-2xl font-bold text-primary-foreground">Universal Search</h1>
            </div>
            <p className="text-primary-foreground/80 text-sm">
              Ask anything. Find everything.
            </p>
          </div>
        </div>

        {/* Search Card - Floating */}
        <div className="max-w-2xl mx-auto px-4 -mt-8">
          <Card className="glass-card p-4 shadow-elevated">
            {/* Anonymous Search Counter */}
            {!isAuthenticated && remainingSearches !== Infinity && (
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {remainingSearches} free searches left
                </span>
                {remainingSearches <= 1 && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => navigate('/auth')}
                    className="h-6 text-xs text-primary"
                  >
                    Sign in for unlimited
                  </Button>
                )}
              </div>
            )}
            
            {/* Search Input */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Find plumber, food, doctor..."
                  className="pl-10 pr-10 h-12 bg-secondary/50 border-0 rounded-xl"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                >
                  <Mic className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
              <Button 
                onClick={handleSearch}
                className="h-12 px-6 rounded-xl"
              >
                Search
              </Button>
            </div>

            {/* GPS Toggle */}
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant={gpsEnabled ? "default" : "outline"}
                size="sm"
                onClick={activateGPS}
                disabled={isLocating}
                className="gap-1.5 h-8 text-xs rounded-full"
              >
                {isLocating ? (
                  <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Navigation className="w-3 h-3" />
                )}
                {gpsEnabled ? 'GPS On' : 'Enable GPS'}
              </Button>
              {gpsEnabled && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Location active
                </span>
              )}
            </div>
          </Card>
        </div>

        {/* Quick Access Grid */}
        <div className="max-w-2xl mx-auto px-4 mt-6">
          <div className="grid grid-cols-4 gap-3">
            {quickAccessItems.map((item) => (
              <button
                key={item.title}
                onClick={() => navigate(item.route)}
                className="flex flex-col items-center p-3 rounded-2xl bg-card border border-border/50 hover:shadow-md transition-all native-touch"
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-2 shadow-sm`}>
                  <item.icon className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xs font-medium text-foreground">{item.title}</span>
                <span className="text-[10px] text-muted-foreground">{item.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Features List */}
        <div className="max-w-2xl mx-auto px-4 mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">AI-Powered Features</h2>
          <div className="space-y-2">
            {features.map((feature) => (
              <Card
                key={feature.title}
                onClick={() => navigate(feature.route)}
                className="p-3 flex items-center gap-3 cursor-pointer hover:bg-accent/50 transition-colors native-touch"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-sm text-foreground">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Trending Searches */}
        <div className="max-w-2xl mx-auto px-4 mt-6">
          <div className="flex items-center gap-2 mb-3 px-1">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-muted-foreground">Trending Searches</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingSearches.map((query) => (
              <Button
                key={query}
                variant="outline"
                size="sm"
                onClick={() => handleQuickSearch(query)}
                className="h-8 text-xs rounded-full border-border/50 hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {query}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats Banner */}
        <div className="max-w-2xl mx-auto px-4 mt-6">
          <Card className="p-4 bg-gradient-to-r from-primary/5 to-accent/50 border-primary/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Secure & Private</p>
                  <p className="text-xs text-muted-foreground">Your searches stay with you</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">AI</p>
                <p className="text-xs text-muted-foreground">Powered</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Footer */}
        <div className="max-w-2xl mx-auto px-4 mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by <span className="font-semibold text-primary">CHATR</span> • Multi-source AI Search
          </p>
        </div>
      </div>
    </>
  );
};

export default Home;
