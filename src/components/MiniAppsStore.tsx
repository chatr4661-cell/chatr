import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Star, Download, Search } from 'lucide-react';
import { toast } from 'sonner';

interface MiniApp {
  id: string;
  app_name: string;
  description: string;
  icon_url: string;
  category: string;
  rating_average: number;
  install_count: number;
  is_verified: boolean;
}

export const MiniAppsStore = () => {
  const [apps, setApps] = useState<MiniApp[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [installedApps, setInstalledApps] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadApps();
    loadInstalledApps();
  }, [category]);

  const loadApps = async () => {
    let query = supabase
      .from('mini_apps' as any)
      .select('*')
      .eq('is_active', true);

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('rating_average', { ascending: false }) as any;

    if (error) {
      toast.error('Failed to load apps');
      return;
    }

    setApps(data || []);
  };

  const loadInstalledApps = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data } = await supabase
      .from('user_installed_apps' as any)
      .select('app_id')
      .eq('user_id', user?.id) as any;

    setInstalledApps(new Set(data?.map((d: any) => d.app_id) || []));
  };

  const installApp = async (appId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('user_installed_apps' as any)
      .insert({
        user_id: user?.id,
        app_id: appId,
      } as any);

    if (error) {
      toast.error('Failed to install app');
      return;
    }

    // Increment install count
    const { data: currentApp } = await supabase
      .from('mini_apps' as any)
      .select('install_count')
      .eq('id', appId)
      .single() as any;

    await supabase
      .from('mini_apps' as any)
      .update({ install_count: (currentApp?.install_count || 0) + 1 } as any)
      .eq('id', appId);

    toast.success('App installed successfully');
    loadInstalledApps();
  };

  const filteredApps = apps.filter(app =>
    app.app_name.toLowerCase().includes(search.toLowerCase()) ||
    app.description?.toLowerCase().includes(search.toLowerCase())
  );

  const categories = ['all', 'productivity', 'entertainment', 'health', 'finance', 'social', 'utilities', 'games', 'education'];

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search apps..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <Button
            key={cat}
            variant={category === cat ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCategory(cat)}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredApps.map(app => (
          <Card key={app.id} className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                {app.icon_url ? (
                  <img src={app.icon_url} alt={app.app_name} className="w-10 h-10 rounded" />
                ) : (
                  <span className="text-2xl">{app.app_name[0]}</span>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{app.app_name}</h3>
                  {app.is_verified && (
                    <Badge variant="secondary" className="h-5">✓</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="h-3 w-3 fill-current" />
                  {app.rating_average.toFixed(1)}
                  <span>•</span>
                  <Download className="h-3 w-3" />
                  {app.install_count}
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
              {app.description}
            </p>

            <Button
              className="w-full"
              variant={installedApps.has(app.id) ? 'secondary' : 'default'}
              onClick={() => installApp(app.id)}
              disabled={installedApps.has(app.id)}
            >
              {installedApps.has(app.id) ? 'Installed' : 'Install'}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
};
