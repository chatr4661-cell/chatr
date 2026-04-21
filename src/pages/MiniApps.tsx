import { useEffect, useState, memo } from 'react';
import { ArrowLeft, Search, Sparkles, TrendingUp, Star, Download, ChevronRight, Code2, ShieldCheck, RefreshCw, Network } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AppIconBadge } from '@/components/store/AppIconBadge';
import { TrustBanner } from '@/components/store/TrustBanner';
import { HeroAppCard } from '@/components/store/HeroAppCard';
import { HowToInstall } from '@/components/store/HowToInstall';
import { InstallConfirmDialog } from '@/components/store/InstallConfirmDialog';

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

const AppCard = memo(({ app, onClick, onInstall, size = 'normal' }: { app: StoreApp; onClick: () => void; onInstall?: () => void; size?: 'normal' | 'large' | 'compact' }) => {
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
            <AppIconBadge name={app.app_name} category={app.category_id} iconUrl={app.icon_url} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm truncate">{app.app_name}</h3>
                {app.is_verified && <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />}
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
                <span className="text-xs text-muted-foreground">{formatCount(app.downloads_count || app.install_count)} installs</span>
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
        <AppIconBadge name={app.app_name} category={app.category_id} iconUrl={app.icon_url} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-medium text-sm truncate">{app.app_name}</span>
            {app.is_verified && <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />}
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
        <Button
          size="sm"
          className="rounded-full text-xs h-8 px-4"
          onClick={(e) => { e.stopPropagation(); (onInstall || onClick)(); }}
        >
          Install
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5 cursor-pointer group" onClick={onClick}>
      <div className="relative">
        <AppIconBadge name={app.app_name} category={app.category_id} iconUrl={app.icon_url} size="lg" className="group-hover:shadow-md transition-shadow" />
        {app.is_verified && (
          <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 rounded-full p-0.5">
            <ShieldCheck className="h-2.5 w-2.5 text-white" />
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
  const [installApp, setInstallApp] = useState<StoreApp | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  useEffect(() => {
    loadApps();
    loadCategories();
    loadUpdateCount();
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

  const loadUpdateCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: installs } = await supabase
      .from('app_installs')
      .select('installed_version, mini_apps:app_id(version)')
      .eq('user_id', user.id)
      .eq('is_active', true) as any;
    const pending = (installs || []).filter((i: any) =>
      i.mini_apps?.version && i.installed_version && i.mini_apps.version !== i.installed_version
    );
    setUpdateCount(pending.length);
  };

  const handleInstallConfirm = async () => {
    if (!installApp) return;
    const app: any = installApp;
    if (app.apk_url) {
      // Trigger actual APK download
      window.location.href = app.apk_url;
      toast({ title: 'Download started', description: `${app.app_name} is downloading securely from CHATR servers.` });
    } else {
      toast({ title: 'Coming soon', description: `${app.app_name} will be available shortly.` });
    }
    setInstallApp(null);
  };

  // Dedupe by app_name (case-insensitive)
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
  const heroApp = uniqueApps.find(a => a.is_trending) || uniqueApps[0];
  const featured = dedupeByName(uniqueApps.filter(a => a !== heroApp && (a.is_trending || (a.rating_average && a.rating_average >= 4.5)))).slice(0, 6);
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
            <p className="text-[10px] text-muted-foreground">Powered by CHATR Network</p>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full relative" onClick={() => navigate('/store/updates')}>
            <RefreshCw className="h-5 w-5" />
            {updateCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                {updateCount}
              </span>
            )}
          </Button>
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
              placeholder="Search verified apps & games"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 rounded-full bg-muted/50 border-0"
            />
          </div>
        </div>
      </div>

      {/* TRUST BANNER (always above content) */}
      {!search && <TrustBanner />}

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
              <AppCard
                key={app.id}
                app={app}
                size="compact"
                onClick={() => navigate(`/store/app/${app.id}`)}
                onInstall={() => setInstallApp(app)}
              />
            ))
          )}
        </div>
      ) : (
        /* Store Home */
        <div className="space-y-6 pt-5">
          {/* HERO SECTION */}
          {heroApp && (
            <HeroAppCard
              app={heroApp}
              onClick={() => navigate(`/store/app/${heroApp.id}`)}
              onInstall={() => setInstallApp(heroApp)}
            />
          )}

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

          {/* Featured Apps */}
          {featured.length > 0 && (
            <div>
              <SectionHeader title="Featured Apps" icon={Sparkles} onSeeAll={() => navigate('/store/explore')} />
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
              <SectionHeader title="Trending" icon={TrendingUp} onSeeAll={() => navigate('/store/explore?sort=trending')} />
              <div className="px-4 space-y-1">
                {trending.slice(0, 5).map((app, i) => (
                  <div key={app.id} className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-6 text-center">{i + 1}</span>
                    <div className="flex-1">
                      <AppCard
                        app={app}
                        size="compact"
                        onClick={() => navigate(`/store/app/${app.id}`)}
                        onInstall={() => setInstallApp(app)}
                      />
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

          {/* Updates shortcut */}
          <div className="px-4">
            <Card
              className="p-4 cursor-pointer hover:bg-accent/40 transition-colors flex items-center gap-3"
              onClick={() => navigate('/store/updates')}
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <RefreshCw className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">Updates</h3>
                <p className="text-xs text-muted-foreground">
                  {updateCount > 0 ? `${updateCount} update${updateCount === 1 ? '' : 's'} available` : 'All apps are up to date'}
                </p>
              </div>
              {updateCount > 0 && <Badge className="rounded-full">{updateCount}</Badge>}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Card>
          </div>

          {/* Selected category list */}
          {selectedCategory !== 'All' && (
            <div className="px-4 space-y-1">
              <h2 className="font-bold text-base mb-3">{selectedCategory} Apps</h2>
              {apps
                .filter(a => categories.find(c => c.id === a.category_id)?.name === selectedCategory)
                .map(app => (
                  <AppCard
                    key={app.id}
                    app={app}
                    size="compact"
                    onClick={() => navigate(`/store/app/${app.id}`)}
                    onInstall={() => setInstallApp(app)}
                  />
                ))}
            </div>
          )}

          {/* How to Install */}
          <HowToInstall />

          {/* Ecosystem footer */}
          <div className="px-4 pb-8">
            <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
              <Network className="h-3 w-3" />
              <span>Powered by CHATR Network</span>
              <span>•</span>
              <span>Works with your CHATR account</span>
            </div>
          </div>
        </div>
      )}

      <InstallConfirmDialog
        open={!!installApp}
        onOpenChange={(o) => !o && setInstallApp(null)}
        app={installApp as any}
        onConfirm={handleInstallConfirm}
      />
    </div>
  );
}
