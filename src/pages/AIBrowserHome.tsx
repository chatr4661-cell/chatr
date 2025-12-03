import { useState, useEffect, useRef } from 'react';
import { 
  Search, Mic, Sparkles, ExternalLink, Globe, Bot, 
  Image, Video, Newspaper, BookOpen, Code, MessageSquare,
  ChevronRight, ArrowRight, RefreshCw, Copy, Check, ThumbsUp,
  MapPin, Wallet, TrendingUp, Zap, Link2, Send
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useVoiceAI } from '@/hooks/useVoiceAI';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserLocation } from '@/hooks/useUserLocation';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  category?: string;
  thumbnail?: string;
  imageUrl?: string;
  videoUrl?: string;
  duration?: string;
  views?: string;
}

interface SourceGroup {
  [key: string]: SearchResult[];
}

const AIBrowserHome = () => {
  const navigate = useNavigate();
  const { location, city, requestLocation } = useUserLocation();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [aiAnswer, setAiAnswer] = useState('');
  const [sources, setSources] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [copied, setCopied] = useState(false);
  const [followUpQuery, setFollowUpQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isListening, startListening, transcript } = useVoiceAI();

  const suggestedSearches = [
    'Latest news today',
    'What is artificial intelligence',
    'Best restaurants near me',
    'How to learn programming',
    'Weather forecast',
    'Stock market updates',
  ];

  const quickCategories = [
    { icon: Globe, label: 'Web', tab: 'web' },
    { icon: Image, label: 'Images', tab: 'image' },
    { icon: Video, label: 'Videos', tab: 'video' },
    { icon: Newspaper, label: 'News', tab: 'news' },
    { icon: Code, label: 'Code', tab: 'tech' },
    { icon: BookOpen, label: 'Research', tab: 'research' },
  ];

  useEffect(() => {
    if (transcript) {
      setQuery(transcript);
      handleSearch(transcript);
    }
  }, [transcript]);

  // Group results by category
  const groupedResults: SourceGroup = results.reduce((acc, result) => {
    const category = result.category || 'web';
    if (!acc[category]) acc[category] = [];
    acc[category].push(result);
    return acc;
  }, {} as SourceGroup);

  const filteredResults = activeTab === 'all' 
    ? results 
    : results.filter(r => r.category === activeTab);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    setHasSearched(true);
    setResults([]);
    setAiAnswer('');
    setSources([]);
    setActiveTab('all');

    // Add to search history
    setSearchHistory(prev => [searchQuery, ...prev.filter(q => q !== searchQuery)].slice(0, 10));

    try {
      const { data, error } = await supabase.functions.invoke('ai-browser-search', {
        body: { 
          query: searchQuery, 
          city: city || 'India', 
          location,
          includeAll: true // Request all categories
        }
      });

      if (error) throw error;

      if (data) {
        setAiAnswer(data.answer || '');
        setResults(data.results || []);
        setSources((data.results || []).slice(0, 6)); // Top 6 sources for citations
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
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

  const handleFollowUp = () => {
    if (followUpQuery.trim()) {
      setQuery(followUpQuery);
      handleSearch(followUpQuery);
      setFollowUpQuery('');
    }
  };

  const copyAnswer = () => {
    navigator.clipboard.writeText(aiAnswer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  const getSourceFavicon = (url: string) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    } catch {
      return null;
    }
  };

  const getCategoryCount = (category: string) => {
    return results.filter(r => r.category === category).length;
  };

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence mode="wait">
        {!hasSearched ? (
          // HOME VIEW - Perplexity-style clean search
          <motion.div 
            key="home" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center justify-center min-h-screen px-4 pb-20"
          >
            <div className="w-full max-w-2xl">
              {/* Logo */}
              <div className="text-center mb-10">
                <motion.h1 
                  className="text-5xl md:text-6xl font-bold mb-3"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">Chatr</span>
                  <span className="text-foreground"> AI</span>
                </motion.h1>
                <p className="text-muted-foreground text-lg">Ask anything. Get instant AI-powered answers.</p>
              </div>

              {/* Search Bar */}
              <motion.div 
                className="relative mb-8"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                    placeholder="Ask anything..."
                    className="pl-12 pr-24 h-14 rounded-2xl border-2 border-border/50 focus:border-primary text-base shadow-lg"
                    autoFocus
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={handleVoiceSearch} 
                      className={`rounded-full h-10 w-10 ${isListening ? 'bg-destructive text-destructive-foreground animate-pulse' : ''}`}
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                    <Button
                      size="icon"
                      onClick={() => handleSearch(query)}
                      disabled={!query.trim()}
                      className="rounded-full h-10 w-10 bg-primary"
                    >
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* Category Tabs */}
              <motion.div 
                className="flex justify-center gap-2 mb-8 flex-wrap"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {quickCategories.map((cat) => (
                  <Button
                    key={cat.tab}
                    variant="outline"
                    size="sm"
                    className="rounded-full gap-2"
                    onClick={() => { 
                      setActiveTab(cat.tab);
                      inputRef.current?.focus();
                    }}
                  >
                    <cat.icon className="h-4 w-4" />
                    {cat.label}
                  </Button>
                ))}
              </motion.div>

              {/* Suggested Searches */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
                  <TrendingUp className="h-4 w-4" />
                  <span>Try asking</span>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {suggestedSearches.map((s, i) => (
                    <Badge 
                      key={i} 
                      variant="secondary" 
                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all py-2 px-4 text-sm" 
                      onClick={() => { setQuery(s); handleSearch(s); }}
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              </motion.div>

              {/* Location & Context */}
              <motion.div 
                className="flex items-center justify-center gap-4 mt-8 text-xs text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs gap-1"
                  onClick={requestLocation}
                >
                  <MapPin className="h-3 w-3" />
                  <span>{city || 'Set Location'}</span>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        ) : (
          // RESULTS VIEW - Perplexity-style with AI answer and sources
          <motion.div 
            key="results" 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            className="min-h-screen"
          >
            {/* Sticky Header */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b">
              <div className="max-w-5xl mx-auto px-4 py-3">
                <div className="flex items-center gap-3">
                  <h1 
                    className="text-xl font-bold cursor-pointer flex-shrink-0" 
                    onClick={() => { setHasSearched(false); setQuery(''); setResults([]); setAiAnswer(''); }}
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
                      className="pl-10 pr-10 h-10 rounded-full" 
                    />
                    <Button 
                      size="icon" 
                      variant="ghost"
                      onClick={() => handleSearch(query)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button size="icon" variant="ghost" onClick={handleVoiceSearch} className="rounded-full flex-shrink-0">
                    <Mic className={`h-4 w-4 ${isListening ? 'text-destructive' : ''}`} />
                  </Button>
                </div>

                {/* Source Tabs */}
                <div className="flex gap-1 mt-3 overflow-x-auto pb-1 scrollbar-hide">
                  <Button
                    size="sm"
                    variant={activeTab === 'all' ? 'default' : 'ghost'}
                    className="rounded-full h-8 text-xs"
                    onClick={() => setActiveTab('all')}
                  >
                    All
                  </Button>
                  {quickCategories.map((cat) => {
                    const count = getCategoryCount(cat.tab);
                    if (count === 0 && activeTab !== cat.tab) return null;
                    return (
                      <Button
                        key={cat.tab}
                        size="sm"
                        variant={activeTab === cat.tab ? 'default' : 'ghost'}
                        className="rounded-full h-8 text-xs gap-1"
                        onClick={() => setActiveTab(cat.tab)}
                      >
                        <cat.icon className="h-3 w-3" />
                        {cat.label}
                        {count > 0 && <span className="opacity-70">({count})</span>}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Results Content */}
            <div className="max-w-5xl mx-auto px-4 py-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content - AI Answer */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Loading State */}
                  {searching && (
                    <Card className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <Sparkles className="h-5 w-5 text-primary animate-spin" />
                        </div>
                        <div>
                          <p className="font-semibold">Searching the web...</p>
                          <p className="text-xs text-muted-foreground">Finding the best answers for you</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                        <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
                        <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
                      </div>
                    </Card>
                  )}

                  {/* AI Answer */}
                  {aiAnswer && !searching && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="p-6">
                        {/* Answer Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
                              <Bot className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-semibold">Answer</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyAnswer}>
                              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSearch(query)}>
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Answer Content */}
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <p className="text-foreground leading-relaxed whitespace-pre-wrap">{aiAnswer}</p>
                        </div>

                        {/* Sources Citations */}
                        {sources.length > 0 && (
                          <div className="mt-6 pt-4 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
                              <Link2 className="h-3 w-3" />
                              Sources
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {sources.slice(0, 6).map((source, i) => (
                                <a
                                  key={i}
                                  href={source.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-xs hover:bg-muted/80 transition-colors"
                                >
                                  {getSourceFavicon(source.url) && (
                                    <img 
                                      src={getSourceFavicon(source.url)!} 
                                      alt="" 
                                      className="h-4 w-4 rounded"
                                      onError={(e) => (e.currentTarget.style.display = 'none')}
                                    />
                                  )}
                                  <span className="max-w-[150px] truncate">
                                    {(() => { try { return new URL(source.url).hostname.replace('www.', ''); } catch { return 'Source'; } })()}
                                  </span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Follow-up */}
                        <div className="mt-6 pt-4 border-t">
                          <p className="text-xs font-medium text-muted-foreground mb-3 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            Ask a follow-up
                          </p>
                          <div className="flex gap-2">
                            <Input
                              value={followUpQuery}
                              onChange={(e) => setFollowUpQuery(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleFollowUp()}
                              placeholder="Ask a follow-up question..."
                              className="flex-1 h-10 rounded-full"
                            />
                            <Button 
                              size="icon" 
                              onClick={handleFollowUp}
                              disabled={!followUpQuery.trim()}
                              className="rounded-full h-10 w-10"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {/* Web Results */}
                  {filteredResults.length > 0 && !searching && (
                    <motion.div 
                      className="space-y-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        {activeTab === 'all' ? 'Search Results' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Results`}
                        <span className="text-xs">({filteredResults.length})</span>
                      </h3>

                      {/* Image Grid */}
                      {(activeTab === 'image' || activeTab === 'all') && groupedResults.image?.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                          {(activeTab === 'image' ? groupedResults.image : groupedResults.image.slice(0, 6)).map((img, i) => (
                            <a
                              key={i}
                              href={img.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="relative group rounded-lg overflow-hidden aspect-square bg-muted"
                            >
                              <img
                                src={img.imageUrl || img.thumbnail}
                                alt={img.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                <span className="text-white text-xs line-clamp-2">{img.title}</span>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Video Grid */}
                      {(activeTab === 'video' || activeTab === 'all') && groupedResults.video?.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                          {(activeTab === 'video' ? groupedResults.video : groupedResults.video.slice(0, 4)).map((video, i) => (
                            <a
                              key={i}
                              href={video.videoUrl || video.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                            >
                              <div className="relative w-32 h-20 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                                {video.thumbnail && (
                                  <img src={video.thumbnail} alt="" className="w-full h-full object-cover" />
                                )}
                                {video.duration && (
                                  <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                                    {video.duration}
                                  </span>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Video className="h-8 w-8 text-white/80" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm line-clamp-2">{video.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">{video.source}</p>
                                {video.views && <p className="text-xs text-muted-foreground">{video.views} views</p>}
                              </div>
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Web/Text Results */}
                      <div className="space-y-4">
                        {filteredResults
                          .filter(r => activeTab === 'all' ? !['image', 'video'].includes(r.category || '') : r.category !== 'image' && r.category !== 'video')
                          .map((result, i) => (
                          <a 
                            key={i} 
                            href={result.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="block group p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              {getSourceFavicon(result.url) && (
                                <img 
                                  src={getSourceFavicon(result.url)!} 
                                  alt="" 
                                  className="h-4 w-4 rounded"
                                  onError={(e) => (e.currentTarget.style.display = 'none')}
                                />
                              )}
                              <span className="text-xs text-muted-foreground truncate">
                                {(() => { try { return new URL(result.url).hostname; } catch { return result.url; } })()}
                              </span>
                              {result.source && result.source !== 'Google' && (
                                <Badge variant="secondary" className="text-xs">{result.source}</Badge>
                              )}
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                            </div>
                            <h3 className="text-base font-medium text-primary group-hover:underline line-clamp-1">{result.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{result.snippet}</p>
                          </a>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* No Results */}
                  {!searching && results.length === 0 && !aiAnswer && (
                    <Card className="p-8 text-center">
                      <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                      <h3 className="font-semibold mb-2">No results found</h3>
                      <p className="text-sm text-muted-foreground mb-4">Try a different search query</p>
                    </Card>
                  )}
                </div>

                {/* Sidebar - Related & Sources */}
                <div className="space-y-6">
                  {/* Quick Sources */}
                  {sources.length > 0 && !searching && (
                    <Card className="p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                        <BookOpen className="h-4 w-4" />
                        Sources
                      </h4>
                      <div className="space-y-3">
                        {sources.slice(0, 6).map((source, i) => (
                          <a
                            key={i}
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-start gap-2 group"
                          >
                            <span className="flex-shrink-0 w-5 h-5 rounded bg-muted flex items-center justify-center text-xs font-medium">
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium line-clamp-1 group-hover:text-primary transition-colors">
                                {source.title}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {(() => { try { return new URL(source.url).hostname; } catch { return 'Source'; } })()}
                              </p>
                            </div>
                          </a>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Related Searches */}
                  <Card className="p-4">
                    <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4" />
                      Related searches
                    </h4>
                    <div className="space-y-2">
                      {[
                        `${query} explained`,
                        `${query} examples`,
                        `${query} vs alternatives`,
                        `how does ${query} work`,
                        `best ${query}`,
                      ].slice(0, 5).map((s, i) => (
                        <Button
                          key={i}
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-left h-auto py-2 px-3"
                          onClick={() => { setQuery(s); handleSearch(s); }}
                        >
                          <Search className="h-3 w-3 mr-2 flex-shrink-0" />
                          <span className="line-clamp-1 text-sm">{s}</span>
                        </Button>
                      ))}
                    </div>
                  </Card>

                  {/* Search History */}
                  {searchHistory.length > 1 && (
                    <Card className="p-4">
                      <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
                        <Zap className="h-4 w-4" />
                        Recent searches
                      </h4>
                      <div className="space-y-2">
                        {searchHistory.slice(1, 6).map((s, i) => (
                          <Button
                            key={i}
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-left h-auto py-2 px-3"
                            onClick={() => { setQuery(s); handleSearch(s); }}
                          >
                            <RefreshCw className="h-3 w-3 mr-2 flex-shrink-0" />
                            <span className="line-clamp-1 text-sm">{s}</span>
                          </Button>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIBrowserHome;
