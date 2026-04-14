import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Trash2, ExternalLink, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function MyApps() {
  const navigate = useNavigate();
  const [installs, setInstalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadInstalls(); }, []);

  const loadInstalls = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/auth'); return; }

    const { data } = await supabase
      .from('app_installs')
      .select('*, mini_apps:app_id(app_name, icon_url, version, app_type, app_url, is_verified)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('installed_at', { ascending: false }) as any;

    setInstalls(data || []);
    setLoading(false);
  };

  const uninstall = async (installId: string, appName: string) => {
    await supabase.from('app_installs').delete().eq('id', installId) as any;
    setInstalls(prev => prev.filter(i => i.id !== installId));
    toast.success(`${appName} uninstalled`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold flex-1">My Apps</h1>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={loadInstalls}>
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Loading your apps…</div>
        ) : installs.length === 0 ? (
          <div className="text-center py-16">
            <Download className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="font-semibold text-lg mb-1">No apps installed</h2>
            <p className="text-sm text-muted-foreground mb-4">Discover apps in the CHATR Store</p>
            <Button onClick={() => navigate('/native-apps')}>Browse Store</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {installs.map(install => {
              const app = install.mini_apps as any;
              if (!app) return null;
              const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.app_name)}&background=6366f1&color=fff&size=48`;
              const hasUpdate = app.version && install.installed_version && app.version !== install.installed_version;

              return (
                <Card key={install.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={app.icon_url || fallback}
                      alt={app.app_name}
                      className="w-12 h-12 rounded-xl object-cover cursor-pointer"
                      onClick={() => navigate(`/store/app/${install.app_id}`)}
                    />
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate(`/store/app/${install.app_id}`)}>
                      <h3 className="font-medium text-sm truncate">{app.app_name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">v{install.installed_version || '1.0'}</span>
                        {hasUpdate && (
                          <Badge variant="destructive" className="text-[9px] h-4">Update available</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {app.app_url && (
                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => window.open(app.app_url, '_blank')}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive" onClick={() => uninstall(install.id, app.app_name)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
