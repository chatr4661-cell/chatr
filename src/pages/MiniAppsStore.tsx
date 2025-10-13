import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Star, Download, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

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
  const [apps, setApps] = useState<MiniApp[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [installedApps, setInstalledApps] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

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

  const installApp = async (appId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please login to install apps');
      return;
    }

    const { error } = await supabase
      .from('user_installed_apps')
      .insert({ user_id: user.id, app_id: appId });

    if (error) {
      toast.error('Failed to install app');
      return;
    }

    // Update install count
    const { data: app } = await supabase
      .from('mini_apps')
      .select('install_count')
      .eq('id', appId)
      .single();

    if (app) {
      await supabase
        .from('mini_apps')
        .update({ install_count: (app.install_count || 0) + 1 })
        .eq('id', appId);
    }

    setInstalledApps(prev => new Set([...prev, appId]));
    loadApps(); // Refresh to show updated count
    toast.success('App installed successfully!');
  };

  const openApp = (app: MiniApp) => {
    // Open in new window/iframe
    window.open(app.app_url, '_blank');
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
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="rounded-full whitespace-nowrap"
            >
              All Apps
            </Button>
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="rounded-full whitespace-nowrap"
              >
                <span className="mr-1.5">{category.icon}</span>
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Apps Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-20">
            <Sparkles className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground text-lg">No apps found</p>
            <p className="text-muted-foreground text-sm mt-1">Try a different category or search</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{filteredApps.map((app) => (
              <Card key={app.id} className="overflow-hidden hover:shadow-xl transition-all duration-200 hover:-translate-y-1">
                <div className="p-4 space-y-3">
                  {/* App Icon */}
                  <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-5xl">
                    {app.icon_url || '✨'}
                  </div>

                  {/* App Info */}
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="font-semibold text-sm line-clamp-1">{app.app_name}</h3>
                      {app.is_verified && (
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 text-xs px-1.5 py-0 h-5">
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
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                        <span className="font-medium">{app.rating_average.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        <span>{app.install_count > 1000 ? `${(app.install_count / 1000).toFixed(0)}k` : app.install_count}</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-1">
                      {installedApps.has(app.id) ? (
                        <Button
                          size="sm"
                          onClick={() => openApp(app)}
                          className="w-full h-8 text-xs"
                          variant="secondary"
                        >
                          Open
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => installApp(app.id)}
                          className="w-full h-8 text-xs bg-primary hover:bg-primary/90"
                        >
                          Install
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MiniAppsStore;
