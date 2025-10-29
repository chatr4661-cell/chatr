import { useState } from 'react';
import { Search, Sparkles, Camera, Loader2, ExternalLink, Mic, Image as ImageIcon, Home, User, Clock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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
      toast({ description: 'Please enter a search query', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-browser-search', {
        body: { query: query.trim() }
      });

      if (error) throw error;

      if (data?.error) {
        toast({ description: data.error, variant: 'destructive' });
        return;
      }

      setSearchData(data);
      toast({ description: 'Search completed!' });
    } catch (error: any) {
      console.error('Search error:', error);
      toast({ description: 'Search failed. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 via-purple-50 to-pink-50 pb-20">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-violet-100 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Chatr.AI</h1>
          <Avatar className="h-9 w-9 border-2 border-violet-200">
            <AvatarImage src="" />
            <AvatarFallback className="bg-gradient-to-br from-violet-400 to-purple-500 text-white text-sm">U</AvatarFallback>
          </Avatar>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Search or ask anything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
            className="pl-11 pr-12 h-12 bg-white/90 border-slate-200 rounded-2xl text-base placeholder:text-slate-400 focus:border-violet-300 focus:ring-violet-200"
            disabled={loading}
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-slate-500 hover:text-violet-600"
            onClick={() => toast({ description: 'Voice search coming soon!' })}
          >
            <Mic className="h-5 w-5" />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'Web' },
            { id: 'news', label: 'Chat' },
            { id: 'research', label: 'Image' },
            { id: 'social', label: 'News' }
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(tab.id as any)}
              className={activeTab === tab.id 
                ? 'bg-white text-slate-900 shadow-sm hover:bg-white rounded-xl px-4' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50 rounded-xl px-4'
              }
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <Loader2 className="h-10 w-10 mx-auto mb-3 animate-spin text-violet-500" />
            <p className="text-slate-600">Searching...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !searchData && (
          <div className="text-center py-16">
            <Search className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500">Start searching to see results</p>
          </div>
        )}

        {/* Results */}
        {!loading && searchData && (
          <div className="space-y-4">
            {/* Main Result Card */}
            <Card className="bg-white/90 backdrop-blur-sm border-violet-100 shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-slate-900">{searchData.query}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-700 leading-relaxed">
                  {searchData.summary}
                </p>
                
                {/* Ask AI Button */}
                <Button 
                  variant="outline" 
                  size="sm"
                  className="w-full bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100 rounded-xl"
                  onClick={() => navigate('/chat-ai')}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Ask AI
                </Button>
              </CardContent>
            </Card>

            {/* Live Actions */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Live Actions</h3>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <Button
                  variant="outline"
                  className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl whitespace-nowrap"
                  onClick={() => toast({ description: 'Booking feature coming soon!' })}
                >
                  Book
                </Button>
                <Button
                  variant="outline"
                  className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl whitespace-nowrap"
                  onClick={() => navigate('/capture')}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Scan
                </Button>
                <Button
                  variant="outline"
                  className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl whitespace-nowrap"
                  onClick={() => toast({ description: 'Install feature coming soon!' })}
                >
                  Install app
                </Button>
              </div>
            </div>

            {/* Sources */}
            {searchData.results.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  Sources: {searchData.results.map(r => r.source).join(', ')}
                </h3>
                <div className="space-y-3">
                  {searchData.results.map((result, index) => (
                    <Card 
                      key={index}
                      className="bg-white/90 border-violet-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-slate-900 text-sm mb-1 line-clamp-2">
                              {result.title}
                            </h4>
                            <p className="text-xs text-slate-500 mb-2">{result.source}</p>
                            <p className="text-sm text-slate-600 line-clamp-2">
                              {result.snippet}
                            </p>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="shrink-0 h-8 w-8 text-slate-400 hover:text-violet-600"
                            onClick={() => window.open(result.url, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-violet-100 px-6 py-3 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-around">
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 text-slate-600 hover:text-violet-600 hover:bg-transparent"
            onClick={() => navigate('/')}
          >
            <Home className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 text-violet-600 hover:text-violet-700 hover:bg-transparent relative"
          >
            <Search className="h-6 w-6" />
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-900 rounded-full" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 text-slate-600 hover:text-violet-600 hover:bg-transparent"
            onClick={() => navigate('/chat-ai')}
          >
            <Clock className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 text-slate-600 hover:text-violet-600 hover:bg-transparent"
            onClick={() => navigate('/profile')}
          >
            <User className="h-6 w-6" />
          </Button>
        </div>
      </nav>
    </div>
  );
}
