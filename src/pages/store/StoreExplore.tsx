import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Star, Shield, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

const formatCount = (n: number | null) => {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
};

export default function StoreExplore() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [apps, setApps] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState(searchParams.get('sort') || 'rating');
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadApps();
    loadCategories();
  }, [sort, category]);

  const loadApps = async () => {
    setLoading(true);
    let query = supabase.from('mini_apps').select('*').eq('is_active', true);
    
    if (sort === 'rating') query = query.order('rating_average', { ascending: false });
    else if (sort === 'trending') query = query.eq('is_trending', true).order('downloads_count', { ascending: false });
    else if (sort === 'downloads') query = query.order('downloads_count', { ascending: false });
    else query = query.order('created_at', { ascending: false });

    const { data } = await query.limit(200) as any;
    setApps(data || []);
    setLoading(false);
  };

  const loadCategories = async () => {
    const { data } = await supabase.from('app_categories').select('*').order('display_order');
    setCategories(data || []);
  };

  const filtered = apps.filter(app => {
    const matchSearch = !search || app.app_name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'all' || app.category_id === category;
    return matchSearch && matchCat;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold flex-1">Explore Apps</h1>
        </div>
        <div className="px-4 pb-3 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 rounded-full bg-muted/50 border-0" />
          </div>
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-[120px] rounded-full">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rating">Top Rated</SelectItem>
              <SelectItem value="trending">Trending</SelectItem>
              <SelectItem value="downloads">Most Popular</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <ScrollArea className="w-full">
          <div className="flex gap-2 px-4 pb-3">
            <Button variant={category === 'all' ? 'default' : 'secondary'} size="sm" className="rounded-full text-xs" onClick={() => setCategory('all')}>All</Button>
            {categories.map(c => (
              <Button key={c.id} variant={category === c.id ? 'default' : 'secondary'} size="sm" className="rounded-full text-xs whitespace-nowrap" onClick={() => setCategory(c.id)}>
                {c.icon && <span className="mr-1">{c.icon}</span>}{c.name}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="p-4 space-y-1">
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading apps…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">No apps found</div>
        ) : filtered.map(app => {
          const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.app_name)}&background=6366f1&color=fff&size=48`;
          return (
            <div key={app.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => navigate(`/store/app/${app.id}`)}>
              <img src={app.icon_url || fallback} alt={app.app_name} className="w-14 h-14 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-sm truncate">{app.app_name}</span>
                  {app.is_verified && <Shield className="h-3 w-3 text-primary" />}
                </div>
                <p className="text-xs text-muted-foreground truncate">{app.short_description || app.description || ''}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                    <span className="text-[11px]">{(app.rating_average || 0).toFixed(1)}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{formatCount(app.downloads_count || app.install_count)} downloads</span>
                  {app.app_type && <Badge variant="outline" className="text-[9px] h-4">{app.app_type}</Badge>}
                </div>
              </div>
              <Button size="sm" variant="outline" className="rounded-full text-xs h-8 px-4">Get</Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
