import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RingtonePickerDialog } from '@/components/RingtonePickerDialog';
import { MediaAutoSaveSettings } from '@/components/settings/MediaAutoSaveSettings';
import { CALL_RINGTONES } from '@/config/ringtones';

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [showRingtonePicker, setShowRingtonePicker] = useState(false);
  const [callRingtone, setCallRingtone] = useState('/ringtone.mp3');
  const [settings, setSettings] = useState({
    push_notifications: true,
    email_notifications: true,
    message_notifications: true,
    call_notifications: true,
  });

  useEffect(() => {
    loadSettings();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('user_settings_notifications')
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
              push_notifications: payload.new.push_notifications ?? true,
              email_notifications: payload.new.email_notifications ?? true,
              message_notifications: payload.new.message_notifications ?? true,
              call_notifications: payload.new.call_notifications ?? true,
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

      // Load user settings
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          push_notifications: data.push_notifications,
          email_notifications: data.email_notifications,
          message_notifications: data.message_notifications,
          call_notifications: data.call_notifications,
        });
      } else {
        // Create default settings
        await supabase.from('user_settings').insert({ user_id: user.id });
      }

      // Load call ringtone from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('call_ringtone')
        .eq('id', user.id)
        .single();
      
      if (profile?.call_ringtone) {
        setCallRingtone(profile.call_ringtone);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof typeof settings, value: boolean) => {
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

  const updateCallRingtone = async (ringtone: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({ call_ringtone: ringtone })
        .eq('id', user.id);

      if (error) throw error;

      setCallRingtone(ringtone);
      toast({ title: 'Call ringtone updated' });
    } catch (error) {
      console.error('Error updating ringtone:', error);
      toast({ title: 'Failed to update ringtone', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/notifications')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Notification Settings</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>Manage how you receive notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive push notifications on your device</p>
              </div>
              <Switch
                id="push"
                checked={settings.push_notifications}
                onCheckedChange={(checked) => updateSetting('push_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications via email</p>
              </div>
              <Switch
                id="email"
                checked={settings.email_notifications}
                onCheckedChange={(checked) => updateSetting('email_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="messages">Message Notifications</Label>
                <p className="text-sm text-muted-foreground">Get notified about new messages</p>
              </div>
              <Switch
                id="messages"
                checked={settings.message_notifications}
                onCheckedChange={(checked) => updateSetting('message_notifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="calls">Call Notifications</Label>
                <p className="text-sm text-muted-foreground">Get notified about incoming calls</p>
              </div>
              <Switch
                id="calls"
                checked={settings.call_notifications}
                onCheckedChange={(checked) => updateSetting('call_notifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Call Ringtone</CardTitle>
            <CardDescription>Choose your preferred call ringtone</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowRingtonePicker(true)}
            >
              <Bell className="h-4 w-4 mr-2" />
              {CALL_RINGTONES.find(r => r.path === callRingtone)?.name || 'Default Ringtone'}
            </Button>
          </CardContent>
        </Card>

        {/* Media Auto-Save Settings */}
        <div className="mt-6">
          <MediaAutoSaveSettings />
        </div>
      </div>

      <RingtonePickerDialog
        open={showRingtonePicker}
        onClose={() => setShowRingtonePicker(false)}
        currentRingtone={callRingtone}
        onSelect={updateCallRingtone}
      />
    </div>
  );
}
