import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Shield, Share2, Download, ChevronRight, ExternalLink, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const formatCount = (n: number | null) => {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
};

const formatSize = (bytes: number | null) => {
  if (!bytes) return 'N/A';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
};

export default function AppDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadApp();
      checkInstalled();
      loadReviews();
    }
  }, [id]);

  const loadApp = async () => {
    const { data, error } = await supabase
      .from('mini_apps')
      .select('*')
      .eq('id', id)
      .single() as any;
    if (!error) setApp(data);
    setLoading(false);
  };

  const checkInstalled = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('app_installs')
      .select('id')
      .eq('user_id', user.id)
      .eq('app_id', id!)
      .maybeSingle() as any;
    setInstalled(!!data);
  };

  const loadReviews = async () => {
    const { data } = await supabase
      .from('app_reviews')
      .select('*, profiles:user_id(username, avatar_url)')
      .eq('app_id', id!)
      .order('created_at', { ascending: false })
      .limit(10) as any;
    setReviews(data || []);
  };

  const handleInstall = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('Please sign in to install apps');
      navigate('/auth');
      return;
    }

    setInstalling(true);
    
    // Simulate secure install flow
    await new Promise(r => setTimeout(r, 1500));

    const { error } = await supabase
      .from('app_installs')
      .upsert({
        user_id: user.id,
        app_id: id!,
        installed_version: app?.version || '1.0.0',
        device_type: /Android/i.test(navigator.userAgent) ? 'android' : 'web',
      } as any);

    if (error) {
      toast.error('Installation failed');
    } else {
      // Increment downloads
      await supabase
        .from('mini_apps')
        .update({ downloads_count: (app?.downloads_count || 0) + 1 } as any)
        .eq('id', id!) as any;

      setInstalled(true);
      toast.success(`${app?.app_name} installed successfully!`);
    }
    setInstalling(false);
  };

  const handleOpen = () => {
    if (app?.app_url) {
      window.open(app.app_url, '_blank');
    } else if (app?.apk_url) {
      toast.info('Opening app...');
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: app?.app_name,
        text: app?.short_description || app?.description,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">App not found</p>
        <Button onClick={() => navigate('/native-apps')}>Back to Store</Button>
      </div>
    );
  }

  const ratingDistribution = [5, 4, 3, 2, 1].map(r => ({
    star: r,
    count: reviews.filter(rev => rev.rating === r).length,
    pct: reviews.length ? (reviews.filter(rev => rev.rating === r).length / reviews.length) * 100 : 0,
  }));

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="icon" className="rounded-full" onClick={handleShare}>
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* App Info */}
      <div className="p-4">
        <div className="flex items-start gap-4">
          <img
            src={app.icon_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(app.app_name)}&background=6366f1&color=fff&size=96`}
            alt={app.app_name}
            className="w-20 h-20 rounded-[20px] shadow-lg"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold">{app.app_name}</h1>
            <div className="flex items-center gap-1.5 mt-1">
              {app.is_verified && (
                <Badge variant="secondary" className="text-[10px] gap-0.5">
                  <Shield className="h-3 w-3" /> Verified
                </Badge>
              )}
              {app.app_type && (
                <Badge variant="outline" className="text-[10px]">
                  {app.app_type === 'android' ? '📱 Android' : app.app_type === 'pwa' ? '🌐 PWA' : '⚡ Web'}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-around mt-6 py-3 bg-muted/30 rounded-2xl">
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-bold">{(app.rating_average || 0).toFixed(1)}</span>
            </div>
            <span className="text-[10px] text-muted-foreground">{formatCount(app.rating_count)} reviews</span>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="text-center">
            <span className="font-bold">{formatCount(app.downloads_count || app.install_count)}</span>
            <p className="text-[10px] text-muted-foreground">Downloads</p>
          </div>
          <Separator orientation="vertical" className="h-8" />
          <div className="text-center">
            <span className="font-bold text-sm">{formatSize(app.file_size_bytes)}</span>
            <p className="text-[10px] text-muted-foreground">Size</p>
          </div>
        </div>

        {/* Install Button */}
        <div className="mt-4">
          {installed ? (
            <div className="flex gap-2">
              <Button className="flex-1 rounded-full h-12 text-base font-semibold" onClick={handleOpen}>
                Open
              </Button>
              <Button variant="outline" className="rounded-full h-12" onClick={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  await supabase.from('app_installs').delete().eq('user_id', user.id).eq('app_id', id!) as any;
                  setInstalled(false);
                  toast.success('App uninstalled');
                }
              }}>
                Uninstall
              </Button>
            </div>
          ) : (
            <Button
              className="w-full rounded-full h-12 text-base font-semibold"
              onClick={handleInstall}
              disabled={installing}
            >
              {installing ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                  Preparing secure install…
                </span>
              ) : (
                'Install'
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Screenshots */}
      {app.screenshots && app.screenshots.length > 0 && (
        <div className="mt-4">
          <h2 className="font-semibold text-base px-4 mb-2">Screenshots</h2>
          <ScrollArea className="w-full">
            <div className="flex gap-3 px-4 pb-2">
              {app.screenshots.map((url: string, i: number) => (
                <img
                  key={i}
                  src={url}
                  alt={`Screenshot ${i + 1}`}
                  className="h-48 w-auto rounded-xl shadow-sm object-cover"
                />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}

      {/* Description */}
      <div className="p-4 mt-2">
        <h2 className="font-semibold text-base mb-2">About this app</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {app.description || 'No description available.'}
        </p>
        {app.tags && app.tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mt-3">
            {app.tags.map((tag: string) => (
              <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Ratings & Reviews */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-base">Ratings & Reviews</h2>
          <Button variant="ghost" size="sm" className="text-xs text-primary">
            Write a review <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </div>

        <div className="flex gap-6 mb-4">
          <div className="text-center">
            <div className="text-5xl font-bold">{(app.rating_average || 0).toFixed(1)}</div>
            <div className="flex gap-0.5 justify-center mt-1">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(app.rating_average || 0) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
              ))}
            </div>
            <span className="text-xs text-muted-foreground mt-1 block">{formatCount(app.rating_count)} reviews</span>
          </div>
          <div className="flex-1 space-y-1">
            {ratingDistribution.map(r => (
              <div key={r.star} className="flex items-center gap-2">
                <span className="text-xs w-2">{r.star}</span>
                <Progress value={r.pct} className="h-2 flex-1" />
              </div>
            ))}
          </div>
        </div>

        {/* Review List */}
        <div className="space-y-4">
          {reviews.slice(0, 5).map(review => (
            <Card key={review.id} className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">
                  {(review.profiles as any)?.username?.[0] || 'U'}
                </div>
                <span className="text-sm font-medium">{(review.profiles as any)?.username || 'User'}</span>
                <div className="flex gap-0.5 ml-auto">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} className={`h-3 w-3 ${s <= (review.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20'}`} />
                  ))}
                </div>
              </div>
              {review.review_text && <p className="text-xs text-muted-foreground">{review.review_text}</p>}
            </Card>
          ))}
        </div>
      </div>

      {/* App Info Footer */}
      <div className="p-4">
        <h2 className="font-semibold text-base mb-3">App info</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span>{app.version || '1.0.0'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span>{app.app_type === 'android' ? 'Android App' : app.app_type === 'pwa' ? 'PWA' : 'Web App'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Size</span>
            <span>{formatSize(app.file_size_bytes)}</span>
          </div>
          {app.privacy_policy_url && (
            <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => window.open(app.privacy_policy_url, '_blank')}>
              Privacy Policy <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
