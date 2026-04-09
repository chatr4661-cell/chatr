import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Briefcase, Lock, Bot, Shield, Globe, Settings, Copy, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useIdentity } from '@/hooks/useIdentity';
import { useTrustScore } from '@/hooks/useTrustScore';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const identityIcons: Record<string, React.ReactNode> = {
  personal: <User className="h-5 w-5" />,
  business: <Briefcase className="h-5 w-5" />,
  private: <Lock className="h-5 w-5" />,
  ai_clone: <Bot className="h-5 w-5" />,
};

const identityColors: Record<string, string> = {
  personal: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  business: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  private: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  ai_clone: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
};

const Identity = () => {
  const navigate = useNavigate();
  const { identities, handle, loading, claimHandle, updateIdentity, discoveryProfile, updateDiscoveryProfile } = useIdentity();
  const { fetchTrustProfile } = useTrustScore();
  const [newHandle, setNewHandle] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [selectedIdentity, setSelectedIdentity] = useState<string | null>(null);
  const [trustProfile, setTrustProfile] = useState<any>(null);

  React.useEffect(() => {
    const loadTrust = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const tp = await fetchTrustProfile(user.id);
        setTrustProfile(tp);
      }
    };
    loadTrust();
  }, [fetchTrustProfile]);

  const handleClaimHandle = async () => {
    if (!newHandle.trim() || newHandle.length < 3) {
      toast.error('Handle must be at least 3 characters');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(newHandle)) {
      toast.error('Only letters, numbers, and underscores allowed');
      return;
    }
    setClaiming(true);
    await claimHandle(newHandle.trim());
    setClaiming(false);
  };

  const copyHandle = (fullHandle: string) => {
    navigator.clipboard.writeText(fullHandle);
    toast.success('Copied!');
  };

  const selectedId = identities.find(i => i.id === selectedIdentity);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold">CHATR++ Identity</h1>
          <p className="text-xs text-muted-foreground">Your multi-layer identity system</p>
        </div>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* Handle Claim Section */}
        {!handle ? (
          <Card className="border-2 border-dashed border-primary/30">
            <CardContent className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Claim Your CHATR ID</h2>
              <p className="text-sm text-muted-foreground">
                Choose a unique handle. This creates 4 identity layers automatically.
              </p>
              <div className="flex gap-2 max-w-sm mx-auto">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                  <Input
                    value={newHandle}
                    onChange={(e) => setNewHandle(e.target.value.toLowerCase())}
                    placeholder="yourname"
                    className="pl-8"
                    maxLength={30}
                  />
                </div>
                <Button onClick={handleClaimHandle} disabled={claiming || !newHandle.trim()}>
                  {claiming ? 'Claiming...' : 'Claim'}
                </Button>
              </div>
              {newHandle && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>This will create:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Badge variant="outline">@{newHandle}</Badge>
                    <Badge variant="outline">@{newHandle}.work</Badge>
                    <Badge variant="outline">@{newHandle}.private</Badge>
                    <Badge variant="outline">@{newHandle}.ai</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Shareable CHATR ID */}
            <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Your CHATR ID</p>
                    <p className="text-lg font-bold font-mono">chatr.me/{handle}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={() => copyHandle(`chatr.me/${handle}`)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Trust Score Card */}
            {trustProfile && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center border-2" 
                           style={{ borderColor: trustProfile.tier === 'safe' ? '#22c55e' : trustProfile.tier === 'unknown' ? '#eab308' : '#ef4444' }}>
                        <span className="text-lg">{trustProfile.emoji}</span>
                      </div>
                      <div>
                        <p className="font-bold text-lg">{trustProfile.score}% Trusted</p>
                        <p className="text-xs text-muted-foreground capitalize">{trustProfile.level} • {trustProfile.tier}</p>
                      </div>
                    </div>
                    <Shield className={`h-6 w-6 ${trustProfile.color}`} />
                  </div>
                  <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all"
                      style={{ 
                        width: `${trustProfile.score}%`,
                        backgroundColor: trustProfile.tier === 'safe' ? '#22c55e' : trustProfile.tier === 'unknown' ? '#eab308' : '#ef4444'
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Identity Cards */}
            <Tabs defaultValue="identities">
              <TabsList className="w-full">
                <TabsTrigger value="identities" className="flex-1">Identities</TabsTrigger>
                <TabsTrigger value="discovery" className="flex-1">Discovery</TabsTrigger>
                <TabsTrigger value="privacy" className="flex-1">Privacy</TabsTrigger>
              </TabsList>

              <TabsContent value="identities" className="space-y-3 mt-4">
                {identities.map((identity) => (
                  <Card 
                    key={identity.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${selectedIdentity === identity.id ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => setSelectedIdentity(selectedIdentity === identity.id ? null : identity.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${identityColors[identity.identity_type]}`}>
                            {identityIcons[identity.identity_type]}
                          </div>
                          <div>
                            <p className="font-bold font-mono text-sm">{identity.full_handle}</p>
                            <p className="text-xs text-muted-foreground">{identity.display_name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {identity.ai_clone_enabled && (
                            <Badge variant="outline" className="text-orange-500 border-orange-500/30 text-[10px]">
                              <Bot className="h-3 w-3 mr-1" /> AI Active
                            </Badge>
                          )}
                          <Badge variant={identity.is_active ? 'default' : 'secondary'} className="text-[10px]">
                            {identity.visibility}
                          </Badge>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {selectedIdentity === identity.id && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div>
                            <label className="text-xs text-muted-foreground">Display Name</label>
                            <Input
                              defaultValue={identity.display_name || ''}
                              onBlur={(e) => updateIdentity(identity.id, { display_name: e.target.value } as any)}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Bio</label>
                            <Textarea
                              defaultValue={identity.bio || ''}
                              onBlur={(e) => updateIdentity(identity.id, { bio: e.target.value } as any)}
                              className="mt-1"
                              rows={2}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Active</span>
                            <Switch
                              checked={identity.is_active}
                              onCheckedChange={(checked) => updateIdentity(identity.id, { is_active: checked } as any)}
                            />
                          </div>
                          {identity.identity_type === 'ai_clone' && (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-sm">AI Clone Active</span>
                                <Switch
                                  checked={identity.ai_clone_enabled}
                                  onCheckedChange={(checked) => updateIdentity(identity.id, { ai_clone_enabled: checked } as any)}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground">AI Personality</label>
                                <Textarea
                                  defaultValue={identity.ai_clone_personality || ''}
                                  onBlur={(e) => updateIdentity(identity.id, { ai_clone_personality: e.target.value } as any)}
                                  placeholder="Describe how your AI clone should talk..."
                                  className="mt-1"
                                  rows={3}
                                />
                              </div>
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyHandle(identity.full_handle);
                            }}
                          >
                            <Copy className="h-3 w-3 mr-2" /> Copy Handle
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="discovery" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Globe className="h-5 w-5" /> Global Discovery Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground">Headline</label>
                      <Input
                        defaultValue={discoveryProfile?.headline || ''}
                        onBlur={(e) => updateDiscoveryProfile({ headline: e.target.value })}
                        placeholder="Full-stack developer | AI enthusiast"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Company</label>
                        <Input
                          defaultValue={discoveryProfile?.company || ''}
                          onBlur={(e) => updateDiscoveryProfile({ company: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Job Title</label>
                        <Input
                          defaultValue={discoveryProfile?.job_title || ''}
                          onBlur={(e) => updateDiscoveryProfile({ job_title: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">City</label>
                        <Input
                          defaultValue={discoveryProfile?.city || ''}
                          onBlur={(e) => updateDiscoveryProfile({ city: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Industry</label>
                        <Input
                          defaultValue={discoveryProfile?.industry || ''}
                          onBlur={(e) => updateDiscoveryProfile({ industry: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Website</label>
                      <Input
                        defaultValue={discoveryProfile?.website || ''}
                        onBlur={(e) => updateDiscoveryProfile({ website: e.target.value })}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm">Searchable by everyone</span>
                      <Switch
                        checked={discoveryProfile?.is_searchable ?? true}
                        onCheckedChange={(checked) => updateDiscoveryProfile({ is_searchable: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="privacy" className="space-y-4 mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lock className="h-5 w-5" /> Privacy Controls
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { label: 'Who can see my phone', key: 'show_phone_to' as const },
                      { label: 'Who can message me', key: 'allow_messages_from' as const },
                      { label: 'Who can call me', key: 'allow_calls_from' as const },
                      { label: 'Who can find me in search', key: 'search_visibility' as const },
                    ].map(({ label, key }) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-sm">{label}</span>
                        <select
                          className="text-xs border rounded px-2 py-1 bg-background"
                          value={discoveryProfile?.[key] || 'contacts_only'}
                          onChange={(e) => updateDiscoveryProfile({ [key]: e.target.value })}
                        >
                          <option value="everyone">Everyone</option>
                          <option value="verified_only">Verified Only</option>
                          <option value="contacts_only">Contacts Only</option>
                          <option value="nobody">Nobody</option>
                        </select>
                      </div>
                    ))}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div>
                        <span className="text-sm font-medium">Anonymous Mode</span>
                        <p className="text-xs text-muted-foreground">Hide all identity info</p>
                      </div>
                      <Switch
                        checked={discoveryProfile?.anonymous_mode ?? false}
                        onCheckedChange={(checked) => updateDiscoveryProfile({ anonymous_mode: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default Identity;
