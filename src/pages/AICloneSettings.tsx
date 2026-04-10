import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bot, MessageSquare, Briefcase, Users, Shield, Zap, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CloneConfig {
  enabled: boolean;
  personality: string;
  greeting: string;
  allowJobInquiries: boolean;
  allowBusinessChats: boolean;
  allowNetworking: boolean;
  responseDelay: number;
  maxResponseLength: number;
  offHoursOnly: boolean;
  blockedTopics: string;
}

const AICloneSettings = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<CloneConfig>({
    enabled: false,
    personality: '',
    greeting: "Hey! I'm currently away but my AI clone can help. What's up?",
    allowJobInquiries: true,
    allowBusinessChats: true,
    allowNetworking: true,
    responseDelay: 3,
    maxResponseLength: 200,
    offHoursOnly: false,
    blockedTopics: '',
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_identities' as any)
      .select('*')
      .eq('user_id', user.id)
      .eq('suffix', 'ai')
      .maybeSingle() as any;

    if (data) {
      setConfig({
        enabled: data.ai_clone_enabled || false,
        personality: data.ai_clone_personality || '',
        greeting: data.bio || "Hey! I'm currently away but my AI clone can help. What's up?",
        allowJobInquiries: true,
        allowBusinessChats: true,
        allowNetworking: true,
        responseDelay: 3,
        maxResponseLength: 200,
        offHoursOnly: false,
        blockedTopics: '',
      });
    }
    setLoading(false);
  };

  const saveConfig = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_identities' as any)
      .update({
        ai_clone_enabled: config.enabled,
        ai_clone_personality: config.personality,
        bio: config.greeting,
      } as any)
      .eq('user_id', user.id)
      .eq('suffix', 'ai') as any;

    if (error) {
      toast.error('Failed to save');
    } else {
      toast.success('AI Clone settings saved!');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Bot className="h-5 w-5" /> AI Clone
            </h1>
            <p className="text-xs text-muted-foreground">Configure your AI identity</p>
          </div>
        </div>
        <Button onClick={saveConfig} disabled={saving} size="sm">
          <Save className="h-4 w-4 mr-1" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Master Toggle */}
        <Card className={config.enabled ? 'border-primary/30 bg-primary/5' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-bold">AI Clone Active</p>
                  <p className="text-xs text-muted-foreground">
                    {config.enabled ? 'Your AI clone is responding when you\'re away' : 'Enable to auto-reply when busy'}
                  </p>
                </div>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Personality */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Personality & Tone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">How should your AI talk?</label>
              <Textarea
                value={config.personality}
                onChange={(e) => setConfig({ ...config, personality: e.target.value })}
                placeholder="Friendly and professional. Uses short sentences. Sometimes adds emoji. Knows tech well."
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Greeting Message</label>
              <Textarea
                value={config.greeting}
                onChange={(e) => setConfig({ ...config, greeting: e.target.value })}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Capabilities */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4" /> What can your clone handle?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { key: 'allowJobInquiries', label: 'Job Inquiries', desc: 'Respond to career-related messages', icon: Briefcase },
              { key: 'allowBusinessChats', label: 'Business Chats', desc: 'Handle work & client messages', icon: MessageSquare },
              { key: 'allowNetworking', label: 'Networking', desc: 'Accept & respond to new connections', icon: Users },
            ].map(({ key, label, desc, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <Switch
                  checked={(config as any)[key]}
                  onCheckedChange={(checked) => setConfig({ ...config, [key]: checked })}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Behavior */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" /> Boundaries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Off-hours only</p>
                <p className="text-xs text-muted-foreground">Only reply when you're offline/away</p>
              </div>
              <Switch
                checked={config.offHoursOnly}
                onCheckedChange={(checked) => setConfig({ ...config, offHoursOnly: checked })}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-2 block">
                Response delay: {config.responseDelay}s
              </label>
              <Slider
                value={[config.responseDelay]}
                onValueChange={([v]) => setConfig({ ...config, responseDelay: v })}
                min={1}
                max={30}
                step={1}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Makes responses feel more human</p>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Topics to avoid (comma-separated)</label>
              <Input
                value={config.blockedTopics}
                onChange={(e) => setConfig({ ...config, blockedTopics: e.target.value })}
                placeholder="politics, religion, personal finances"
              />
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        {config.enabled && (
          <div className="text-center py-4">
            <Badge className="bg-primary/10 text-primary border-primary/20">
              <Bot className="h-3 w-3 mr-1" /> AI Clone is live
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};

export default AICloneSettings;
