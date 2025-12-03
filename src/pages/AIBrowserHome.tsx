import { useState, useEffect, useCallback } from 'react';
import { 
  Search, Mic, Sparkles, ExternalLink, TrendingUp, Heart, Briefcase, 
  ShoppingBag, MapPin, Utensils, Calendar, ArrowRight, Wallet, 
  Zap, Globe, Bot, Phone, Star, Clock, IndianRupee, CheckCircle,
  Navigation, Building2, Stethoscope, Tag, ChevronRight, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useVoiceAI } from '@/hooks/useVoiceAI';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserLocation } from '@/hooks/useUserLocation';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface LocalService {
  id: string;
  type: 'job' | 'healthcare' | 'food' | 'deal';
  title: string;
  subtitle: string;
  description?: string;
  price?: string;
  rating?: number;
  distance?: string;
  action: string;
  actionRoute: string;
  phone?: string;
  address?: string;
  image?: string;
  tags?: string[];
  urgent?: boolean;
  discount?: string;
}

const AIBrowserHome = () => {
  const navigate = useNavigate();
  const { location, city, requestLocation } = useUserLocation();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [localServices, setLocalServices] = useState<LocalService[]>([]);
  const [aiAnswer, setAiAnswer] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [showActionModal, setShowActionModal] = useState<LocalService | null>(null);
  const { isListening, startListening, transcript } = useVoiceAI();

  const quickActions = [
    { icon: Heart, label: 'Find Doctor', query: 'doctors near me', color: 'from-rose-500 to-pink-600', route: '/local-healthcare' },
    { icon: Briefcase, label: 'Get Jobs', query: 'jobs hiring now', color: 'from-blue-500 to-indigo-600', route: '/local-jobs' },
    { icon: Utensils, label: 'Order Food', query: 'restaurants nearby', color: 'from-orange-500 to-amber-600', route: '/food-ordering' },
    { icon: ShoppingBag, label: 'Best Deals', query: 'deals and offers', color: 'from-emerald-500 to-teal-600', route: '/local-deals' },
  ];

  const trendingSearches = [
    'AC repair near me',
    'Best dentist in ' + (city || 'Delhi'),
    'Part-time jobs for students',
    'Restaurant offers today',
    'Emergency plumber',
    'Electrician near me',
  ];

  const filters = [
    { id: 'all', label: 'All', icon: Globe },
    { id: 'healthcare', label: 'Healthcare', icon: Heart },
    { id: 'job', label: 'Jobs', icon: Briefcase },
    { id: 'food', label: 'Food', icon: Utensils },
    { id: 'deal', label: 'Deals', icon: Tag },
  ];

  useEffect(() => {
    if (transcript) {
      setQuery(transcript);
      handleSearch(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    fetchWalletBalance();
  }, []);

  const fetchWalletBalance = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('user_points').select('balance').eq('user_id', user.id).single();
      if (data) setWalletBalance(data.balance || 0);
    }
  };

  const searchLocalServices = useCallback(async (searchQuery: string): Promise<LocalService[]> => {
    const lowerQuery = searchQuery.toLowerCase();
    const services: LocalService[] = [];

    try {
      // Search Healthcare
      if (lowerQuery.includes('doctor') || lowerQuery.includes('health') || lowerQuery.includes('clinic') || 
          lowerQuery.includes('hospital') || lowerQuery.includes('dentist') || lowerQuery.includes('medical')) {
        const { data: healthcare } = await supabase
          .from('chatr_healthcare')
          .select('*')
          .limit(5);
        
        if (healthcare) {
          healthcare.forEach((h: any) => {
            services.push({
              id: h.id,
              type: 'healthcare',
              title: h.provider_name || h.name,
              subtitle: h.specialty || 'General Physician',
              description: h.description,
              price: h.consultation_fee ? `₹${h.consultation_fee}` : '₹300',
              rating: h.rating || 4.5,
              distance: '2.3 km',
              action: 'Book Now',
              actionRoute: '/local-healthcare',
              phone: h.phone,
              address: h.address || city,
              tags: [h.specialty || 'Doctor', 'Verified'],
              urgent: h.available_now,
            });
          });
        }
      }

      // Search Jobs
      if (lowerQuery.includes('job') || lowerQuery.includes('work') || lowerQuery.includes('career') || 
          lowerQuery.includes('hiring') || lowerQuery.includes('vacancy') || lowerQuery.includes('opening')) {
        const { data: jobs } = await supabase
          .from('chatr_jobs')
          .select('*')
          .limit(5);
        
        if (jobs) {
          jobs.forEach((j: any) => {
            services.push({
              id: j.id,
              type: 'job',
              title: j.title || j.job_title,
              subtitle: j.company_name || j.company,
              description: j.description,
              price: j.salary_range || j.salary || '₹15,000 - ₹25,000/month',
              rating: 4.2,
              distance: j.location || city,
              action: 'Apply Now',
              actionRoute: '/local-jobs',
              address: j.location || city,
              tags: [j.job_type || 'Full-time', j.experience_level || 'Entry Level'],
              urgent: j.urgent_hiring,
            });
          });
        }
      }

      // Search Food/Restaurants
      if (lowerQuery.includes('food') || lowerQuery.includes('restaurant') || lowerQuery.includes('eat') || 
          lowerQuery.includes('order') || lowerQuery.includes('delivery') || lowerQuery.includes('biryani') ||
          lowerQuery.includes('pizza') || lowerQuery.includes('burger')) {
        const { data: restaurants } = await supabase
          .from('chatr_restaurants')
          .select('*')
          .limit(5);
        
        if (restaurants) {
          restaurants.forEach((r: any) => {
            services.push({
              id: r.id,
              type: 'food',
              title: r.name || r.restaurant_name,
              subtitle: Array.isArray(r.cuisine_type) ? r.cuisine_type.join(', ') : (r.cuisine || 'Multi-cuisine'),
              description: r.description,
              price: r.price_range || '₹₹',
              rating: r.rating || 4.3,
              distance: '1.5 km',
              action: 'Order Now',
              actionRoute: '/food-ordering',
              phone: r.phone,
              address: r.address || city,
              image: r.image_url,
              tags: ['Free Delivery', '30 min'],
            });
          });
        }
      }

      // Search Deals
      if (lowerQuery.includes('deal') || lowerQuery.includes('offer') || lowerQuery.includes('discount') || 
          lowerQuery.includes('sale') || lowerQuery.includes('coupon') || lowerQuery.includes('cashback')) {
        const { data: deals } = await supabase
          .from('chatr_deals')
          .select('*')
          .limit(5);
        
        if (deals) {
          deals.forEach((d: any) => {
            services.push({
              id: d.id,
              type: 'deal',
              title: d.title || d.deal_title,
              subtitle: d.business_name || d.merchant,
              description: d.description,
              price: d.original_price ? `₹${d.original_price}` : '',
              discount: d.discount_percentage ? `${d.discount_percentage}% OFF` : (d.discount || '20% OFF'),
              rating: 4.6,
              action: 'Get Deal',
              actionRoute: '/local-deals',
              tags: [d.category || 'Offer', d.coupon_code || 'AUTO'],
              urgent: d.expires_soon,
            });
          });
        }
      }

      // If no specific match, search all categories
      if (services.length === 0) {
        const [healthRes, jobsRes, foodRes, dealsRes] = await Promise.all([
          supabase.from('chatr_healthcare').select('*').limit(2),
          supabase.from('chatr_jobs').select('*').limit(2),
          supabase.from('chatr_restaurants').select('*').limit(2),
          supabase.from('chatr_deals').select('*').limit(2),
        ]);

        if (healthRes.data) {
          healthRes.data.forEach((h: any) => {
            services.push({
              id: h.id, type: 'healthcare', title: h.provider_name || h.name,
              subtitle: h.specialty || 'Doctor', price: `₹${h.consultation_fee || 300}`,
              rating: h.rating || 4.5, action: 'Book Now', actionRoute: '/local-healthcare',
              tags: ['Healthcare']
            });
          });
        }
        if (jobsRes.data) {
          jobsRes.data.forEach((j: any) => {
            services.push({
              id: j.id, type: 'job', title: j.title || j.job_title,
              subtitle: j.company_name || j.company, price: j.salary_range || '₹15K-25K',
              action: 'Apply Now', actionRoute: '/local-jobs', tags: ['Job']
            });
          });
        }
        if (foodRes.data) {
          foodRes.data.forEach((r: any) => {
            services.push({
              id: r.id, type: 'food', title: r.name || r.restaurant_name,
              subtitle: Array.isArray(r.cuisine_type) ? r.cuisine_type[0] : 'Restaurant',
              price: r.price_range || '₹₹', rating: r.rating || 4.3,
              action: 'Order Now', actionRoute: '/food-ordering', tags: ['Food']
            });
          });
        }
        if (dealsRes.data) {
          dealsRes.data.forEach((d: any) => {
            services.push({
              id: d.id, type: 'deal', title: d.title || d.deal_title,
              subtitle: d.business_name || 'Local Business',
              discount: `${d.discount_percentage || 20}% OFF`,
              action: 'Get Deal', actionRoute: '/local-deals', tags: ['Deal']
            });
          });
        }
      }
    } catch (error) {
      console.error('Local search error:', error);
    }

    return services;
  }, [city]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setHasSearched(true);
    setResults([]);
    setAiAnswer('');
    setActiveFilter('all');

    try {
      // Parallel fetch: local services + web search
      const [localData, webData] = await Promise.all([
        searchLocalServices(searchQuery),
        supabase.functions.invoke('ai-browser-search', {
          body: { query: searchQuery, city: city || 'India', location }
        })
      ]);

      setLocalServices(localData);
      
      if (webData.data) {
        setAiAnswer(webData.data.answer || '');
        setResults(webData.data.results || []);
      }
    } catch (error) {
      console.error('Search error:', error);
      // Still show local results even if web search fails
      const localData = await searchLocalServices(searchQuery);
      setLocalServices(localData);
    } finally {
      setSearching(false);
    }
  };

  const handleVoiceSearch = async () => {
    try { 
      await startListening(); 
    } catch { 
      toast.error('Voice search not available'); 
    }
  };

  const handleAction = (service: LocalService) => {
    setShowActionModal(service);
  };

  const completeAction = (service: LocalService, actionType: 'navigate' | 'call' | 'book') => {
    setShowActionModal(null);
    
    if (actionType === 'call' && service.phone) {
      window.location.href = `tel:${service.phone}`;
      toast.success('Calling...');
    } else if (actionType === 'book') {
      toast.success(`Booking ${service.title}...`);
      navigate(service.actionRoute);
    } else {
      navigate(service.actionRoute);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, any> = { 
      healthcare: Stethoscope, 
      job: Building2, 
      food: Utensils, 
      deal: Tag 
    };
    return icons[type] || Globe;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = { 
      healthcare: 'from-rose-500 to-pink-600', 
      job: 'from-blue-500 to-indigo-600', 
      food: 'from-orange-500 to-amber-600', 
      deal: 'from-emerald-500 to-teal-600' 
    };
    return colors[type] || 'from-primary to-primary/80';
  };

  const filteredServices = activeFilter === 'all' 
    ? localServices 
    : localServices.filter(s => s.type === activeFilter);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <AnimatePresence mode="wait">
        {!hasSearched ? (
          // HOME VIEW
          <motion.div 
            key="home" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen px-4 pb-20"
          >
            <div className="w-full max-w-2xl">
              {/* Logo & Context */}
              <div className="text-center mb-8">
                <motion.h1 
                  className="text-5xl md:text-6xl font-bold mb-3"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Chatr</span>
                  <span className="text-foreground"> AI</span>
                </motion.h1>
                <p className="text-muted-foreground text-sm mb-2">Search • Book • Order • Apply — All in One</p>
                <div className="flex items-center justify-center gap-3 text-xs">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs gap-1"
                    onClick={requestLocation}
                  >
                    <MapPin className="h-3 w-3 text-primary" />
                    <span className="text-muted-foreground">{city || 'Set Location'}</span>
                  </Button>
                  <span className="text-muted-foreground">•</span>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Wallet className="h-3 w-3 text-primary" />
                    <span>{walletBalance} Coins</span>
                  </div>
                </div>
              </div>

              {/* Search Bar */}
              <motion.div 
                className="relative mb-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                  placeholder="Find doctors, jobs, food, deals near you..."
                  className="pl-12 pr-16 h-14 rounded-full border-2 border-primary/20 focus:border-primary text-base shadow-lg shadow-primary/5"
                  autoFocus
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={handleVoiceSearch} 
                  className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 ${isListening ? 'bg-destructive text-destructive-foreground animate-pulse' : 'hover:bg-primary/10'}`}
                >
                  <Mic className="h-5 w-5" />
                </Button>
              </motion.div>

              {/* Quick Actions */}
              <motion.div 
                className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {quickActions.map((action, index) => (
                  <motion.div
                    key={action.label}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Card 
                      className={`p-4 cursor-pointer bg-gradient-to-br ${action.color} text-white border-0 shadow-lg`} 
                      onClick={() => { setQuery(action.query); handleSearch(action.query); }}
                    >
                      <action.icon className="h-6 w-6 mb-2" />
                      <p className="font-semibold text-sm">{action.label}</p>
                      <p className="text-xs opacity-80">in {city || 'your area'}</p>
                    </Card>
                  </motion.div>
                ))}
              </motion.div>

              {/* USP Banner */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="p-4 bg-gradient-to-r from-primary/10 via-purple-500/10 to-pink-500/10 border-primary/20 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Not just answers — Complete Actions!</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Book doctors instantly • Apply for jobs • Order food • Get deals — all from one search
                      </p>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Trending */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Card className="p-4 bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Trending in {city || 'India'}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trendingSearches.map((s, i) => (
                      <Badge 
                        key={i} 
                        variant="secondary" 
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors" 
                        onClick={() => { setQuery(s); handleSearch(s); }}
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          // RESULTS VIEW
          <motion.div 
            key="results" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="min-h-screen"
          >
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b">
              <div className="max-w-4xl mx-auto px-4 py-3">
                <div className="flex items-center gap-3">
                  <h1 
                    className="text-xl font-bold cursor-pointer flex-shrink-0" 
                    onClick={() => { setHasSearched(false); setQuery(''); setLocalServices([]); }}
                  >
                    <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Chatr</span>
                    <span className="text-foreground"> AI</span>
                  </h1>
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      value={query} 
                      onChange={(e) => setQuery(e.target.value)} 
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)} 
                      className="pl-10 h-10 rounded-full" 
                    />
                  </div>
                  <Button size="icon" variant="ghost" onClick={handleVoiceSearch} className="rounded-full">
                    <Mic className={`h-4 w-4 ${isListening ? 'text-destructive' : ''}`} />
                  </Button>
                </div>

                {/* Filter Tabs */}
                {localServices.length > 0 && (
                  <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                    {filters.map((filter) => (
                      <Button
                        key={filter.id}
                        size="sm"
                        variant={activeFilter === filter.id ? 'default' : 'outline'}
                        className="rounded-full h-8 text-xs gap-1 flex-shrink-0"
                        onClick={() => setActiveFilter(filter.id)}
                      >
                        <filter.icon className="h-3 w-3" />
                        {filter.label}
                        {filter.id !== 'all' && (
                          <span className="ml-1 opacity-70">
                            ({localServices.filter(s => s.type === filter.id).length})
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Results Content */}
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 pb-24">
              {/* Loading State */}
              {searching && (
                <Card className="p-6 bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary animate-spin" />
                    </div>
                    <div>
                      <p className="font-semibold text-primary">Searching across Chatr...</p>
                      <p className="text-xs text-muted-foreground">Finding doctors, jobs, restaurants & deals near {city || 'you'}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-primary/10 rounded animate-pulse" />
                    <div className="h-4 bg-primary/10 rounded animate-pulse w-5/6" />
                    <div className="h-4 bg-primary/10 rounded animate-pulse w-4/6" />
                  </div>
                </Card>
              )}

              {/* AI Answer */}
              {aiAnswer && !searching && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="p-6 bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/10 border-primary/20">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <span className="font-semibold text-primary">AI Overview</span>
                      <Badge variant="secondary" className="text-xs">Powered by Chatr AI</Badge>
                    </div>
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">{aiAnswer}</p>
                  </Card>
                </motion.div>
              )}

              {/* Local Services - Action Cards */}
              {filteredServices.length > 0 && !searching && (
                <motion.div 
                  className="space-y-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      Take Action Now
                      <Badge variant="outline" className="text-xs">{filteredServices.length} found</Badge>
                    </h3>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                      View All <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>

                  <div className="grid gap-3">
                    {filteredServices.map((service, index) => {
                      const TypeIcon = getTypeIcon(service.type);
                      return (
                        <motion.div
                          key={service.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <Card className="p-4 hover:shadow-lg transition-all border-l-4" style={{ borderLeftColor: service.type === 'healthcare' ? '#f43f5e' : service.type === 'job' ? '#3b82f6' : service.type === 'food' ? '#f97316' : '#10b981' }}>
                            <div className="flex items-start gap-4">
                              {/* Icon */}
                              <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${getTypeColor(service.type)} flex items-center justify-center flex-shrink-0`}>
                                <TypeIcon className="h-6 w-6 text-white" />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge variant="secondary" className="text-xs capitalize">{service.type}</Badge>
                                      {service.urgent && <Badge className="text-xs bg-destructive">Urgent</Badge>}
                                      {service.discount && <Badge className="text-xs bg-emerald-500">{service.discount}</Badge>}
                                    </div>
                                    <h4 className="font-semibold text-base line-clamp-1">{service.title}</h4>
                                    <p className="text-sm text-muted-foreground line-clamp-1">{service.subtitle}</p>
                                  </div>
                                </div>

                                {/* Meta Info */}
                                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                                  {service.rating && (
                                    <span className="flex items-center gap-1">
                                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                      {service.rating}
                                    </span>
                                  )}
                                  {service.price && (
                                    <span className="flex items-center gap-1 text-primary font-medium">
                                      <IndianRupee className="h-3 w-3" />
                                      {service.price.replace('₹', '')}
                                    </span>
                                  )}
                                  {service.distance && (
                                    <span className="flex items-center gap-1">
                                      <Navigation className="h-3 w-3" />
                                      {service.distance}
                                    </span>
                                  )}
                                  {service.address && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {service.address}
                                    </span>
                                  )}
                                </div>

                                {/* Tags */}
                                {service.tags && service.tags.length > 0 && (
                                  <div className="flex gap-1 mt-2">
                                    {service.tags.map((tag, i) => (
                                      <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Action Button */}
                              <Button 
                                size="sm" 
                                className={`bg-gradient-to-r ${getTypeColor(service.type)} text-white flex-shrink-0`}
                                onClick={() => handleAction(service)}
                              >
                                {service.action}
                                <ArrowRight className="h-4 w-4 ml-1" />
                              </Button>
                            </div>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Web Results */}
              {results.length > 0 && !searching && (
                <motion.div 
                  className="space-y-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-muted-foreground">Web Results</h3>
                  </div>
                  <div className="space-y-4">
                    {results.map((result, i) => (
                      <a 
                        key={i} 
                        href={result.url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="block group"
                      >
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                          {(() => { try { return new URL(result.url).hostname; } catch { return result.url; } })()}
                          <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </p>
                        <h3 className="text-lg text-primary group-hover:underline font-medium">{result.title}</h3>
                        <p className="text-sm text-foreground/70 line-clamp-2 mt-1">{result.snippet}</p>
                      </a>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* No Results */}
              {!searching && localServices.length === 0 && results.length === 0 && !aiAnswer && (
                <Card className="p-8 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <h3 className="font-semibold mb-2">No results found</h3>
                  <p className="text-sm text-muted-foreground mb-4">Try searching for doctors, jobs, food, or deals</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {['Doctors near me', 'Jobs hiring', 'Food delivery'].map((s) => (
                      <Badge 
                        key={s}
                        variant="secondary" 
                        className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                        onClick={() => { setQuery(s); handleSearch(s); }}
                      >
                        {s}
                      </Badge>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Modal */}
      <AnimatePresence>
        {showActionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center"
            onClick={() => setShowActionModal(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-full max-w-lg bg-background rounded-t-3xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-6" />
              
              <div className="flex items-center gap-4 mb-6">
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${getTypeColor(showActionModal.type)} flex items-center justify-center`}>
                  {(() => { const Icon = getTypeIcon(showActionModal.type); return <Icon className="h-7 w-7 text-white" />; })()}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{showActionModal.title}</h3>
                  <p className="text-muted-foreground">{showActionModal.subtitle}</p>
                </div>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="ml-auto"
                  onClick={() => setShowActionModal(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {showActionModal.description && (
                <p className="text-sm text-muted-foreground mb-4">{showActionModal.description}</p>
              )}

              <div className="flex flex-wrap gap-3 mb-6 text-sm">
                {showActionModal.price && (
                  <div className="flex items-center gap-1 bg-muted px-3 py-1.5 rounded-full">
                    <IndianRupee className="h-4 w-4" />
                    <span className="font-medium">{showActionModal.price}</span>
                  </div>
                )}
                {showActionModal.rating && (
                  <div className="flex items-center gap-1 bg-muted px-3 py-1.5 rounded-full">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <span>{showActionModal.rating}</span>
                  </div>
                )}
                {showActionModal.discount && (
                  <div className="flex items-center gap-1 bg-emerald-500/20 text-emerald-600 px-3 py-1.5 rounded-full">
                    <Tag className="h-4 w-4" />
                    <span className="font-medium">{showActionModal.discount}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Button 
                  className={`w-full h-12 text-base bg-gradient-to-r ${getTypeColor(showActionModal.type)} text-white`}
                  onClick={() => completeAction(showActionModal, 'book')}
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  {showActionModal.action}
                </Button>

                {showActionModal.phone && (
                  <Button 
                    variant="outline" 
                    className="w-full h-12 text-base"
                    onClick={() => completeAction(showActionModal, 'call')}
                  >
                    <Phone className="h-5 w-5 mr-2" />
                    Call Now
                  </Button>
                )}

                <Button 
                  variant="ghost" 
                  className="w-full"
                  onClick={() => completeAction(showActionModal, 'navigate')}
                >
                  View Details
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIBrowserHome;
