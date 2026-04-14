import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, CheckCircle2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AppUpdates() {
  const navigate = useNavigate();
  const [updates, setUpdates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => { checkUpdates(); }, []);

  const checkUpdates = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/auth'); return; }

    const { data: installs } = await supabase
      .from('app_installs')
      .select('*, mini_apps:app_id(id, app_name, icon_url, version, app_type)')
      .eq('user_id', user.id)
      .eq('is_active', true) as any;

    const pendingUpdates = (installs || []).filter((i: any) => {
      const app = i.mini_apps;
      return app && app.version && i.installed_version && app.version !== i.installed_version;
    });

    setUpdates(pendingUpdates);
    setLoading(false);
  };

  const updateApp = async (install: any) => {
    setUpdating(install.id);
    await new Promise(r => setTimeout(r, 2000)); // Simulate update

    const { error } = await supabase
      .from('app_installs')
      .update({ installed_version: install.mini_apps.version, updated_at: new Date().toISOString() } as any)
      .eq('id', install.id) as any;

    if (!error) {
      setUpdates(prev => prev.filter(u => u.id !== install.id));
      toast.success(`${install.mini_apps.app_name} updated!`);
    }
    setUpdating(null);
  };

  const updateAll = async () => {
    for (const u of updates) {
      await updateApp(u);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-lg border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold flex-1">Updates</h1>
          <Button variant="ghost" size="icon" className="rounded-full" onClick={checkUpdates}>
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-center py-16 text-muted-foreground">Checking for updates…</div>
        ) : updates.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h2 className="font-semibold text-lg mb-1">All apps are up to date</h2>
            <p className="text-sm text-muted-foreground">Last checked just now</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">{updates.length} update{updates.length > 1 ? 's' : ''} available</span>
              <Button size="sm" onClick={updateAll}>Update All</Button>
            </div>
            <div className="space-y-2">
              {updates.map(install => {
                const app = install.mini_apps;
                const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(app.app_name)}&background=6366f1&color=fff&size=48`;
                return (
                  <Card key={install.id} className="p-3">
                    <div className="flex items-center gap-3">
                      <img src={app.icon_url || fallback} alt={app.app_name} className="w-12 h-12 rounded-xl" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm">{app.app_name}</h3>
                        <span className="text-[11px] text-muted-foreground">
                          v{install.installed_version} → v{app.version}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="rounded-full"
                        disabled={updating === install.id}
                        onClick={() => updateApp(install)}
                      >
                        {updating === install.id ? (
                          <div className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                        ) : (
                          'Update'
                        )}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
