import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Smartphone, Watch, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Capacitor } from '@capacitor/core';

const healthApps = [
  { id: 'apple', name: 'Apple Health', icon: Smartphone, available: true, platform: 'ios' },
  { id: 'google', name: 'Google Fit', icon: Activity, available: true, platform: 'android' },
  { id: 'fitbit', name: 'Fitbit', icon: Watch, available: false, platform: 'all' },
];

interface HealthAppSyncProps {
  onDataSync: (data: any) => void;
}

export function HealthAppSync({ onDataSync }: HealthAppSyncProps) {
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  const handleSync = async (appId: string) => {
    setSyncing(true);
    
    const app = healthApps.find(a => a.id === appId);
    
    toast({
      title: '🔄 Syncing...',
      description: `Connecting to ${app?.name}`,
    });

    try {
      // Native HealthKit / Google Fit integration not yet wired.
      // Refuse to inject fake data — fail explicitly so users aren't misled.
      toast({
        title: 'Health sync not available yet',
        description: 'Native HealthKit / Google Fit integration is coming soon. No demo data will be imported.',
        variant: 'destructive',
      });
    } catch (error) {
      console.error('Health sync error:', error);
      toast({
        title: '❌ Sync Failed',
        description: 'Could not connect to health app. Please check permissions.',
        variant: 'destructive'
      });
    } finally {
      setSyncing(false);
    }
  };

  const filterAppsByPlatform = () => {
    if (!isNative) return healthApps;
    return healthApps.filter(app => 
      app.platform === 'all' || app.platform === platform
    );
  };

  return (
    <Card className="p-4 bg-gradient-card backdrop-blur-glass border-glass-border">
      <h3 className="font-semibold text-foreground mb-3">
        ⌚ Sync with Health Apps
        {!isNative && <span className="text-xs text-muted-foreground ml-2">(Demo mode - use on mobile)</span>}
      </h3>
      <div className="space-y-2">
        {filterAppsByPlatform().map((app) => {
          const Icon = app.icon;
          const isPlatformMatch = app.platform === 'all' || app.platform === platform || !isNative;
          
          return (
            <Button
              key={app.id}
              variant={app.available ? "outline" : "ghost"}
              disabled={!app.available || syncing || (isNative && !isPlatformMatch)}
              onClick={() => handleSync(app.id)}
              className="w-full justify-start gap-3"
            >
              <Icon className="w-4 h-4" />
              {app.name}
              {!app.available && (
                <span className="ml-auto text-xs text-muted-foreground">(Coming Soon)</span>
              )}
              {isNative && !isPlatformMatch && (
                <span className="ml-auto text-xs text-muted-foreground">(Not on {platform})</span>
              )}
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
