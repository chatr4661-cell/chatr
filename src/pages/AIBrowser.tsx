import { useState, useRef, useEffect } from 'react';
import { Search, Sparkles, Camera, Loader2, ExternalLink, Mic, Image as ImageIcon, Home, User, Clock, Plus, Globe, Code, Users, GraduationCap, Video, MessageSquare, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  category?: string;
  thumbnail?: string;
  imageUrl?: string;
  videoUrl?: string;
  duration?: string;
  views?: string;
}

interface SearchResponse {
  summary: string;
  results: SearchResult[];
  allResults?: {
    web: SearchResult[];
    tech: SearchResult[];
    social: SearchResult[];
    research: SearchResult[];
    image: SearchResult[];
    video: SearchResult[];
    all: SearchResult[];
  };
  query: string;
  searchTime?: number;
  resultCount?: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchData, setSearchData] = useState<SearchResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'web' | 'image' | 'video' | 'tech' | 'social' | 'research'>('web');
  const [chatMode, setChatMode] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSearch = async (query: string, category?: string) => {
    if (!query.trim()) {
      toast({ description: 'Please enter a search query', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const searchCategory = category || activeTab;
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-browser-search', {
        body: { 
          query: query.trim(),
          category: searchCategory
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast({ description: data.error, variant: 'destructive' });
        return;
      }

      setSearchData(data);
      const time = data.searchTime ? `${data.searchTime}ms` : '';
      const count = data.resultCount || 0;
      toast({ description: `Found ${count} results ${time ? `in ${time}` : ''}` });
    } catch (error: any) {
      console.error('Search error:', error);
      toast({ description: 'Search failed. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setChatLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-smart-reply', {
        body: { 
          message: chatInput,
          context: chatMessages.map(m => `${m.role}: ${m.content}`).join('\n')
        }
      });

      if (error) throw error;

      if (data?.reply) {
        const assistantMessage: ChatMessage = { 
          role: 'assistant', 
          content: data.reply 
        };
        setChatMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      toast({ description: 'Chat failed. Please try again.', variant: 'destructive' });
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 pb-20">
      {/* Header */}
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border-b border-slate-200 dark:border-slate-700 px-4 py-3 sticky top-0 z-40 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            <h1 className="text-xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-400 dark:to-purple-400 bg-clip-text text-transparent">
              AI Search
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={chatMode ? 'default' : 'ghost'}
              onClick={() => setChatMode(!chatMode)}
              className="rounded-xl"
            >
              {chatMode ? <Search className="h-4 w-4 mr-1" /> : <MessageSquare className="h-4 w-4 mr-1" />}
              {chatMode ? 'Search' : 'Chat'}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Chat Mode */}
        {chatMode ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-4 min-h-[65vh] max-h-[65vh] overflow-y-auto space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center py-20">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-violet-300 dark:text-violet-500" />
                  <p className="text-slate-600 dark:text-slate-300 font-medium text-lg">Ask me anything!</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Powered by Lovable AI</p>
                </div>
              ) : (
                <>
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user' 
                          ? 'bg-violet-600 text-white' 
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                      }`}>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                  {chatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl px-4 py-3">
                        <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 flex items-end gap-2 shadow-sm">
              <Textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleChatSend();
                  }
                }}
                placeholder="Type your message..."
                className="flex-1 min-h-[48px] max-h-[150px] resize-none border-0 focus-visible:ring-0 bg-transparent text-slate-900 dark:text-slate-100"
                disabled={chatLoading}
              />
              <Button
                size="icon"
                onClick={handleChatSend}
                disabled={chatLoading || !chatInput.trim()}
                className="shrink-0 h-12 w-12 rounded-xl bg-violet-600 hover:bg-violet-700"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Ask anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleSearch(searchQuery)}
                className="pl-12 pr-4 h-14 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-2xl text-base shadow-sm focus:shadow-md transition-shadow"
                disabled={loading}
              />
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {[
                { id: 'web', label: 'All', icon: Globe },
                { id: 'image', label: 'Images', icon: ImageIcon },
                { id: 'video', label: 'Videos', icon: Video },
                { id: 'tech', label: 'Tech', icon: Code },
                { id: 'social', label: 'Social', icon: Users },
                { id: 'research', label: 'Research', icon: GraduationCap }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      if (searchData) handleSearch(searchData.query, tab.id);
                    }}
                    className={`rounded-xl px-4 whitespace-nowrap ${
                      activeTab === tab.id 
                        ? 'bg-violet-600 text-white shadow-md' 
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-1.5" />
                    {tab.label}
                  </Button>
                );
              })}
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-20">
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-violet-600" />
                <p className="text-slate-700 dark:text-slate-300 font-medium text-lg">Searching the web...</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Querying multiple sources</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && !searchData && (
              <div className="text-center py-20">
                <Search className="h-16 w-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" />
                <p className="text-slate-600 dark:text-slate-400 text-lg font-medium">What would you like to know?</p>
                <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Search powered by AI</p>
              </div>
            )}

            {/* Results */}
            {!loading && searchData && (
              <div className="space-y-6">
                {/* AI Overview Card - Google AI Style */}
                <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm rounded-3xl overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-1.5 rounded-lg">
                        <Sparkles className="h-4 w-4 text-white" />
                      </div>
                      <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        AI Overview
                      </CardTitle>
                      {searchData.resultCount && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">
                          • {searchData.resultCount} sources
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div 
                      className="prose prose-sm dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 leading-relaxed"
                      dangerouslySetInnerHTML={{ 
                        __html: searchData.summary
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-white">$1</strong>')
                          .replace(/\n\n/g, '</p><p class="mt-4">')
                          .replace(/^(.*)$/gm, (match) => {
                            if (match.trim() && !match.includes('<p')) return `<p>${match}</p>`;
                            return match;
                          })
                          .replace(/• /g, '<li class="ml-4">')
                          .replace(/<li class="ml-4">(.*?)(?=<\/p>|<p>|$)/gs, '<ul class="list-disc ml-6 space-y-1"><li>$1</li></ul>')
                      }}
                    />
                    <div className="flex items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setChatMode(true);
                          setChatInput(`Tell me more about: ${searchData.query}`);
                        }}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-xl"
                      >
                        <MessageSquare className="w-4 h-4 mr-1.5" />
                        Ask follow-up
                      </Button>
                      {searchData.searchTime && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">
                          Generated in {searchData.searchTime}ms
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Source Results */}
                {searchData.results.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                      <ExternalLink className="h-4 w-4" />
                      Sources ({searchData.results.length})
                    </h3>
                    <div className={activeTab === 'image' ? 'grid grid-cols-2 md:grid-cols-3 gap-3' : 'space-y-3'}>
                      {searchData.results.map((result, index) => (
                        <Card 
                          key={index}
                          className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden group"
                        >
                          <CardContent className={activeTab === 'image' ? 'p-0' : 'p-4'}>
                            {activeTab === 'image' ? (
                              <a href={result.url} target="_blank" rel="noopener noreferrer" className="block">
                                <img 
                                  src={result.imageUrl || result.thumbnail} 
                                  alt={result.title}
                                  className="w-full aspect-square object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="p-2">
                                  <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-1 font-medium">
                                    {result.title}
                                  </p>
                                  <p className="text-xs text-violet-600 dark:text-violet-400">{result.source}</p>
                                </div>
                              </a>
                            ) : activeTab === 'video' ? (
                              <a href={result.url} target="_blank" rel="noopener noreferrer" className="block">
                                {result.thumbnail && (
                                  <div className="relative mb-3">
                                    <img 
                                      src={result.thumbnail} 
                                      alt={result.title}
                                      className="w-full aspect-video rounded-lg object-cover"
                                    />
                                    {result.duration && (
                                      <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                                        {result.duration}
                                      </div>
                                    )}
                                  </div>
                                )}
                                <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2 mb-1">
                                  {result.title}
                                </h4>
                                <p className="text-xs text-violet-600 dark:text-violet-400">
                                  {result.source}
                                  {result.views && ` • ${result.views} views`}
                                </p>
                              </a>
                            ) : (
                              <a href={result.url} target="_blank" rel="noopener noreferrer" className="block space-y-2">
                                <div className="flex items-start gap-3">
                                  {result.thumbnail && (
                                    <img 
                                      src={result.thumbnail} 
                                      alt=""
                                      className="w-14 h-14 rounded-lg object-cover shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2 mb-1 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                      {result.title}
                                    </h4>
                                    <p className="text-xs text-violet-600 dark:text-violet-400 font-medium mb-1">
                                      {result.source}
                                    </p>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                      {result.snippet}
                                    </p>
                                  </div>
                                </div>
                              </a>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
