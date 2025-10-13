import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Search, Star, Download, ExternalLink, Sparkles } from 'lucide-react';
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex items-center gap-3 p-4 max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Mini-Apps Store</h1>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-4 max-w-7xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {/* Categories */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto">
            <TabsTrigger value="all" className="whitespace-nowrap">
              All Apps
            </TabsTrigger>
            {categories.map((category) => (
              <TabsTrigger key={category.id} value={category.id} className="whitespace-nowrap">
                <span className="mr-1">{category.icon}</span>
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Apps Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading apps...</div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No apps found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredApps.map((app) => (
              <Card key={app.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  {/* App Icon */}
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                    {app.icon_url ? (
                      <img src={app.icon_url} alt={app.app_name} className="w-12 h-12 rounded-lg" />
                    ) : (
                      <Sparkles className="w-8 h-8 text-primary" />
                    )}
                  </div>

                  {/* App Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold truncate">{app.app_name}</h3>
                      {app.is_verified && (
                        <Badge variant="secondary" className="bg-blue-500/10 text-blue-500 flex-shrink-0">
                          ✓ Verified
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {app.description}
                    </p>

                    {/* Rating & Downloads */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                        <span>{app.rating_average.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        <span>{app.install_count.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Tags */}
                    {app.tags && app.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {app.tags.slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-3">
                      {installedApps.has(app.id) ? (
                        <Button
                          size="sm"
                          onClick={() => openApp(app)}
                          className="flex-1"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Open
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => installApp(app.id)}
                          className="flex-1"
                        >
                          <Download className="w-4 h-4 mr-1" />
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
