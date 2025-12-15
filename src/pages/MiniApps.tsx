import { useEffect, useState, memo } from 'react';
import { ArrowLeft, Search, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { openMiniApp } from '@/utils/androidBridge';
import { useToast } from '@/hooks/use-toast';

interface MiniApp {
  id: string;
  name: string;
  package_name: string;
  web_url: string;
  icon_url: string;
  category: string;
  is_featured: boolean;
}

// Memoized app card to prevent re-renders and flickering
const AppCard = memo(({ app, onClick }: { app: MiniApp; onClick: () => void }) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.name)}&background=random&size=64&bold=true`;

  return (
    <Card
      className="p-4 cursor-pointer hover:bg-accent transition-colors"
      onClick={onClick}
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="relative">
          <div className={`w-16 h-16 rounded-2xl overflow-hidden bg-muted ${!imgLoaded ? 'animate-pulse' : ''}`}>
            <img
              src={imgError ? fallbackUrl : app.icon_url}
              alt={app.name}
              className={`w-full h-full object-contain transition-opacity duration-200 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => {
                if (!imgError) {
                  setImgError(true);
                  setImgLoaded(false);
                }
              }}
              loading="lazy"
            />
          </div>
          {app.is_featured && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center">
              <Sparkles className="h-3 w-3" />
            </Badge>
          )}
        </div>
        <div className="w-full">
          <p className="text-sm font-medium line-clamp-2">{app.name}</p>
          <p className="text-xs text-muted-foreground">{app.category}</p>
        </div>
      </div>
    </Card>
  );
});

AppCard.displayName = 'AppCard';

export default function MiniApps() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [apps, setApps] = useState<MiniApp[]>([]);
  const [filteredApps, setFilteredApps] = useState<MiniApp[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [loading, setLoading] = useState(true);

  const categories = ['All', 'Food', 'Shopping', 'Finance', 'Travel', 'Grocery', 'Fashion', 'Health', 'Services', 'Entertainment'];

  useEffect(() => {
    loadApps();
  }, []);

  useEffect(() => {
    filterApps();
  }, [search, selectedCategory, apps]);

  const loadApps = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('native_apps')
        .select('*')
        .order('is_featured', { ascending: false })
        .order('name');

      if (error) throw error;
      setApps(data || []);
    } catch (error) {
      console.error('Error loading native apps:', error);
      toast({
        title: 'Failed to load apps',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterApps = () => {
    let filtered = apps;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter(app => app.category === selectedCategory);
    }

    if (search) {
      filtered = filtered.filter(app =>
        app.name.toLowerCase().includes(search.toLowerCase()) ||
        app.category.toLowerCase().includes(search.toLowerCase())
      );
    }

    setFilteredApps(filtered);
  };

  const handleAppClick = (app: MiniApp) => {
    openMiniApp(app.package_name, app.web_url);
    toast({
      title: `Opening ${app.name}`,
      description: 'Launching app...',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Mini Apps
            </h1>
            <p className="text-sm text-muted-foreground">
              Launch your favorite Indian apps instantly
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search apps..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="px-4 pb-4 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Apps Grid */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading apps...
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No apps found
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {filteredApps.map((app) => (
              <AppCard key={app.id} app={app} onClick={() => handleAppClick(app)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
