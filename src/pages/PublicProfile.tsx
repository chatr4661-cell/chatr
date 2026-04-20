import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, MessageSquare, Phone, Globe, Briefcase, MapPin, Copy, Bot, Lock, CheckCircle2, QrCode, Share2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { TrustScoreBadge } from '@/components/TrustScoreBadge';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';

const PublicProfile = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [identities, setIdentities] = useState<any[]>([]);
  const [discovery, setDiscovery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);

  const profileUrl = `https://chatr.chat/${handle}`;

  useEffect(() => {
    if (handle) loadProfile(handle);
  }, [handle]);

  const loadProfile = async (h: string) => {
    setLoading(true);
    try {
      const cleanHandle = h.replace(/^@/, '').toLowerCase();

      // Try primary_handle first, then username
      let { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('primary_handle', cleanHandle)
        .maybeSingle() as any;

      if (!profileData) {
        const { data: byUsername } = await supabase
          .from('profiles')
          .select('*')
          .ilike('username', cleanHandle)
          .maybeSingle() as any;
        profileData = byUsername;
      }

      if (!profileData) {
        setLoading(false);
        return;
      }

      setProfile(profileData);

      // Get public identities
      const { data: ids } = await supabase
        .from('user_identities' as any)
        .select('*')
        .eq('user_id', profileData.id)
        .eq('is_active', true)
        .in('visibility', ['public']) as any;

      setIdentities(ids || []);

      // Get discovery profile
      const { data: disc } = await supabase
        .from('user_discovery_profiles' as any)
        .select('*')
        .eq('user_id', profileData.id)
        .eq('is_searchable', true)
        .maybeSingle() as any;

      setDiscovery(disc);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <h2 className="text-xl font-bold mb-2">Profile Not Found</h2>
        <p className="text-muted-foreground text-sm mb-4">@{handle} doesn't exist on CHATR</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <span className="font-mono text-sm flex-1">chatr.chat/{handle}</span>
        <Button variant="ghost" size="icon" onClick={() => setQrOpen(true)} aria-label="Show QR code">
          <QrCode className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {/* Profile Card */}
        <Card>
          <CardContent className="p-6 text-center">
            <Avatar className="h-20 w-20 mx-auto mb-3">
              <AvatarImage src={profile.avatar_url} />
              <AvatarFallback className="text-2xl">{(profile.username || '?')[0].toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex items-center justify-center gap-2 mb-1">
              <h2 className="text-xl font-bold">{profile.username}</h2>
              <TrustScoreBadge userId={profile.id} />
            </div>
            <p className="text-sm text-muted-foreground font-mono mb-3">@{handle}</p>

            {discovery?.headline && (
              <p className="text-sm mb-3">{discovery.headline}</p>
            )}

            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground mb-4">
              {discovery?.company && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3 w-3" /> {discovery.company}
                </span>
              )}
              {discovery?.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {discovery.city}
                </span>
              )}
            </div>

            <div className="flex gap-2 justify-center flex-wrap">
              <Button size="sm">
                <MessageSquare className="h-4 w-4 mr-1" /> Message
              </Button>
              <Button size="sm" variant="outline">
                <Phone className="h-4 w-4 mr-1" /> Call
              </Button>
              <Button size="sm" variant="outline" onClick={() => setQrOpen(true)}>
                <QrCode className="h-4 w-4 mr-1" /> QR
              </Button>
              <Button size="sm" variant="ghost" onClick={async () => {
                if (navigator.share) {
                  try {
                    await navigator.share({ title: `${profile.username} on CHATR`, url: profileUrl });
                    return;
                  } catch {}
                }
                navigator.clipboard.writeText(profileUrl);
                toast.success('Link copied!');
              }}>
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Identities */}
        {identities.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground px-1">Identities</h3>
            {identities.map((id: any) => (
              <Card key={id.id}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {id.identity_type === 'ai_clone' ? <Bot className="h-4 w-4 text-orange-500" /> :
                     id.identity_type === 'business' ? <Briefcase className="h-4 w-4 text-emerald-500" /> :
                     id.identity_type === 'private' ? <Lock className="h-4 w-4 text-purple-500" /> :
                     <CheckCircle2 className="h-4 w-4 text-blue-500" />}
                    <div>
                      <p className="text-sm font-mono font-medium">{id.full_handle}</p>
                      {id.bio && <p className="text-xs text-muted-foreground">{id.bio}</p>}
                    </div>
                  </div>
                  {id.ai_clone_enabled && (
                    <Badge variant="outline" className="text-[10px] text-orange-500">AI Clone</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Skills */}
        {discovery?.skills?.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground px-1 mb-2">Skills</h3>
            <div className="flex flex-wrap gap-2">
              {discovery.skills.map((skill: string) => (
                <Badge key={skill} variant="secondary">{skill}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicProfile;
