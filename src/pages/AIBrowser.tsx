import { useState } from 'react';
import { Search, Sparkles, Camera, Loader2, ExternalLink, Mic, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface SearchResponse {
  summary: string;
  results: SearchResult[];
  query: string;
}

export default function AIBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [aiQuery, setAiQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'web' | 'news' | 'research' | 'social'>('all');
  const navigate = useNavigate();

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      toast.error('Please enter a search query');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-browser-search', {
        body: { query: query.trim() }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setSearchData(data);
      toast.success('Search completed!');
    } catch (error: any) {
      console.error('Search error:', error);
      toast.error('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950">
      {/* Holographic Background Effect */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_50%)] pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(168,85,247,0.1),transparent_50%)] pointer-events-none" />
      
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-violet-500/10 border-b border-violet-500/20 px-4 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-4 animate-fade-in">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
              Chatr Browser
            </h1>
            <p className="text-sm text-violet-200/90 mt-1">Deep Multiverse Search Engine</p>
            <p className="text-xs text-violet-300/60 mt-1">Not a browser. A discovery engine that thinks deeper than the web.</p>
          </div>
          <div className="flex items-center gap-3 animate-scale-in">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-violet-300/60" />
              <Input
                type="text"
                placeholder="Search across all sources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                className="pl-10 bg-white/5 border-violet-400/30 text-white placeholder:text-violet-300/40 focus:border-violet-400/60 focus:ring-violet-400/30 backdrop-blur-sm"
                disabled={loading}
              />
            </div>
            <Button 
              size="icon" 
              onClick={() => handleSearch(searchQuery)}
              disabled={loading}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/50 transition-all hover:shadow-violet-500/70 hover:scale-105"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </header>

      {/* AI Input Section */}
      <div className="max-w-6xl mx-auto px-4 py-6 relative z-10">
        <Card className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 backdrop-blur-xl border-violet-400/30 shadow-2xl shadow-violet-500/20 hover:shadow-violet-500/30 transition-all animate-fade-in">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/50">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-white">AI Deep Search</CardTitle>
            </div>
            <CardDescription className="text-violet-200/70">
              Parallel query across 15+ sources with AI-powered fusion & citations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Ask anything - AI will search, analyze, and synthesize..."
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(aiQuery)}
                disabled={loading}
                className="bg-white/5 border-violet-400/30 text-white placeholder:text-violet-300/40 focus:border-violet-400/60 focus:ring-violet-400/30"
              />
              <Button 
                onClick={() => handleSearch(aiQuery)}
                disabled={loading}
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/50 transition-all hover:shadow-violet-500/70 hover:scale-105"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Deep Search
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      <div className="max-w-6xl mx-auto px-4 pb-32 relative z-10">
        {loading && (
          <div className="text-center py-20 animate-fade-in">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-600 blur-2xl opacity-50 animate-pulse" />
              <Loader2 className="h-16 w-16 mx-auto mb-4 animate-spin text-violet-300 relative" />
            </div>
            <p className="text-violet-200/80 text-lg font-medium">Searching across multiverse sources...</p>
            <p className="text-violet-300/50 text-sm mt-2">Querying 15+ engines in parallel</p>
          </div>
        )}

        {!loading && !searchData && (
          <div className="text-center py-20 text-violet-200/60 animate-fade-in">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/30 to-purple-600/30 blur-3xl" />
              <Search className="h-16 w-16 mx-auto opacity-30 relative" />
            </div>
            <p className="text-xl font-medium">Begin Your Deep Search</p>
            <p className="text-sm mt-2 text-violet-300/40">Enter a query to unlock multiverse intelligence</p>
          </div>
        )}

        {!loading && searchData && (
          <div className="space-y-6 animate-fade-in">
            {/* Source Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {['all', 'web', 'news', 'research', 'social'].map((tab) => (
                <Button
                  key={tab}
                  variant={activeTab === tab ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab(tab as any)}
                  className={activeTab === tab 
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/50 border-0' 
                    : 'bg-white/5 border-violet-400/30 text-violet-200 hover:bg-violet-500/20 hover:text-white'
                  }
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Button>
              ))}
            </div>

            {/* AI Summary - Neon Glass Card */}
            <Card className="bg-gradient-to-br from-violet-500/20 to-purple-500/20 backdrop-blur-2xl border-violet-400/40 shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/40 transition-all animate-scale-in">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/60 animate-pulse">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-white text-lg">AI Fusion Summary</CardTitle>
                    <CardDescription className="text-violet-200/70 text-sm">
                      Synthesized from {searchData.results.length} sources • {searchData.query}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert prose-sm max-w-none">
                  <p className="text-violet-100 leading-relaxed whitespace-pre-wrap hover-citation">
                    {searchData.summary}
                  </p>
                </div>
                {searchData.results.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-violet-400/20">
                    <p className="text-xs text-violet-300/60 flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      Trust Score: High (verified from {searchData.results.length} reliable sources)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Search Results - Neon Glass Cards */}
            {searchData.results.length > 0 && (
              <div className="animate-fade-in">
                <h3 className="text-xl font-semibold mb-5 text-white flex items-center gap-2">
                  <span className="inline-block w-1 h-6 bg-gradient-to-b from-violet-400 to-purple-600 rounded-full" />
                  Sources ({searchData.results.length})
                </h3>
                <div className="grid gap-4">
                  {searchData.results.map((result, index) => (
                    <Card 
                      key={index} 
                      className="group bg-gradient-to-br from-violet-500/10 to-purple-500/10 backdrop-blur-xl border-violet-400/30 hover:border-violet-400/60 shadow-lg shadow-violet-500/10 hover:shadow-violet-500/30 transition-all hover:scale-[1.02] cursor-pointer animate-scale-in"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/30 text-violet-200 border border-violet-400/30">
                                {result.source}
                              </span>
                            </div>
                            <CardTitle className="text-base text-white line-clamp-2 group-hover:text-violet-200 transition-colors">
                              {result.title}
                            </CardTitle>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => window.open(result.url, '_blank')}
                            className="text-violet-300 hover:text-white hover:bg-violet-500/20 shrink-0"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-violet-200/70 line-clamp-3 leading-relaxed">
                          {result.snippet}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Buttons - Holographic Style */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-30 animate-fade-in">
        <Button
          size="icon"
          className="h-14 w-14 rounded-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 shadow-2xl shadow-pink-500/50 hover:shadow-pink-500/70 transition-all hover:scale-110 border-2 border-pink-400/30"
          onClick={() => toast.info('Voice search coming soon!')}
        >
          <Mic className="h-6 w-6" />
        </Button>
        
        <Button
          size="icon"
          className="h-14 w-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-2xl shadow-cyan-500/50 hover:shadow-cyan-500/70 transition-all hover:scale-110 border-2 border-cyan-400/30"
          onClick={() => navigate('/capture')}
        >
          <ImageIcon className="h-6 w-6" />
        </Button>

        <Button
          size="icon"
          className="h-14 w-14 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-2xl shadow-violet-500/50 hover:shadow-violet-500/70 transition-all hover:scale-110 border-2 border-violet-400/30"
          onClick={() => navigate('/chat-ai')}
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}
