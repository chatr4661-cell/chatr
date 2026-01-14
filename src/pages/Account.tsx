import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, TrendingUp, Users, Stethoscope, ChevronRight, Wifi, WifiOff, Zap, BarChart3 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useDataSaverMode } from '@/hooks/useDataSaverMode';
import { useNetworkQuality } from '@/hooks/useNetworkQuality';
import { useLiteMode } from '@/hooks/useLiteMode';
import { useDataUsageTracking } from '@/hooks/useDataUsageTracking';
import { useBandwidthEstimation } from '@/hooks/useBandwidthEstimation';
import { ConnectedAccounts } from '@/components/ConnectedAccounts';
import { AppleHeader } from '@/components/ui/AppleHeader';
import { AppleCard, AppleGroupedList, AppleListItem } from '@/components/ui/apple';
import { AppleToggle } from '@/components/ui/AppleToggle';
import { AppleButton } from '@/components/ui/AppleButton';
import { useNativeHaptics } from '@/hooks/useNativeHaptics';

export default function Account() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const haptics = useNativeHaptics();
  const networkQuality = useNetworkQuality();
  const { settings: dataSaverSettings, toggleDataSaver, updateSettings: updateDataSaver } = useDataSaverMode();
  const { settings: liteModeSettings, toggleLiteMode } = useLiteMode();
  const { stats, formatBytes, getSavingsPercentage, resetStats } = useDataUsageTracking();
  const { bandwidth, measuredSpeed, isSlowNetwork } = useBandwidthEstimation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [settings, setSettings] = useState({
    language: 'en',
    theme: 'system',
    data_usage: 'auto',
  });

  useEffect(() => {
    loadSettings();
    
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
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) return;
      
      setUser(currentUser);

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          language: data.language,
          theme: data.theme,
          data_usage: data.data_usage,
        });
      } else {
        await supabase.from('user_settings').insert({ user_id: currentUser.id });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof typeof settings, value: string) => {
    try {
      haptics.light();
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
    return (
      <div className="flex items-center justify-center min-h-screen bg-background safe-area-pt safe-area-pb">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-area-pb">
      {/* Apple-style Header */}
      <AppleHeader
        title="Account Settings"
        onBack={() => navigate('/profile')}
        glass
      />

      <div className="max-w-2xl mx-auto p-4 space-y-6">
        {/* General Settings */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-4 mb-2">
            General Settings
          </h3>
          <AppleGroupedList>
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={settings.language}
                  onValueChange={(value) => updateSetting('language', value)}
                >
                  <SelectTrigger id="language" className="rounded-xl">
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
                  <SelectTrigger id="theme" className="rounded-xl">
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
                  <SelectTrigger id="data-usage" className="rounded-xl">
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
            </div>
          </AppleGroupedList>
        </div>

        {/* Connected Accounts */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-4 mb-2">
            Connected Accounts
          </h3>
          <ConnectedAccounts />
        </div>

        {/* Data Saver Settings */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-4 mb-2">
            Data Saver
          </h3>
          <AppleCard>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {networkQuality === 'slow' ? (
                    <WifiOff className="w-5 h-5 text-orange-500" />
                  ) : (
                    <Wifi className="w-5 h-5 text-primary" />
                  )}
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      Data Saver Mode
                      {networkQuality === 'slow' && (
                        <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                          Slow Network
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">Optimize for slow connections</p>
                  </div>
                </div>
                <AppleToggle
                  checked={dataSaverSettings.enabled}
                  onChange={toggleDataSaver}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Auto-download Media</p>
                  <p className="text-sm text-muted-foreground">
                    {dataSaverSettings.autoDownloadMedia ? 'Images load automatically' : 'Tap to load images'}
                  </p>
                </div>
                <AppleToggle
                  checked={dataSaverSettings.autoDownloadMedia}
                  onChange={(checked) => updateDataSaver({ autoDownloadMedia: checked })}
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
                  <SelectTrigger id="image-quality" className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High (Original)</SelectItem>
                    <SelectItem value="medium">Medium (Compressed)</SelectItem>
                    <SelectItem value="low">Low (Max Compression)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {networkQuality === 'slow' && (
                <div className="bg-orange-50 dark:bg-orange-950/30 rounded-xl p-3 border border-orange-200 dark:border-orange-800">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    <strong>2G Network Detected</strong><br />
                    Data Saver is recommended to improve performance.
                  </p>
                </div>
              )}
            </div>
          </AppleCard>
        </div>

        {/* Lite Mode */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-4 mb-2">
            Lite Mode
          </h3>
          <AppleCard>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      Lite Mode
                      {liteModeSettings.enabled && (
                        <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded-full">
                          Active
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">Minimal UI for slow networks</p>
                  </div>
                </div>
                <AppleToggle
                  checked={liteModeSettings.enabled}
                  onChange={toggleLiteMode}
                />
              </div>

              {liteModeSettings.enabled && (
                <div className="bg-purple-50 dark:bg-purple-950/30 rounded-xl p-3 border border-purple-200 dark:border-purple-800">
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
            </div>
          </AppleCard>
        </div>

        {/* Data Usage Stats */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-4 mb-2">
            Data Usage
          </h3>
          <AppleCard>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-5 h-5 text-blue-500" />
                  <p className="font-semibold">Data Usage</p>
                </div>
                <AppleButton variant="secondary" size="sm" onClick={resetStats}>
                  Reset
                </AppleButton>
              </div>

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

              <div className="bg-blue-50 dark:bg-blue-950/30 rounded-xl p-3 border border-blue-200 dark:border-blue-800">
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
            </div>
          </AppleCard>
        </div>

        {/* Growth & Opportunities */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-4 mb-2">
            Growth Opportunities
          </h3>
          <AppleGroupedList>
            <AppleListItem
              leading={
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-orange-500" />
                </div>
              }
              title="Chatr Champions"
              subtitle="Track referrals & earnings"
              chevron
              onClick={() => {
                haptics.light();
                navigate('/growth');
              }}
            />
            <AppleListItem
              leading={
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-500" />
                </div>
              }
              title="Become an Ambassador"
              subtitle="Join campus network"
              chevron
              onClick={() => {
                haptics.light();
                navigate('/ambassador');
              }}
            />
            <AppleListItem
              leading={
                <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-teal-500" />
                </div>
              }
              title="Healthcare Provider"
              subtitle="Join as a doctor"
              chevron
              onClick={() => {
                haptics.light();
                navigate('/provider-onboarding');
              }}
              last
            />
          </AppleGroupedList>
        </div>
      </div>
    </div>
  );
}
