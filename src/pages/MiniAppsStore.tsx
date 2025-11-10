import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Star, Download, TrendingUp, Clock, Filter, Loader2, X, Plus, Sparkles, ExternalLink, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useSSOToken } from '@/hooks/useSSOToken';
import { QuickAppSubmission } from '@/components/QuickAppSubmission';
import { Browser } from '@capacitor/browser';
import { useNativeStorage } from '@/hooks/useNativeStorage';

interface MiniApp {
  id: string;
  app_name: string;
  description: string;
  icon_url: string;
  url?: string;
  app_url?: string; // for backwards compatibility
  rating_average: number;
  install_count: number;
  is_verified: boolean;
  category?: string;
  category_id?: string; // for backwards compatibility
  tags?: string[];
  is_trending?: boolean;
  launch_date?: string;
  created_at?: string;
  monthly_active_users?: number;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  display_order: number;
}

interface AppUsage {
  app_id: string;
  usage_count: number;
  last_used_at: string;
}

const MiniAppsStore = () => {
  const navigate = useNavigate();
  const { openAppWithSSO } = useSSOToken();
  const [apps, setApps] = useState<MiniApp[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [installedApps, setInstalledApps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [installingAppId, setInstallingAppId] = useState<string | null>(null);
  const [recentlyUsed, setRecentlyUsed] = useState<AppUsage[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState<'popular' | 'rating' | 'newest'>('popular');
  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState<number>(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [showSubmission, setShowSubmission] = useState(false);
  
  // Offline cache using native storage
  const { value: cachedApps, setValue: setCachedApps } = useNativeStorage<MiniApp[]>('cached_mini_apps', []);

  useEffect(() => {
    loadCategories();
    loadApps();
    loadInstalledApps();
    loadRecentlyUsed();
  }, [selectedCategory, sortBy]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('app_categories')
      .select('*')
      .order('display_order');
    
    if (data) setCategories(data);
  };

  const loadApps = async () => {
    setLoading(true);
    let query = supabase
      .from('mini_apps')
      .select('*')
      .eq('is_active', true);

    if (selectedCategory !== 'all') {
      // Try both category and category_id for backwards compatibility
      const categoryFilter = selectedCategory;
      query = query.or(`category.eq.${categoryFilter},category_id.eq.${categoryFilter}`);
    }

    // Apply sorting
    if (sortBy === 'popular') {
      query = query.order('install_count', { ascending: false });
    } else if (sortBy === 'rating') {
      query = query.order('rating_average', { ascending: false });
    } else if (sortBy === 'newest') {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Failed to load apps:', error);
      // Use cached data if available
      if (cachedApps && cachedApps.length > 0) {
        setApps(cachedApps as any);
        toast.info('Showing cached apps (offline mode)');
      }
    } else if (data) {
      setApps(data as any);
      // Update cache
      if (setCachedApps) {
        setCachedApps(data as any);
      }
    }
    setLoading(false);
  };

  const loadInstalledApps = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_installed_apps')
      .select('app_id')
      .eq('user_id', user.id);

    if (data) {
      setInstalledApps(new Set(data.map(item => item.app_id)));
    }
  };

  const loadRecentlyUsed = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('app_usage')
      .select('app_id, usage_count, last_used_at')
      .eq('user_id', user.id)
      .order('last_used_at', { ascending: false })
      .limit(6);

    if (!error && data) {
      setRecentlyUsed(data);
    }
  };

  const trackAppUsage = async (appId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.rpc('track_app_usage', { p_app_id: appId });
    if (!error) {
      loadRecentlyUsed();
    }
  };

  const uninstallApp = async (app: MiniApp) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      await supabase
        .from('user_installed_apps')
        .delete()
        .eq('user_id', user.id)
        .eq('app_id', app.id);

      const { data: appData } = await supabase
        .from('mini_apps')
        .select('install_count')
        .eq('id', app.id)
        .single();

      if (appData) {
        await supabase
          .from('mini_apps')
          .update({ install_count: Math.max(0, (appData.install_count || 0) - 1) })
          .eq('id', app.id);
      }

      setInstalledApps(prev => {
        const newSet = new Set(prev);
        newSet.delete(app.id);
        return newSet;
      });

      toast.success('App uninstalled');
      loadApps();
    } catch (error) {
      console.error('Uninstall error:', error);
      toast.error('Failed to uninstall app');
    }
  };

  const installAndOpenApp = async (app: MiniApp) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please login to install apps');
      return;
    }

    setInstallingAppId(app.id);
    const loadingToast = toast.loading('Installing app...');

    try {
      // Install the app
      const { error } = await supabase
        .from('user_installed_apps')
        .insert({ user_id: user.id, app_id: app.id });

      if (error && !error.message.includes('duplicate')) {
        toast.error('Failed to install app', { id: loadingToast });
        setInstallingAppId(null);
        return;
      }

      // Track install analytics
      await supabase.from('app_analytics').insert({
        app_id: app.id,
        user_id: user.id,
        event_type: 'install'
      });

      // Update install count
      const { data: appData } = await supabase
        .from('mini_apps')
        .select('install_count')
        .eq('id', app.id)
        .single();

      if (appData) {
        await supabase
          .from('mini_apps')
          .update({ install_count: (appData.install_count || 0) + 1 })
          .eq('id', app.id);
      }

      setInstalledApps(prev => new Set([...prev, app.id]));
      toast.success('App installed! Opening...', { id: loadingToast });

      // Auto-open the app
      await openApp(app);
      loadApps();
    } catch (error) {
      console.error('Error installing app:', error);
      toast.error('Failed to install app', { id: loadingToast });
    } finally {
      setInstallingAppId(null);
    }
  };

  const openApp = async (app: MiniApp) => {
    try {
      const appUrl = app.url || app.app_url || '';
      
      // Track usage
      await trackAppUsage(app.id);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      // Start usage session tracking
      let sessionId: string | null = null;
      if (user) {
        const { data: sessionData } = await supabase
          .from('app_usage_sessions' as any)
          .insert({
            user_id: user.id,
            app_id: app.id,
            session_start: new Date().toISOString(),
          })
          .select()
          .single() as any;
        
        sessionId = sessionData?.id || null;
      }
      
      
      
      if (user && installedApps.has(app.id)) {
        // Update last opened time
        await supabase
          .from('user_installed_apps')
          .update({ last_opened_at: new Date().toISOString() } as any)
          .eq('user_id', user.id)
          .eq('app_id', app.id);

        // Track analytics
        await supabase.from('app_analytics')?.insert({
          app_id: app.id,
          user_id: user.id,
          event_type: 'open'
        });
      }

      // Load session data if exists
      let sessionData = null;
      if (user) {
        try {
          const { data } = await supabase
            .from('app_session_data' as any)
            .select('session_data')
            .eq('user_id', user.id)
            .eq('app_id', app.id)
            .maybeSingle() as any;
          
          sessionData = data?.session_data || null;
        } catch (err) {
          console.log('Session data not available:', err);
        }
      }

      // Store session data in local storage for WebView access
      if (sessionData) {
        localStorage.setItem(`app_session_${app.id}`, JSON.stringify(sessionData));
      }

      // Check if it's an internal route or external URL
      if (appUrl.startsWith('/')) {
        // Internal Chatr route - navigate within app
        navigate(appUrl);
        toast.success(`Opening ${app.app_name}...`);
      } else {
        // Open in WebView with session support
        toast.loading(`Opening ${app.app_name}...`, { id: `open-${app.id}` });
        
        await Browser.open({
          url: appUrl,
          presentationStyle: 'fullscreen',
          toolbarColor: '#1a1a2e',
        });

        // Listen for app close to sync session data and end tracking
        Browser.addListener('browserFinished', async () => {
          // End usage session
          if (sessionId && user) {
            await supabase
              .from('app_usage_sessions' as any)
              .update({
                session_end: new Date().toISOString(),
              })
              .eq('id', sessionId);
          }

          // Sync session data
          const updatedSession = localStorage.getItem(`app_session_${app.id}`);
          if (updatedSession && user) {
            try {
              await supabase
                .from('app_session_data' as any)
                .upsert({
                  user_id: user.id,
                  app_id: app.id,
                  session_data: JSON.parse(updatedSession),
                  last_synced: new Date().toISOString(),
                });
            } catch (err) {
              console.log('Failed to sync session data:', err);
            }
          }
        });

        toast.success(`${app.app_name} opened`, { id: `open-${app.id}` });
      }
      
      loadRecentlyUsed();
    } catch (error) {
      console.error('Error opening app:', error);
      toast.error('Failed to open app. Please try again.');
    }
  };

  const filteredApps = apps.filter(app => {
    // Search filter
    const matchesSearch = app.app_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Rating filter
    const matchesRating = app.rating_average >= minRating;
    
    // Verified filter
    const matchesVerified = !verifiedOnly || app.is_verified;
    
    return matchesSearch && matchesRating && matchesVerified;
  });

  const trendingApps = apps.filter(app => app.is_trending).slice(0, 6);
  const recentApps = [...apps].sort((a, b) => 
    new Date(b.created_at || b.launch_date || 0).getTime() - new Date(a.created_at || a.launch_date || 0).getTime()
  ).slice(0, 6);
  
  const continueUsingApps = apps.filter(app => 
    recentlyUsed.some(usage => usage.app_id === app.id)
  ).sort((a, b) => {
    const aUsage = recentlyUsed.find(u => u.app_id === a.id);
    const bUsage = recentlyUsed.find(u => u.app_id === b.id);
    return new Date(bUsage?.last_used_at || 0).getTime() - new Date(aUsage?.last_used_at || 0).getTime();
  });

  const renderAppCard = (app: MiniApp) => (
    <motion.div
      key={app.id}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <Card className="group relative overflow-hidden bg-card/60 backdrop-blur-sm border-border/40 hover:border-primary/20 hover:shadow-xl transition-all duration-300 h-full">
        <div className="p-5 flex flex-col h-full">
          {/* App Icon & Info */}
          <div className="flex items-start gap-4 mb-3">
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
              {app.icon_url && (app.icon_url.startsWith('http') || app.icon_url.startsWith('/')) ? (
                <img src={app.icon_url} alt={app.app_name} className="w-14 h-14 rounded-xl object-cover" />
              ) : (
                <span className="text-4xl">{app.icon_url || app.app_name[0]}</span>
              )}
              {app.is_trending && (
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
                  <TrendingUp className="h-3 w-3 text-white" />
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-base truncate">{app.app_name}</h3>
                {app.is_verified && (
                  <Badge variant="secondary" className="h-5 px-1.5 shrink-0">
                    <span className="text-primary">✓</span>
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="font-medium">{app.rating_average.toFixed(1)}</span>
                </div>
                <span className="text-border">•</span>
                <div className="flex items-center gap-1">
                  <Download className="h-3 w-3" />
                  <span>{(app.install_count / 1000).toFixed(0)}K</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground/80 mb-3 line-clamp-2 flex-1 leading-relaxed">
            {app.description}
          </p>

          {/* Tags */}
          {app.tags && app.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {app.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="outline" className="text-xs px-2 py-0.5 bg-muted/30 border-muted/40">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              className="flex-1 rounded-xl font-medium transition-all"
              variant={installedApps.has(app.id) ? 'outline' : 'default'}
              onClick={() => installedApps.has(app.id) ? openApp(app) : installAndOpenApp(app)}
              disabled={installingAppId === app.id}
            >
              {installingAppId === app.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Installing...
                </>
              ) : installedApps.has(app.id) ? (
                'OPEN'
              ) : (
                'GET'
              )}
            </Button>
            
            {installedApps.has(app.id) && (
              <Button
                variant="destructive"
                size="icon"
                className="rounded-xl"
                onClick={(e) => {
                  e.stopPropagation();
                  uninstallApp(app);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <QuickAppSubmission open={showSubmission} onOpenChange={setShowSubmission} />
      
      {/* Apple-style Premium Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-7xl mx-auto px-3">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="h-8 w-8 rounded-full hover:bg-muted/50 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-base font-semibold tracking-tight flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-primary" />
                Mini-Apps Marketplace
              </h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app-statistics')}
                className="h-8 gap-1.5"
              >
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Stats</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowSubmission(true)}
                className="h-8 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Submit App</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Apple-style Search */}
      <div className="bg-background border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-3">
          <div className="relative max-w-2xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
            <Input
              placeholder="Search apps"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-11 bg-muted/30 border-muted/40 rounded-xl text-base focus-visible:ring-primary/20"
            />
          </div>
          
          {/* Filter Pills */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <Button
              variant={showFilters ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-8 rounded-full px-4"
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Filters
            </Button>
            
            {showFilters && (
              <>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="h-8 w-32 rounded-full border-muted/40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="popular">Popular</SelectItem>
                    <SelectItem value="rating">Top Rated</SelectItem>
                    <SelectItem value="newest">New</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant={verifiedOnly ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setVerifiedOnly(!verifiedOnly)}
                  className="h-8 rounded-full"
                >
                  ✓ Verified
                </Button>
                
                {(minRating > 0 || verifiedOnly) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setMinRating(0);
                      setVerifiedOnly(false);
                    }}
                    className="h-8 rounded-full"
                  >
                    Clear
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-8">
        {/* Apple-style Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b border-border/40 rounded-none h-12 p-0">
            <TabsTrigger 
              value="all" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-12 px-6 font-medium"
            >
              All Apps
            </TabsTrigger>
            <TabsTrigger 
              value="trending" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-12 px-6 font-medium"
            >
              Trending
            </TabsTrigger>
            <TabsTrigger 
              value="recent" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-12 px-6 font-medium"
            >
              New
            </TabsTrigger>
            {continueUsingApps.length > 0 && (
              <TabsTrigger 
                value="continue" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent h-12 px-6 font-medium"
              >
                Continue
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="all" className="mt-8 space-y-6">
            {/* Apple-style Categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
                className="rounded-full h-9 px-5 shrink-0"
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="rounded-full h-9 px-5 shrink-0"
                >
                  <span className="mr-1.5">{category.icon}</span>
                  {category.name}
                </Button>
              ))}
            </div>

            {/* Apps Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-64 bg-muted/30 animate-pulse rounded-2xl" />
                ))}
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">No apps found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredApps.map(renderAppCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="trending" className="mt-8">
            {trendingApps.length === 0 ? (
              <div className="text-center py-20">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground text-lg">No trending apps</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {trendingApps.map(renderAppCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent" className="mt-8">
            {recentApps.length === 0 ? (
              <div className="text-center py-20">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground text-lg">No new apps</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {recentApps.map(renderAppCard)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="continue" className="mt-8">
            {continueUsingApps.length === 0 ? (
              <div className="text-center py-20">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground text-lg">No recent activity</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {continueUsingApps.map(renderAppCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MiniAppsStore;
