import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, TrendingUp, Users, Stethoscope, ChevronRight, Wifi, WifiOff, Zap, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDataSaverMode } from '@/hooks/useDataSaverMode';
import { useNetworkQuality } from '@/hooks/useNetworkQuality';
import { useLiteMode } from '@/hooks/useLiteMode';
import { useDataUsageTracking } from '@/hooks/useDataUsageTracking';
import { useBandwidthEstimation } from '@/hooks/useBandwidthEstimation';

export default function Account() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const networkQuality = useNetworkQuality();
  const { settings: dataSaverSettings, toggleDataSaver, updateSettings: updateDataSaver } = useDataSaverMode();
  const { settings: liteModeSettings, toggleLiteMode } = useLiteMode();
  const { stats, formatBytes, getSavingsPercentage, resetStats } = useDataUsageTracking();
  const { bandwidth, measuredSpeed, isSlowNetwork } = useBandwidthEstimation();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    language: 'en',
    theme: 'system',
    data_usage: 'auto',
  });

  useEffect(() => {
    loadSettings();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('user_settings_account')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_settings',
        },
        (payload: any) => {
          if (payload.new) {
            setSettings({
              language: payload.new.language ?? 'en',
              theme: payload.new.theme ?? 'system',
              data_usage: payload.new.data_usage ?? 'auto',
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          language: data.language,
          theme: data.theme,
          data_usage: data.data_usage,
        });
      } else {
        // Create default settings
        await supabase.from('user_settings').insert({ user_id: user.id });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof typeof settings, value: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_settings')
        .update({ [key]: value })
        .eq('user_id', user.id);

      if (error) throw error;

      setSettings(prev => ({ ...prev, [key]: value }));
      toast({ title: 'Settings updated' });
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({ title: 'Failed to update settings', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Native Header */}
      <div className="sticky top-0 z-10 bg-white border-b">
        <div className="flex items-center gap-2 p-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')} className="h-9 w-9 rounded-full hover:bg-muted/50 active:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Account Settings</h1>
        </div>
      </div>
      <div className="max-w-2xl mx-auto p-3">

        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Manage your account preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                value={settings.language}
                onValueChange={(value) => updateSetting('language', value)}
              >
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                value={settings.theme}
                onValueChange={(value) => updateSetting('theme', value)}
              >
                <SelectTrigger id="theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="data-usage">Data Usage</Label>
              <Select
                value={settings.data_usage}
                onValueChange={(value) => updateSetting('data_usage', value)}
              >
                <SelectTrigger id="data-usage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  <SelectItem value="wifi">WiFi Only</SelectItem>
                  <SelectItem value="always">Always</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Control when to download media and updates
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data Saver Settings - 2G Optimization */}
        <Card className="mt-6 border-2 border-orange-200/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {networkQuality === 'slow' ? (
                    <WifiOff className="w-5 h-5 text-orange-500" />
                  ) : (
                    <Wifi className="w-5 h-5 text-primary" />
                  )}
                  Data Saver Mode
                  {networkQuality === 'slow' && (
                    <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                      Slow Network
                    </span>
                  )}
                </CardTitle>
                <CardDescription>Optimize for slow connections (2G/3G)</CardDescription>
              </div>
              <Switch
                checked={dataSaverSettings.enabled}
                onCheckedChange={toggleDataSaver}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-download Media</Label>
                <p className="text-sm text-muted-foreground">
                  {dataSaverSettings.autoDownloadMedia ? 'Images load automatically' : 'Tap to load images'}
                </p>
              </div>
              <Switch
                checked={dataSaverSettings.autoDownloadMedia}
                onCheckedChange={(checked) => updateDataSaver({ autoDownloadMedia: checked })}
                disabled={!dataSaverSettings.enabled}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="image-quality">Image Quality</Label>
              <Select
                value={dataSaverSettings.imageQuality}
                onValueChange={(value: 'high' | 'medium' | 'low') => updateDataSaver({ imageQuality: value })}
                disabled={!dataSaverSettings.enabled}
              >
                <SelectTrigger id="image-quality">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High (Original)</SelectItem>
                  <SelectItem value="medium">Medium (Compressed)</SelectItem>
                  <SelectItem value="low">Low (Max Compression)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Lower quality reduces data usage
              </p>
            </div>

            {networkQuality === 'slow' && (
              <div className="bg-orange-50 dark:bg-orange-950/30 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <strong>2G Network Detected</strong><br />
                  Data Saver is recommended to improve performance and reduce data usage.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lite Mode - Extreme 2G Optimization */}
        <Card className="mt-6 border-2 border-purple-200/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-500" />
                  Lite Mode
                  {liteModeSettings.enabled && (
                    <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </CardTitle>
                <CardDescription>Minimal UI for extremely slow networks</CardDescription>
              </div>
              <Switch
                checked={liteModeSettings.enabled}
                onCheckedChange={toggleLiteMode}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground mb-3">
              Lite Mode removes all non-essential features for maximum speed on 2G networks.
            </p>
            
            {liteModeSettings.enabled && (
              <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>Images disabled (tap to load)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>Animations disabled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>Reduced polling frequency</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Usage Stats */}
        <Card className="mt-6 border-2 border-blue-200/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Data Usage
              </CardTitle>
              <Button variant="outline" size="sm" onClick={resetStats}>
                Reset
              </Button>
            </div>
            <CardDescription>Monitor your data consumption</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Used</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatBytes(stats.totalBytes)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">This Session</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatBytes(stats.sessionBytes)}
                </p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Media</span>
                <span className="font-medium">{formatBytes(stats.mediaBytes)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Messages</span>
                <span className="font-medium">{formatBytes(stats.messageBytes)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cached (Saved)</span>
                <span className="font-medium text-primary">
                  {formatBytes(stats.cachedBytes)} ({getSavingsPercentage().toFixed(0)}%)
                </span>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Network Speed</p>
                  <p className="text-xs text-muted-foreground">
                    {bandwidth.effectiveType.toUpperCase()} • RTT: {bandwidth.rtt}ms
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {measuredSpeed ? `${measuredSpeed.toFixed(2)} Mbps` : 'Testing...'}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {bandwidth.estimatedSpeed.replace('-', ' ')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Growth & Opportunities Section */}
        <Card className="mt-6 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background overflow-hidden">
          <CardHeader className="relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl -z-10" />
            <CardTitle className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Growth Opportunities
              </span>
              <span className="text-xs bg-gradient-to-r from-amber-500 to-orange-500 text-white px-2 py-1 rounded-full font-bold animate-pulse">
                Earn Money
              </span>
            </CardTitle>
            <CardDescription>Grow with Chatr and unlock rewards</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Growth Hub */}
            <button
              onClick={() => navigate('/growth')}
              className="w-full group bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-xl p-4 border-2 border-orange-200/50 dark:border-orange-800/50 hover:border-orange-400 dark:hover:border-orange-600 transition-all hover:shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-orange-400 to-red-500 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    Chatr Champions
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                      Earn ₹
                    </span>
                  </h3>
                  <p className="text-sm text-muted-foreground">Track referrals & earnings</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-orange-500 transition-colors" />
              </div>
            </button>

            {/* Ambassador Program */}
            <button
              onClick={() => navigate('/ambassador-program')}
              className="w-full group bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-xl p-4 border-2 border-purple-200/50 dark:border-purple-800/50 hover:border-purple-400 dark:hover:border-purple-600 transition-all hover:shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-purple-400 to-pink-500 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    Chatr Partner
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                      Apply
                    </span>
                  </h3>
                  <p className="text-sm text-muted-foreground">Join our campus team</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-purple-500 transition-colors" />
              </div>
            </button>

            {/* Doctor Onboarding */}
            <button
              onClick={() => navigate('/doctor-onboarding')}
              className="w-full group bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30 rounded-xl p-4 border-2 border-cyan-200/50 dark:border-cyan-800/50 hover:border-cyan-400 dark:hover:border-cyan-600 transition-all hover:shadow-lg"
            >
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-cyan-400 to-blue-500 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-bold text-foreground flex items-center gap-2">
                    Doctor Portal
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                      Join
                    </span>
                  </h3>
                  <p className="text-sm text-muted-foreground">Healthcare provider registration</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-cyan-500 transition-colors" />
              </div>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
