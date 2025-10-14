import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Star, Download, Sparkles, Code } from 'lucide-react';
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
  tags: string[];
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  display_order: number;
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

  useEffect(() => {
    loadCategories();
    loadApps();
    loadInstalledApps();
  }, [selectedCategory]);

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

    const { data } = await query.order('rating_average', { ascending: false });
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

      if (error) {
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

  const filteredApps = apps.filter(app =>
    app.app_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.description?.toLowerCase().includes(searchQuery.toLowerCase())
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

        {/* Search */}
        <div className="px-3 pb-3 max-w-7xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 bg-muted/50"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Categories - Horizontal Scroll */}
        <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          <div className="flex gap-2 min-w-max">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
                className="rounded-full whitespace-nowrap shadow-sm hover:shadow-md transition-all"
              >
                All Apps
              </Button>
            </motion.div>
            {categories.map((category) => (
              <motion.div 
                key={category.id}
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="rounded-full whitespace-nowrap shadow-sm hover:shadow-md transition-all"
                >
                  <span className="mr-1.5">{category.icon}</span>
                  {category.name}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Apps Grid */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="h-48 bg-muted/50 animate-pulse rounded-2xl border border-border/50"
                />
              ))}
            </motion.div>
          ) : filteredApps.length === 0 ? (
            <motion.div 
              className="text-center py-20"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground text-lg font-medium">No apps found</p>
              <p className="text-muted-foreground text-sm mt-1">Try a different category or search</p>
            </motion.div>
          ) : (
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {filteredApps.map((app, index) => (
                <motion.div
                  key={app.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card className="overflow-hidden hover:shadow-2xl transition-all duration-300 group border-border/50 hover:border-primary/30 bg-card/80 backdrop-blur-sm">
                    <div className="p-4 space-y-3">
                      {/* App Icon */}
                      <motion.div 
                        className="w-full aspect-square rounded-2xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 flex items-center justify-center text-5xl relative overflow-hidden"
                        whileHover={{ rotate: [0, -5, 5, -5, 0] }}
                        transition={{ duration: 0.5 }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-white/10" />
                        {app.icon_url || '✨'}
                      </motion.div>

                      {/* App Info */}
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="font-semibold text-sm line-clamp-1 group-hover:text-primary transition-colors">
                            {app.app_name}
                          </h3>
                          {app.is_verified && (
                            <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 text-xs px-1.5 py-0 h-5 shadow-sm">
                              ✓
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                          {app.description}
                        </p>

                        {/* Rating & Downloads */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-yellow-500 text-yellow-500" />
                            <span className="font-medium">{app.rating_average.toFixed(1)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Download className="w-3.5 h-3.5" />
                            <span>{app.install_count > 1000 ? `${(app.install_count / 1000).toFixed(0)}k` : app.install_count}</span>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="pt-1">
                          {installedApps.has(app.id) ? (
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button
                                size="sm"
                                onClick={() => openApp(app)}
                                className="w-full h-8 text-xs shadow-md hover:shadow-lg transition-all"
                                variant="secondary"
                              >
                                Open
                              </Button>
                            </motion.div>
                          ) : (
                            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                              <Button
                                size="sm"
                                onClick={() => installAndOpenApp(app)}
                                disabled={installingAppId === app.id}
                                className="w-full h-8 text-xs bg-primary hover:bg-primary/90 shadow-md hover:shadow-xl transition-all disabled:opacity-50"
                              >
                                {installingAppId === app.id ? 'Installing...' : 'Install'}
                              </Button>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MiniAppsStore;
