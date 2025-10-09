import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Privacy() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    profile_visibility: 'everyone',
    last_seen_visibility: 'everyone',
    read_receipts: true,
    typing_indicators: true,
  });

  useEffect(() => {
    loadSettings();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('user_settings_privacy')
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
              profile_visibility: payload.new.profile_visibility ?? 'everyone',
              last_seen_visibility: payload.new.last_seen_visibility ?? 'everyone',
              read_receipts: payload.new.read_receipts ?? true,
              typing_indicators: payload.new.typing_indicators ?? true,
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
          profile_visibility: data.profile_visibility,
          last_seen_visibility: data.last_seen_visibility,
          read_receipts: data.read_receipts,
          typing_indicators: data.typing_indicators,
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

  const updateSetting = async (key: keyof typeof settings, value: string | boolean) => {
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Privacy & Security</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Privacy Settings</CardTitle>
            <CardDescription>Control who can see your information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="profile-visibility">Profile Visibility</Label>
              <Select
                value={settings.profile_visibility}
                onValueChange={(value) => updateSetting('profile_visibility', value)}
              >
                <SelectTrigger id="profile-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="contacts">Contacts Only</SelectItem>
                  <SelectItem value="nobody">Nobody</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="last-seen">Last Seen</Label>
              <Select
                value={settings.last_seen_visibility}
                onValueChange={(value) => updateSetting('last_seen_visibility', value)}
              >
                <SelectTrigger id="last-seen">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="contacts">Contacts Only</SelectItem>
                  <SelectItem value="nobody">Nobody</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="read-receipts">Read Receipts</Label>
                <p className="text-sm text-muted-foreground">Let others know when you've read their messages</p>
              </div>
              <Switch
                id="read-receipts"
                checked={settings.read_receipts}
                onCheckedChange={(checked) => updateSetting('read_receipts', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="typing">Typing Indicators</Label>
                <p className="text-sm text-muted-foreground">Show when you're typing</p>
              </div>
              <Switch
                id="typing"
                checked={settings.typing_indicators}
                onCheckedChange={(checked) => updateSetting('typing_indicators', checked)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
