import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Search, Star, Download, Sparkles, Code, TrendingUp, Clock, Filter, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useSSOToken } from '@/hooks/useSSOToken';

interface MiniApp {
  id: string;
  app_name: string;
  description: string;
  icon_url: string;
  app_url: string;
  rating_average: number;
  install_count: number;
  is_verified: boolean;
  category_id: string;
  tags?: string[];
  is_trending?: boolean;
  launch_date?: string;
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
      query = query.eq('category_id', selectedCategory);
    }

    // Apply sorting
    if (sortBy === 'popular') {
      query = query.order('install_count', { ascending: false });
    } else if (sortBy === 'rating') {
      query = query.order('rating_average', { ascending: false });
    } else if (sortBy === 'newest') {
      query = query.order('launch_date', { ascending: false });
    }

    const { data } = await query;
    if (data) setApps(data);
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
      // Track usage
      await trackAppUsage(app.id);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && installedApps.has(app.id)) {
        // Update last opened time
        await supabase
          .from('user_installed_apps')
          .update({ last_opened_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .eq('app_id', app.id);

        // Track analytics
        await supabase.from('app_analytics').insert({
          app_id: app.id,
          user_id: user.id,
          event_type: 'open'
        });
      }

      // Check if it's an internal route or external URL
      if (app.app_url.startsWith('/')) {
        // Internal Chatr route - navigate within app
        navigate(app.app_url);
        toast.success(`Opening ${app.app_name}...`);
      } else {
        // External URL - open with SSO
        if (user) {
          toast.loading(`Opening ${app.app_name}...`, { id: `open-${app.id}` });
          await openAppWithSSO(app.app_url, app.id);
          toast.success(`${app.app_name} opened in new tab`, { id: `open-${app.id}` });
        } else {
          window.open(app.app_url, '_blank');
          toast.success(`${app.app_name} opened in new tab`);
        }
      }
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

  const trendingApps = apps.filter(app => app.is_trending);
  const recentApps = [...apps].sort((a, b) => 
    new Date(b.launch_date || 0).getTime() - new Date(a.launch_date || 0).getTime()
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="h-full"
    >
      <Card className="p-4 hover:shadow-lg transition-all h-full flex flex-col">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
            {app.icon_url ? (
              <img src={app.icon_url} alt={app.app_name} className="w-10 h-10 rounded" />
            ) : (
              <span className="text-2xl">{app.app_name[0]}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{app.app_name}</h3>
              {app.is_verified && (
                <Badge variant="secondary" className="h-5 flex-shrink-0">✓</Badge>
              )}
              {app.is_trending && (
                <Badge variant="default" className="h-5 flex-shrink-0 gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Hot
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Star className="h-3 w-3 fill-current" />
              {app.rating_average.toFixed(1)}
              <span>•</span>
              <Download className="h-3 w-3" />
              {app.install_count.toLocaleString()}
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-3 line-clamp-2 flex-1">
          {app.description}
        </p>

        {app.tags && app.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {app.tags.slice(0, 3).map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <Button
          className="w-full"
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
            'Open'
          ) : (
            'Install'
          )}
        </Button>
      </Card>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-3 p-3 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full h-9 w-9"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-bold">Mini-Apps Store</h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/developer-portal')}
            className="rounded-full"
          >
            <Code className="h-4 w-4 mr-2" />
            Developers
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="px-3 pb-3 max-w-7xl mx-auto space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search apps or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9 bg-muted/50"
              />
            </div>
            <Button
              variant={showFilters ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex gap-2 flex-wrap"
            >
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[140px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Most Popular</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="newest">Just Launched</SelectItem>
                </SelectContent>
              </Select>

              <Select value={minRating.toString()} onValueChange={(v) => setMinRating(Number(v))}>
                <SelectTrigger className="w-[120px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All Ratings</SelectItem>
                  <SelectItem value="3">3+ Stars</SelectItem>
                  <SelectItem value="4">4+ Stars</SelectItem>
                  <SelectItem value="4.5">4.5+ Stars</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant={verifiedOnly ? 'default' : 'outline'}
                size="sm"
                onClick={() => setVerifiedOnly(!verifiedOnly)}
                className="h-8 text-sm"
              >
                ✓ Verified Only
              </Button>

              {(minRating > 0 || verifiedOnly) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMinRating(0);
                    setVerifiedOnly(false);
                  }}
                  className="h-8 text-sm gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear
                </Button>
              )}
            </motion.div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Smart Discovery Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="all" className="gap-2">
              <Sparkles className="h-4 w-4" />
              All Apps
            </TabsTrigger>
            <TabsTrigger value="trending" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Trending
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-2">
              <Clock className="h-4 w-4" />
              Just Launched
            </TabsTrigger>
            <TabsTrigger value="continue" className="gap-2" disabled={continueUsingApps.length === 0}>
              <Clock className="h-4 w-4" />
              Continue
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6 space-y-4">
            {/* Categories */}
            <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              <div className="flex gap-2 min-w-max">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory('all')}
                  className="rounded-full"
                >
                  All
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(category.id)}
                    className="rounded-full"
                  >
                    <span className="mr-1.5">{category.icon}</span>
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Apps Grid */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-64 bg-muted/50 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="text-center py-12">
                <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No apps found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredApps.map(app => renderAppCard(app))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="trending" className="mt-6">
            {trendingApps.length === 0 ? (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No trending apps</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {trendingApps.map(app => renderAppCard(app))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent" className="mt-6">
            {recentApps.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No recent apps</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {recentApps.map(app => renderAppCard(app))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="continue" className="mt-6">
            {continueUsingApps.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <p className="text-muted-foreground">No recently used apps</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {continueUsingApps.map(app => renderAppCard(app))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MiniAppsStore;