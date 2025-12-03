import { useState, useEffect } from 'react';
import { 
  Search, Mic, Sparkles, ExternalLink, TrendingUp, Heart, Briefcase, 
  ShoppingBag, MapPin, Utensils, Calendar, ArrowRight, Wallet, 
  Zap, Globe, Bot
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

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface LocalResult {
  id: string;
  type: 'job' | 'healthcare' | 'food' | 'deal';
  title: string;
  subtitle: string;
  price?: string;
  action: string;
  actionRoute: string;
}

const AIBrowserHome = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [localResults, setLocalResults] = useState<LocalResult[]>([]);
  const [aiAnswer, setAiAnswer] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [city, setCity] = useState<string>('');
  const { isListening, startListening, transcript } = useVoiceAI();

  const quickActions = [
    { icon: Heart, label: 'Find Doctor', query: 'doctors near me', color: 'from-rose-500 to-pink-600', route: '/local-healthcare' },
    { icon: Briefcase, label: 'Get Jobs', query: 'job openings', color: 'from-blue-500 to-indigo-600', route: '/local-jobs' },
    { icon: Utensils, label: 'Order Food', query: 'food delivery', color: 'from-orange-500 to-amber-600', route: '/food-ordering' },
    { icon: ShoppingBag, label: 'Best Deals', query: 'deals today', color: 'from-emerald-500 to-teal-600', route: '/local-deals' },
  ];

  const trendingSearches = [
    'AC repair near me',
    'Best dentist nearby',
    'Part-time jobs',
    'Restaurant offers',
    'Plumber emergency',
  ];

  useEffect(() => {
    if (transcript) {
      setQuery(transcript);
      handleSearch(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    fetchWalletAndLocation();
  }, []);

  const fetchWalletAndLocation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from('user_points').select('balance').eq('user_id', user.id).single();
      if (data) setWalletBalance(data.balance);
    }
    // Simple city detection
    try {
      const res = await fetch('http://ip-api.com/json/');
      const data = await res.json();
      if (data.city) setCity(data.city);
    } catch { setCity('India'); }
  };

  const getLocalResults = (searchQuery: string): LocalResult[] => {
    const lowerQuery = searchQuery.toLowerCase();
    const results: LocalResult[] = [];
    
    if (lowerQuery.includes('doctor') || lowerQuery.includes('health') || lowerQuery.includes('clinic')) {
      results.push({ id: '1', type: 'healthcare', title: 'Find Doctors Near You', subtitle: 'Book appointments instantly', price: 'From ₹200', action: 'Book Now', actionRoute: '/local-healthcare' });
    }
    if (lowerQuery.includes('job') || lowerQuery.includes('work') || lowerQuery.includes('career')) {
      results.push({ id: '2', type: 'job', title: 'Job Openings', subtitle: '100+ positions available', price: 'All Salaries', action: 'Apply Now', actionRoute: '/local-jobs' });
    }
    if (lowerQuery.includes('food') || lowerQuery.includes('restaurant') || lowerQuery.includes('eat')) {
      results.push({ id: '3', type: 'food', title: 'Order Food Delivery', subtitle: 'From top restaurants', price: '₹₹', action: 'Order Now', actionRoute: '/food-ordering' });
    }
    if (lowerQuery.includes('deal') || lowerQuery.includes('offer') || lowerQuery.includes('discount')) {
      results.push({ id: '4', type: 'deal', title: 'Best Deals Today', subtitle: 'Save up to 50%', price: 'Up to 50% OFF', action: 'Get Deal', actionRoute: '/local-deals' });
    }
    return results;
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setHasSearched(true);
    setResults([]);
    setAiAnswer('');
    
    // Get local action results
    setLocalResults(getLocalResults(searchQuery));

    try {
      const { data, error } = await supabase.functions.invoke('ai-browser-search', {
        body: { query: searchQuery, city }
      });
      if (error) throw error;
      setAiAnswer(data?.answer || '');
      setResults(data?.results || []);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleVoiceSearch = async () => {
    try { await startListening(); } catch { toast.error('Voice search not available'); }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = { healthcare: 'from-rose-500 to-pink-600', job: 'from-blue-500 to-indigo-600', food: 'from-orange-500 to-amber-600', deal: 'from-emerald-500 to-teal-600' };
    return colors[type] || 'from-primary to-primary/80';
  };

  const getActionIcon = (type: string) => {
    const icons: Record<string, any> = { healthcare: Calendar, job: ArrowRight, food: Utensils, deal: Zap };
    return icons[type] || ArrowRight;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <AnimatePresence mode="wait">
        {!hasSearched ? (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center min-h-screen px-4 pb-20">
            <div className="w-full max-w-2xl">
              <div className="text-center mb-8">
                <h1 className="text-5xl md:text-6xl font-bold mb-3">
                  <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Chatr</span>
                  <span className="text-foreground"> AI</span>
                </h1>
                <p className="text-muted-foreground text-sm mb-1">Search • Book • Order • Apply</p>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /><span>{city || 'India'}</span>
                  <span className="mx-1">•</span>
                  <Wallet className="h-3 w-3" /><span>{walletBalance} Coins</span>
                </div>
              </div>

              <div className="relative mb-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                  placeholder="Search anything... doctors, jobs, food, services"
                  className="pl-12 pr-16 h-14 rounded-full border-2 border-primary/20 text-base shadow-lg"
                  autoFocus
                />
                <Button size="icon" variant="ghost" onClick={handleVoiceSearch} className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full ${isListening ? 'bg-destructive animate-pulse' : ''}`}>
                  <Mic className="h-5 w-5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                {quickActions.map((action) => (
                  <Card key={action.label} className={`p-4 cursor-pointer hover:scale-105 transition-all bg-gradient-to-br ${action.color} text-white border-0`} onClick={() => { setQuery(action.query); handleSearch(action.query); }}>
                    <action.icon className="h-6 w-6 mb-2" />
                    <p className="font-semibold text-sm">{action.label}</p>
                  </Card>
                ))}
              </div>

              <Card className="p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 border-primary/20 mb-6">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-semibold text-sm">Not just answers — complete actions!</p>
                    <p className="text-xs text-muted-foreground">Book doctors, apply for jobs, order food from one search</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Trending</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trendingSearches.map((s, i) => (
                    <Badge key={i} variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground" onClick={() => { setQuery(s); handleSearch(s); }}>{s}</Badge>
                  ))}
                </div>
              </Card>
            </div>
          </motion.div>
        ) : (
          <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-screen">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-lg border-b">
              <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
                <h1 className="text-xl font-bold cursor-pointer" onClick={() => { setHasSearched(false); setQuery(''); }}>
                  <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Chatr</span> AI
                </h1>
                <div className="flex-1 relative max-w-2xl">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)} className="pl-10 h-10 rounded-full" />
                </div>
              </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 pb-24">
              {searching && (
                <Card className="p-6 bg-gradient-to-br from-primary/10 to-purple-500/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="h-5 w-5 text-primary animate-spin" />
                    <span className="font-semibold text-primary">Searching...</span>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-primary/10 rounded animate-pulse" />
                    <div className="h-4 bg-primary/10 rounded animate-pulse w-5/6" />
                  </div>
                </Card>
              )}

              {aiAnswer && !searching && (
                <Card className="p-6 bg-gradient-to-br from-primary/10 to-purple-500/10">
                  <div className="flex items-center gap-2 mb-4">
                    <Bot className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-primary">AI Overview</span>
                  </div>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">{aiAnswer}</p>
                </Card>
              )}

              {localResults.length > 0 && !searching && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />Take Action Now
                  </h3>
                  {localResults.map((result) => {
                    const ActionIcon = getActionIcon(result.type);
                    return (
                      <Card key={result.id} className="p-4 hover:shadow-lg transition-all">
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <Badge variant="secondary" className="text-xs capitalize mb-1">{result.type}</Badge>
                            <h4 className="font-semibold">{result.title}</h4>
                            <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                            {result.price && <p className="text-sm font-medium text-primary mt-1">{result.price}</p>}
                          </div>
                          <Button size="sm" className={`bg-gradient-to-r ${getTypeColor(result.type)} text-white`} onClick={() => navigate(result.actionRoute)}>
                            <ActionIcon className="h-4 w-4 mr-1" />{result.action}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}

              {results.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-muted-foreground">Web Results</h3>
                  </div>
                  {results.map((result, i) => (
                    <a key={i} href={result.url} target="_blank" rel="noopener noreferrer" className="block group">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">{new URL(result.url).hostname}<ExternalLink className="h-3 w-3" /></p>
                      <h3 className="text-lg text-primary group-hover:underline">{result.title}</h3>
                      <p className="text-sm text-foreground/70 line-clamp-2">{result.snippet}</p>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIBrowserHome;
