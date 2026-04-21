import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Star, Download, Sparkles } from 'lucide-react';
import { AppIconBadge } from '@/components/store/AppIconBadge';

interface HeroAppCardProps {
  app: {
    id: string;
    app_name: string;
    short_description?: string | null;
    description?: string | null;
    icon_url?: string | null;
    category_id?: string | null;
    cover_image_url?: string | null;
    screenshots?: string[] | null;
    rating_average?: number | null;
    rating_count?: number | null;
    install_count?: number | null;
    downloads_count?: number | null;
    is_verified?: boolean | null;
  };
  onInstall: () => void;
  onClick: () => void;
}

const formatCount = (n: number | null | undefined) => {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toString();
};

export const HeroAppCard = ({ app, onInstall, onClick }: HeroAppCardProps) => {
  const screenshots = (app.screenshots || []).slice(0, 2);

  return (
    <Card className="mx-4 overflow-hidden border shadow-md hover:shadow-lg transition-shadow">
      {/* Featured strip */}
      <div className="px-4 py-2 bg-gradient-to-r from-primary/10 to-primary/5 flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-primary" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Editor's Pick</span>
      </div>

      <div className="p-5 cursor-pointer" onClick={onClick}>
        <div className="flex items-start gap-4">
          <AppIconBadge name={app.app_name} category={app.category_id} iconUrl={app.icon_url} size="lg" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-bold text-base truncate">{app.app_name}</h2>
              {app.is_verified && <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {app.short_description || app.description || 'A premium app from the CHATR ecosystem'}
            </p>
            <div className="flex items-center gap-3 mt-2">
              {(app.rating_count || 0) >= 10 ? (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  <span className="text-xs font-medium">{(app.rating_average || 0).toFixed(1)}</span>
                </div>
              ) : (
                <Badge variant="secondary" className="h-4 px-1.5 text-[9px]">NEW</Badge>
              )}
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Download className="h-3 w-3" />
                {formatCount(app.downloads_count || app.install_count)}
              </div>
            </div>
          </div>
        </div>

        {screenshots.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-4">
            {screenshots.map((src, i) => (
              <div key={i} className="aspect-[16/10] rounded-lg overflow-hidden bg-muted">
                <img src={src} alt={`${app.app_name} screenshot ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 pb-5 flex items-center gap-3">
        <Button className="flex-1 gap-2" size="lg" onClick={(e) => { e.stopPropagation(); onInstall(); }}>
          <Download className="h-4 w-4" />
          Install App
        </Button>
        <div className="text-[10px] text-muted-foreground text-right leading-tight">
          <div className="flex items-center gap-1 justify-end">
            <ShieldCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
            Verified
          </div>
          <div>by CHATR</div>
        </div>
      </div>
    </Card>
  );
};
