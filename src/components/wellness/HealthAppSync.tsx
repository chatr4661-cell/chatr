import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Smartphone, Watch, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

const healthApps = [
  { id: 'apple', name: 'Apple Health', icon: Smartphone, available: true },
  { id: 'google', name: 'Google Fit', icon: Activity, available: true },
  { id: 'fitbit', name: 'Fitbit', icon: Watch, available: false },
];

interface HealthAppSyncProps {
  onDataSync: (data: any) => void;
}

export function HealthAppSync({ onDataSync }: HealthAppSyncProps) {
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const handleSync = async (appId: string) => {
    setSyncing(true);
    
    // Simulate sync - in production, this would call native APIs
    toast({
      title: '🔄 Syncing...',
      description: `Connecting to ${healthApps.find(a => a.id === appId)?.name}`,
    });

    setTimeout(() => {
      // Simulated data
      const mockData = {
        steps: Math.floor(Math.random() * 5000) + 5000,
        heart_rate: Math.floor(Math.random() * 20) + 60,
        sleep_hours: (Math.random() * 2 + 6).toFixed(1),
      };

      onDataSync(mockData);
      setSyncing(false);
      
      toast({
        title: '✅ Sync Complete',
        description: 'Your health data has been imported successfully!',
      });
    }, 2000);
  };

  return (
    <Card className="p-4 bg-gradient-card backdrop-blur-glass border-glass-border">
      <h3 className="font-semibold text-foreground mb-3">⌚ Sync with Health Apps</h3>
      <div className="space-y-2">
        {healthApps.map((app) => {
          const Icon = app.icon;
          return (
            <Button
              key={app.id}
              variant={app.available ? "outline" : "ghost"}
              disabled={!app.available || syncing}
              onClick={() => handleSync(app.id)}
              className="w-full justify-start gap-3"
            >
              <Icon className="w-4 h-4" />
              {app.name}
              {!app.available && (
                <span className="ml-auto text-xs text-muted-foreground">(Coming Soon)</span>
              )}
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
