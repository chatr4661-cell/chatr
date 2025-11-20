import React, { useEffect, useState } from 'react';
import { Search, Grid3x3, List } from 'lucide-react';
import { useChatrOS } from '@/components/ChatrOSProvider';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface InstalledApp {
  id: string;
  appName: string;
  packageName: string;
  version: string;
  iconUrl?: string;
  description?: string;
  isSystemApp: boolean;
}

interface HomeScreenProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ isOpen, onClose }) => {
  const [apps, setApps] = useState<InstalledApp[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { launchApp } = useChatrOS();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadInstalledApps();
    }
  }, [isOpen]);

  const loadInstalledApps = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('chatr_os_apps')
        .select('*')
        .eq('user_id', user.id)
        .order('app_name');

      if (error) throw error;

      setApps(data?.map(app => ({
        id: app.id,
        appName: app.app_name,
        packageName: app.package_name,
        version: app.version,
        iconUrl: undefined,
        description: undefined,
        isSystemApp: app.is_system_app,
      })) || []);
    } catch (error) {
      console.error('Failed to load apps:', error);
    }
  };

  const handleLaunchApp = async (packageName: string) => {
    try {
      await launchApp(packageName);
      toast({
        title: 'App Launched',
        description: `Opening ${packageName}...`,
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Launch Failed',
        description: 'Could not launch app',
        variant: 'destructive',
      });
    }
  };

  const filteredApps = apps.filter(app =>
    app.appName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.packageName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-50">
      <div className="container max-w-6xl mx-auto py-6 px-4 h-full flex flex-col">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">CHATR OS</h1>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search */}
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

        {/* Apps Grid/List */}
        <div className="flex-1 overflow-auto">
          {filteredApps.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No apps installed yet</p>
              <Button variant="outline" className="mt-4" onClick={onClose}>
                Visit App Store
              </Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredApps.map((app) => (
                <Card
                  key={app.id}
                  className="p-4 cursor-pointer hover:border-primary transition-all hover:scale-105"
                  onClick={() => handleLaunchApp(app.packageName)}
                >
                  <div className="aspect-square bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg mb-3 flex items-center justify-center">
                    {app.iconUrl ? (
                      <img src={app.iconUrl} alt={app.appName} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      <span className="text-4xl font-bold text-primary">
                        {app.appName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm truncate">{app.appName}</h3>
                  <p className="text-xs text-muted-foreground truncate">{app.version}</p>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredApps.map((app) => (
                <Card
                  key={app.id}
                  className="p-4 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleLaunchApp(app.packageName)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      {app.iconUrl ? (
                        <img src={app.iconUrl} alt={app.appName} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <span className="text-xl font-bold text-primary">
                          {app.appName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{app.appName}</h3>
                      <p className="text-sm text-muted-foreground truncate">{app.packageName}</p>
                      {app.description && (
                        <p className="text-xs text-muted-foreground truncate mt-1">{app.description}</p>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">{app.version}</div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
