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

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Privacy Policy</CardTitle>
            <CardDescription>Last Updated: January 2025</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 text-sm leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold mb-2">1. Information We Collect</h2>
              <p className="mb-2">We collect the following types of information:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Account Information:</strong> Phone number, username, profile photo</li>
                <li><strong>Messages and Content:</strong> Messages, photos, videos, voice notes</li>
                <li><strong>Call Logs and Caller ID Data:</strong> Our application acts as a spam blocker and AI caller identification service. To provide these core features, the app requests access to your device's Call Logs (READ_CALL_LOG). When you receive a phone call, we may securely transmit the incoming phone number, the duration of the call, and whether the call was answered or missed, to our secure backend servers. We also collect the contact name associated with the number if they are in your address book.</li>
                <li><strong>Health Data:</strong> Wellness tracking, mood logs, health metrics (with consent)</li>
                <li><strong>Device Information:</strong> Device type, operating system, IP address</li>
                <li><strong>Usage Data:</strong> App interactions, features used, performance data</li>
                <li><strong>Location Data:</strong> Approximate location for service improvement (with permission)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">2. How We Use Your Information</h2>
              <p className="mb-2">Your information is used to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Provide and maintain our services</li>
                <li>Enable communication between users</li>
                <li>Personalize your experience</li>
                <li>Improve app features and performance</li>
                <li>Send important notifications about service updates</li>
                <li>Detect and prevent fraud or abuse</li>
                <li>Perform real-time spam analysis, assign trust scores to incoming numbers, screen potential scam calls, and build a crowdsourced caller identity database to protect our users from fraud (using Call Log data).</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">3. End-to-End Encryption</h2>
              <p>Your messages and calls are protected with end-to-end encryption. This means only you and the recipient can read or hear them. Chatr cannot access the content of your encrypted messages.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">4. Data Storage and Security</h2>
              <p>We implement industry-standard security measures to protect your data. Your information is stored on secure servers located in India and complies with the Information Technology Act, 2000 and IT Rules 2011.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">5. Data Sharing and Disclosure</h2>
              <p className="mb-2">We do not sell your personal information. Your call event data is securely stored on our servers and is never sold to third-party data brokers or marketing agencies. We may share data only in these cases:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>With your explicit consent</li>
                <li>To comply with legal obligations or court orders</li>
                <li>To protect our rights, safety, or property</li>
                <li>With service providers who assist in operating our app (under strict confidentiality)</li>
                <li>Anonymized scam reports may be aggregated to improve our global spam detection engine.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">6. Your Rights</h2>
              <p className="mb-2">Under Indian law, you have the right to:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Access your personal information</li>
                <li>Correct or update your data</li>
                <li>Delete your account and associated data</li>
                <li>Export your data</li>
                <li>Withdraw consent for data processing</li>
                <li>File a complaint with relevant authorities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">7. Data Retention</h2>
              <p>We retain your data only as long as necessary to provide services or as required by law. You can delete your account at any time, which will remove your personal data from our servers.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">8. Children's Privacy</h2>
              <p>Users under 18 should obtain parental consent before using Chatr. We do not knowingly collect data from children under 13 without parental consent.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">9. Third-Party Services</h2>
              <p>Chatr may integrate with third-party services (e.g., payment gateways, cloud storage). These services have their own privacy policies, and we encourage you to review them.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">10. Cookies and Tracking</h2>
              <p>We use cookies and similar technologies to improve app performance and user experience. You can control cookie settings in your device.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">11. Changes to Privacy Policy</h2>
              <p>We may update this policy from time to time. We will notify you of significant changes through the app or via email.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">12. Grievance Officer</h2>
              <p>As required by Indian IT Rules, our Grievance Officer can be contacted at:</p>
              <p className="mt-1">Talentxcel Services Pvt Ltd</p>
              <p>Email: <a href="mailto:grievance@chatr.chat" className="text-primary underline">grievance@chatr.chat</a></p>
              <p>Response Time: Within 48 hours</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold mb-2">13. Contact Us</h2>
              <p>For privacy-related questions, contact:</p>
              <p className="mt-1">Talentxcel Services Pvt Ltd</p>
              <p>Email: <a href="mailto:privacy@chatr.chat" className="text-primary underline">privacy@chatr.chat</a></p>
              <p>Website: <a href="https://www.chatr.chat/privacy" className="text-primary underline">chatr.chat</a></p>
            </section>

            <p className="text-muted-foreground pt-4 border-t">
              © 2026 Talentxcel Services Pvt Ltd. All rights reserved. <a href="https://www.chatr.chat/privacy" className="text-primary underline">https://www.chatr.chat/privacy</a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
