import { useEffect, useState, memo, useCallback } from 'react';
import { ArrowLeft, Search, Sparkles, TrendingUp, Star, Download, ChevronRight, Code2, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface StoreApp {
  id: string;
  app_name: string;
  description: string | null;
  short_description: string | null;
  icon_url: string | null;
  category_id: string | null;
  rating_average: number | null;
  rating_count: number | null;
  install_count: number | null;
  downloads_count: number | null;
  is_verified: boolean | null;
  is_trending: boolean | null;
  is_active: boolean | null;
  app_type: string | null;
  version: string | null;
  screenshots: string[] | null;
  cover_image_url: string | null;
  tags: string[] | null;
}

const formatCount = (n: number | null) => {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
};

const AppCard = memo(({ app, onClick, size = 'normal' }: { app: StoreApp; onClick: () => void; size?: 'normal' | 'large' | 'compact' }) => {
  const [imgError, setImgError] = useState(false);
  const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.app_name)}&background=6366f1&color=fff&size=64&bold=true`;

  if (size === 'large') {
    return (
      <Card className="overflow-hidden cursor-pointer hover:shadow-lg transition-all group" onClick={onClick}>
        {app.cover_image_url && (
          <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
            <img src={app.cover_image_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start gap-3">
            <img
              src={imgError ? fallback : (app.icon_url || fallback)}
              alt={app.app_name}
              className="w-14 h-14 rounded-2xl object-cover shadow-sm"
              onError={() => setImgError(true)}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm truncate">{app.app_name}</h3>
                {app.is_verified && <Shield className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {app.short_description || app.description || 'No description'}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                {(app.rating_count || 0) >= 10 ? (
                  <>
                    <div className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-medium">{(app.rating_average || 0).toFixed(1)}</span>
                    </div>
                    <span className="text-muted-foreground text-[10px]">•</span>
                  </>
                ) : (
                  <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-medium">NEW</Badge>
                )}
                <span className="text-xs text-muted-foreground">{formatCount(app.downloads_count || app.install_count)} {(app.downloads_count || app.install_count || 0) === 1 ? 'install' : 'installs'}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (size === 'compact') {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 cursor-pointer transition-colors" onClick={onClick}>
        <img
          src={imgError ? fallback : (app.icon_url || fallback)}
          alt={app.app_name}
          className="w-12 h-12 rounded-xl object-cover"
          onError={() => setImgError(true)}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-medium text-sm truncate">{app.app_name}</span>
            {app.is_verified && <Shield className="h-3 w-3 text-primary" />}
          </div>
          <p className="text-xs text-muted-foreground truncate">{app.short_description || app.description || ''}</p>
          <div className="flex items-center gap-1 mt-0.5">
            {(app.rating_count || 0) >= 10 ? (
              <>
                <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                <span className="text-[11px]">{(app.rating_average || 0).toFixed(1)}</span>
              </>
            ) : (
              <span className="text-[10px] text-muted-foreground">New</span>
            )}
            <span className="text-[10px] text-muted-foreground ml-1">{formatCount(app.downloads_count || app.install_count)} installs</span>
          </div>
        </div>
        <Button size="sm" variant="outline" className="rounded-full text-xs h-8 px-4">
          Get
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5 cursor-pointer group" onClick={onClick}>
      <div className="relative">
        <img
          src={imgError ? fallback : (app.icon_url || fallback)}
          alt={app.app_name}
          className="w-16 h-16 rounded-2xl object-cover shadow-sm group-hover:shadow-md transition-shadow"
          onError={() => setImgError(true)}
        />
        {app.is_verified && (
          <div className="absolute -bottom-0.5 -right-0.5 bg-primary rounded-full p-0.5">
            <Shield className="h-2.5 w-2.5 text-primary-foreground" />
          </div>
        )}
      </div>
      <span className="text-xs font-medium text-center line-clamp-2 w-16">{app.app_name}</span>
    </div>
  );
});
AppCard.displayName = 'AppCard';

const SectionHeader = ({ title, icon: Icon, onSeeAll }: { title: string; icon: any; onSeeAll?: () => void }) => (
  <div className="flex items-center justify-between px-4 mb-3">
    <div className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="font-bold text-base">{title}</h2>
    </div>
    {onSeeAll && (
      <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={onSeeAll}>
        See all <ChevronRight className="h-3 w-3 ml-0.5" />
      </Button>
    )}
  </div>
);

export default function MiniApps() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [apps, setApps] = useState<StoreApp[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<{ id: string; name: string; icon: string | null }[]>([]);

  useEffect(() => {
    loadApps();
    loadCategories();
  }, []);

  const loadApps = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mini_apps')
        .select('*')
        .eq('is_active', true)
        .order('rating_average', { ascending: false })
        .limit(100);
      if (error) throw error;
      setApps((data as any[]) || []);
    } catch (error) {
      console.error('Error loading apps:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    const { data } = await supabase.from('app_categories').select('*').order('display_order');
    setCategories(data || []);
  };

  // Dedupe by app_name (case-insensitive) to avoid showing the same app twice
  const dedupeByName = (list: StoreApp[]) => {
    const seen = new Set<string>();
    return list.filter(a => {
      const key = a.app_name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const uniqueApps = dedupeByName(apps);
  const featured = dedupeByName(uniqueApps.filter(a => a.is_trending || (a.rating_average && a.rating_average >= 4.5))).slice(0, 6);
  const trending = dedupeByName(uniqueApps.filter(a => a.is_trending)).slice(0, 10);
  const topRated = dedupeByName([...uniqueApps].sort((a, b) => (b.rating_average || 0) - (a.rating_average || 0))).slice(0, 10);

  const filteredApps = apps.filter(app => {
    const matchesSearch = !search || 
      app.app_name.toLowerCase().includes(search.toLowerCase()) ||
      app.description?.toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">CHATR Store</h1>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/store/my-apps')}>
            <Download className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate('/developer-portal')}>
            <Code2 className="h-5 w-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search apps & games"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-full bg-muted/50 border-0"
            />
          </div>
        </div>
      </div>

      {search ? (
        /* Search Results */
        <div className="p-4 space-y-1">
          {filteredApps.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No apps found for "{search}"</p>
            </div>
          ) : (
            filteredApps.map(app => (
              <AppCard key={app.id} app={app} size="compact" onClick={() => navigate(`/store/app/${app.id}`)} />
            ))
          )}
        </div>
      ) : (
        /* Store Home */
        <div className="space-y-6 pt-4">
          {/* Categories */}
          <div>
            <ScrollArea className="w-full">
              <div className="flex gap-2 px-4 pb-2">
                {[{ id: 'all', name: 'All', icon: null }, ...categories].map(cat => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.name ? 'default' : 'secondary'}
                    size="sm"
                    className="rounded-full whitespace-nowrap text-xs"
                    onClick={() => setSelectedCategory(cat.name)}
                  >
                    {cat.icon && <span className="mr-1">{cat.icon}</span>}
                    {cat.name}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>

          {/* Featured Banner */}
          {featured.length > 0 && (
            <div>
              <SectionHeader title="Featured" icon={Sparkles} onSeeAll={() => navigate('/store/explore')} />
              <ScrollArea className="w-full">
                <div className="flex gap-3 px-4 pb-2">
                  {featured.map(app => (
                    <div key={app.id} className="w-[260px] flex-shrink-0">
                      <AppCard app={app} size="large" onClick={() => navigate(`/store/app/${app.id}`)} />
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}

          {/* Trending */}
          {trending.length > 0 && (
            <div>
              <SectionHeader title="Trending Now" icon={TrendingUp} onSeeAll={() => navigate('/store/explore?sort=trending')} />
              <div className="px-4 space-y-1">
                {trending.slice(0, 5).map((app, i) => (
                  <div key={app.id} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6 text-center">{i + 1}</span>
                    <div className="flex-1">
                      <AppCard app={app} size="compact" onClick={() => navigate(`/store/app/${app.id}`)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Rated */}
          {topRated.length > 0 && (
            <div>
              <SectionHeader title="Top Rated" icon={Star} onSeeAll={() => navigate('/store/explore?sort=rating')} />
              <ScrollArea className="w-full">
                <div className="flex gap-4 px-4 pb-2">
                  {topRated.map(app => (
                    <AppCard key={app.id} app={app} size="normal" onClick={() => navigate(`/store/app/${app.id}`)} />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}

          {/* All Apps (when category selected) */}
          {selectedCategory !== 'All' && (
            <div className="px-4 space-y-1">
              <h2 className="font-bold text-base mb-3">{selectedCategory} Apps</h2>
              {apps
                .filter(a => categories.find(c => c.id === a.category_id)?.name === selectedCategory)
                .map(app => (
                  <AppCard key={app.id} app={app} size="compact" onClick={() => navigate(`/store/app/${app.id}`)} />
                ))}
            </div>
          )}

          {/* Quick Links */}
          <div className="px-4 pb-8">
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate('/store/my-apps')}>
                <Download className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-semibold text-sm">My Apps</h3>
                <p className="text-xs text-muted-foreground">Manage installed</p>
              </Card>
              <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => navigate('/store/updates')}>
                <TrendingUp className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-semibold text-sm">Updates</h3>
                <p className="text-xs text-muted-foreground">Check for updates</p>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
