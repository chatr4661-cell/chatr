import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Smartphone, Watch, Activity, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

/**
 * Optional native bridge. If a device build ships a HealthData plugin
 * (HealthKit on iOS / Health Connect on Android) it will be used; otherwise
 * we fall back to a manual quick-entry that still persists real data.
 */
interface HealthDataPluginShape {
  isAvailable(): Promise<{ available: boolean }>;
  requestAuthorization(): Promise<{ granted: boolean }>;
  readToday(): Promise<{ steps?: number; heartRate?: number; sleepHours?: number; weightKg?: number }>;
}

const HealthDataPlugin = Capacitor.isNativePlatform()
  ? registerPlugin<HealthDataPluginShape>('HealthData')
  : null;

const healthApps = [
  { id: 'apple', name: 'Apple Health', icon: Smartphone, source: 'apple_health', platform: 'ios' },
  { id: 'google', name: 'Google Fit', icon: Activity, source: 'google_fit', platform: 'android' },
  { id: 'fitbit', name: 'Fitbit', icon: Watch, source: 'device', platform: 'all' },
];

interface HealthAppSyncProps {
  onDataSync: (data: any) => void;
}

type ManualVitals = { steps: string; heartRate: string; sleepHours: string; weightKg: string };

export function HealthAppSync({ onDataSync }: HealthAppSyncProps) {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualSource, setManualSource] = useState<string>('manual');
  const [manual, setManual] = useState<ManualVitals>({ steps: '', heartRate: '', sleepHours: '', weightKg: '' });
  const { toast } = useToast();
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  const persistVitals = async (
    source: string,
    vitals: Array<{ type: string; value: number | Record<string, any>; notes?: string }>
  ) => {
    if (vitals.length === 0) {
      toast({ title: 'Nothing to sync', description: 'No values provided.', variant: 'destructive' });
      return false;
    }
    const { data, error } = await supabase.functions.invoke('sync-health-data', {
      body: { source, vitals: vitals.map((v) => ({ ...v, recorded_at: new Date().toISOString() })) },
    });
    if (error) throw error;
    onDataSync(data);
    toast({
      title: '✅ Health data synced',
      description: data?.coins_earned ? `${vitals.length} vitals saved • +${data.coins_earned} coins` : `${vitals.length} vitals saved`,
    });
    return true;
  };

  const handleSync = async (appId: string) => {
    const app = healthApps.find((a) => a.id === appId);
    if (!app) return;

    // Try native read first
    if (isNative && HealthDataPlugin) {
      setSyncing(appId);
      try {
        const avail = await HealthDataPlugin.isAvailable();
        if (avail.available) {
          const auth = await HealthDataPlugin.requestAuthorization();
          if (!auth.granted) {
            toast({ title: 'Permission needed', description: 'Allow health access to sync.', variant: 'destructive' });
            return;
          }
          const reading = await HealthDataPlugin.readToday();
          const vitals: Array<{ type: string; value: number }> = [];
          if (reading.steps != null) vitals.push({ type: 'steps', value: reading.steps });
          if (reading.heartRate != null) vitals.push({ type: 'heart_rate', value: reading.heartRate });
          if (reading.sleepHours != null) vitals.push({ type: 'sleep', value: reading.sleepHours });
          if (reading.weightKg != null) vitals.push({ type: 'weight', value: reading.weightKg });
          await persistVitals(app.source, vitals);
          return;
        }
      } catch (err) {
        console.error('Native health sync failed, falling back to manual:', err);
      } finally {
        setSyncing(null);
      }
    }

    // Fallback: manual quick-entry (persists real values)
    setManualSource(app.source);
    setManual({ steps: '', heartRate: '', sleepHours: '', weightKg: '' });
    setManualOpen(true);
  };

  const submitManual = async () => {
    setSyncing('manual');
    try {
      const vitals: Array<{ type: string; value: number }> = [];
      if (manual.steps) vitals.push({ type: 'steps', value: Number(manual.steps) });
      if (manual.heartRate) vitals.push({ type: 'heart_rate', value: Number(manual.heartRate) });
      if (manual.sleepHours) vitals.push({ type: 'sleep', value: Number(manual.sleepHours) });
      if (manual.weightKg) vitals.push({ type: 'weight', value: Number(manual.weightKg) });
      const ok = await persistVitals(manualSource, vitals);
      if (ok) setManualOpen(false);
    } catch (err) {
      console.error('Manual sync error:', err);
      toast({ title: '❌ Sync failed', description: 'Could not save your vitals.', variant: 'destructive' });
    } finally {
      setSyncing(null);
    }
  };

  const filterAppsByPlatform = () => {
    if (!isNative) return healthApps;
    return healthApps.filter((app) => app.platform === 'all' || app.platform === platform);
  };

  return (
    <Card className="p-4 bg-gradient-card backdrop-blur-glass border-glass-border">
      <h3 className="font-semibold text-foreground mb-3">⌚ Sync with Health Apps</h3>
      <div className="space-y-2">
        {filterAppsByPlatform().map((app) => {
          const Icon = app.icon;
          return (
            <Button
              key={app.id}
              variant="outline"
              disabled={syncing !== null}
              onClick={() => handleSync(app.id)}
              className="w-full justify-start gap-3"
            >
              {syncing === app.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Icon className="w-4 h-4" />}
              {app.name}
            </Button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        Connects to your device health data. If automatic sync isn't available, you can log today's vitals manually.
      </p>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Today's Vitals</DialogTitle>
            <DialogDescription>Enter the values you'd like to sync. Leave blank to skip a field.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="steps">Steps</Label>
              <Input id="steps" type="number" inputMode="numeric" placeholder="8000"
                value={manual.steps} onChange={(e) => setManual((s) => ({ ...s, steps: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hr">Heart rate (bpm)</Label>
              <Input id="hr" type="number" inputMode="numeric" placeholder="72"
                value={manual.heartRate} onChange={(e) => setManual((s) => ({ ...s, heartRate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sleep">Sleep (hours)</Label>
              <Input id="sleep" type="number" inputMode="decimal" placeholder="7.5"
                value={manual.sleepHours} onChange={(e) => setManual((s) => ({ ...s, sleepHours: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input id="weight" type="number" inputMode="decimal" placeholder="70"
                value={manual.weightKg} onChange={(e) => setManual((s) => ({ ...s, weightKg: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualOpen(false)} disabled={syncing === 'manual'}>Cancel</Button>
            <Button onClick={submitManual} disabled={syncing === 'manual'}>
              {syncing === 'manual' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Sync
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
