import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, Mic, Navigation, Heart, Briefcase, UtensilsCrossed, Tag, 
  Sparkles, Globe, Bot, Shield, MapPin, TrendingUp, Camera, Bell,
  Users, MessageCircle, Wallet, ChevronRight, ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { getCurrentLocation } from '@/utils/locationService';
import { useAnonymousSearchLimit } from '@/hooks/useAnonymousSearchLimit';
import { LoginPromptModal } from '@/components/LoginPromptModal';
import { SEOHead } from '@/components/SEOHead';
import chatrLogo from '@/assets/chatr-logo.png';

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
    { icon: Briefcase, title: 'Jobs', desc: 'Find work', route: '/jobs', gradient: 'from-emerald-500 to-teal-600' },
    { icon: UtensilsCrossed, title: 'Food', desc: 'Order now', route: '/food-ordering', gradient: 'from-orange-500 to-amber-600' },
    { icon: Tag, title: 'Deals', desc: 'Save money', route: '/local-deals', gradient: 'from-violet-500 to-purple-600' },
  ];

  const features = [
    { icon: Globe, title: 'AI Browser', desc: 'Smart web search with AI summaries', route: '/ai-browser-home' },
    { icon: Bot, title: 'AI Assistant', desc: 'Get instant help for anything', route: '/ai-assistant' },
    { icon: Camera, title: 'Visual Search', desc: 'Search with images & photos', route: '/search' },
    { icon: Bell, title: 'Smart Alerts', desc: 'Stay updated with notifications', route: '/notifications' },
  ];

  const moreServices = [
    { icon: Users, title: 'Community', desc: 'Connect with people', route: '/community' },
    { icon: MessageCircle, title: 'Messages', desc: 'Chat with friends', route: '/chat' },
    { icon: Wallet, title: 'Wallet', desc: 'Manage payments', route: '/wallet' },
    { icon: Shield, title: 'Care Access', desc: 'Health services', route: '/care' },
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
      
      <div className="min-h-screen bg-background">
        {/* Hero Section with Logo */}
        <header className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/10" />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Navigation */}
            <nav className="flex items-center justify-between py-4">
              <img 
                src={chatrLogo} 
                alt="Chatr" 
                className="h-14 sm:h-16 object-contain" 
                width={64}
                height={64}
                loading="eager"
              />
              <div className="flex items-center gap-3">
                {!isAuthenticated && (
                  <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>
                    Sign In
                  </Button>
                )}
                <Button size="sm" onClick={() => navigate('/')}>
                  Explore
                </Button>
              </div>
            </nav>

            {/* Large Chat Icon */}
            <div 
              onClick={() => navigate('/chat')}
              className="flex flex-col items-center justify-center py-8 cursor-pointer group"
            >
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl group-hover:scale-105 transition-transform">
                <MessageCircle className="w-16 h-16 sm:w-20 sm:h-20 text-white" strokeWidth={1.5} />
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mt-6">Chat</h2>
            </div>

            {/* Hero Content */}
            <div className="py-12 sm:py-16 lg:py-20 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                AI-Powered Universal Search
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
                Find Anything.<br className="sm:hidden" /> Instantly.
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-8">
                Search jobs, healthcare, food, deals, and more — all powered by AI.
              </p>

              {/* Search Card */}
              <Card className="max-w-2xl mx-auto p-4 sm:p-6 shadow-elevated border-border/50">
                {!isAuthenticated && remainingSearches !== Infinity && (
                  <div className="mb-4 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {remainingSearches} free searches left
                    </span>
                    {remainingSearches <= 2 && (
                      <Button 
                        size="sm" 
                        variant="link"
                        onClick={() => navigate('/auth')}
                        className="text-primary p-0 h-auto"
                      >
                        Sign in for unlimited <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2 sm:gap-3">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Search jobs, doctors, food, services..."
                      className="pl-12 pr-12 h-12 sm:h-14 text-base bg-secondary/30 border-border/50 rounded-xl focus:ring-2 focus:ring-primary/20"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-primary/10"
                    >
                      <Mic className="w-5 h-5 text-muted-foreground" />
                    </Button>
                  </div>
                  <Button 
                    onClick={handleSearch}
                    size="lg"
                    className="h-12 sm:h-14 px-6 sm:px-8 rounded-xl font-semibold"
                  >
                    <Search className="w-4 h-4 sm:hidden" />
                    <span className="hidden sm:inline">Search</span>
                  </Button>
                </div>

                {gpsEnabled && (
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-primary" /> Finding nearby results
                    </span>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </header>

        {/* Quick Access Section */}
        <section className="py-12 bg-secondary/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-foreground mb-6 text-center sm:text-left">
              Quick Access
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {quickAccessItems.map((item) => (
                <Card
                  key={item.title}
                  onClick={() => navigate(item.route)}
                  className="p-6 cursor-pointer hover:shadow-lg transition-all group border-border/50 hover:border-primary/30"
                >
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-4 shadow-md group-hover:scale-105 transition-transform`}>
                    <item.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground text-lg">{item.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                  <ChevronRight className="w-5 h-5 text-muted-foreground mt-3 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* AI Features Section */}
        <section className="py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">AI-Powered Features</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/chatr-world')} className="text-primary">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  onClick={() => navigate(feature.route)}
                  className="p-5 flex items-center gap-4 cursor-pointer hover:bg-accent/30 transition-colors group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground truncate">{feature.desc}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary shrink-0" />
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* More Services */}
        <section className="py-12 bg-secondary/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-foreground mb-6">More Services</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {moreServices.map((service) => (
                <Card
                  key={service.title}
                  onClick={() => navigate(service.route)}
                  className="p-5 cursor-pointer hover:shadow-md transition-all text-center group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                    <service.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-medium text-foreground text-sm">{service.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{service.desc}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Trending Searches */}
        <section className="py-12">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">Trending Searches</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {trendingSearches.map((query) => (
                <Button
                  key={query}
                  variant="outline"
                  onClick={() => handleQuickSearch(query)}
                  className="rounded-full hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors"
                >
                  {query}
                </Button>
              ))}
            </div>
          </div>
        </section>

        {/* Stats/Trust Section */}
        <section className="py-12 bg-gradient-to-br from-primary/5 to-accent/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="p-6 sm:p-8 border-primary/10">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Secure & Private</h3>
                    <p className="text-muted-foreground">Your searches stay with you. Always.</p>
                  </div>
                </div>
                <div className="flex gap-8 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">AI</p>
                    <p className="text-sm text-muted-foreground">Powered</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">24/7</p>
                    <p className="text-sm text-muted-foreground">Available</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">100+</p>
                    <p className="text-sm text-muted-foreground">Services</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-border/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <img 
                src={chatrLogo} 
                alt="Chatr" 
                className="h-8 object-contain"
                width={32}
                height={32}
                loading="lazy"
              />
              <p className="text-sm text-muted-foreground text-center">
                Say It. Share It. Live It. • Multi-source AI Search
              </p>
              <div className="flex gap-4">
                <Button variant="ghost" size="sm" onClick={() => navigate('/about')}>About</Button>
                <Button variant="ghost" size="sm" onClick={() => navigate('/contact')}>Contact</Button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Home;
