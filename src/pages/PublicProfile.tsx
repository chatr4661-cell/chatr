import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, MessageSquare, Phone, Globe, Briefcase, MapPin, Copy, Bot, Lock, CheckCircle2, QrCode, Share2, Download, UserPlus, Check, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { TrustScoreBadge } from '@/components/TrustScoreBadge';
import { toast } from 'sonner';
import { QRCodeSVG } from 'qrcode.react';
import { buildPublicProfileUrl, normalizePublicHandle } from '@/lib/profileLinks';

const PublicProfile = () => {
  const { handle } = useParams<{ handle: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [identities, setIdentities] = useState<any[]>([]);
  const [discovery, setDiscovery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'connected'>('none');
  const [connecting, setConnecting] = useState(false);

  const normalizedHandle = normalizePublicHandle(handle);
  const profileUrl = buildPublicProfileUrl(handle);

  useEffect(() => {
    if (handle) loadProfile(handle);
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, [handle]);

  useEffect(() => {
    if (currentUserId && profile?.id && currentUserId !== profile.id) {
      checkConnectionStatus(currentUserId, profile.id);
    }
  }, [currentUserId, profile?.id]);

  const checkConnectionStatus = async (me: string, them: string) => {
    try {
      const { data } = await supabase
        .from('connection_requests')
        .select('status, sender_id')
        .or(`and(sender_id.eq.${me},receiver_id.eq.${them}),and(sender_id.eq.${them},receiver_id.eq.${me})`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.status === 'accepted') setConnectionStatus('connected');
      else if (data?.status === 'pending') setConnectionStatus('pending');
      else setConnectionStatus('none');
    } catch {}
  };

  const requireAuth = () => {
    if (!currentUserId) {
      toast.info('Sign in to continue');
      navigate(`/auth?redirect=/${normalizedHandle || handle}`);
      return false;
    }
    if (profile?.id === currentUserId) {
      toast.info('This is your own profile');
      return false;
    }
    return true;
  };

  const handleMessage = async () => {
    if (!requireAuth()) return;
    try {
      // Find or create conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id, conversation_participants!inner(user_id)')
        .eq('is_group', false)
        .eq('conversation_participants.user_id', currentUserId);

      const match = (existing || []).find((c: any) =>
        c.conversation_participants?.some((p: any) => p.user_id === profile.id)
      );

      if (match) {
        navigate(`/chat/${match.id}`);
        return;
      }

      const { data: conv, error } = await supabase
        .from('conversations')
        .insert({ created_by: currentUserId!, is_group: false })
        .select()
        .single();
      if (error) throw error;

      await supabase.from('conversation_participants').insert([
        { conversation_id: conv.id, user_id: currentUserId! },
        { conversation_id: conv.id, user_id: profile.id },
      ]);
      navigate(`/chat/${conv.id}`);
    } catch (e) {
      console.error(e);
      navigate(`/chat?userId=${profile.id}`);
    }
  };

  const handleCall = () => {
    if (!requireAuth()) return;
    navigate(`/dialer?call=${profile.id}`);
  };

  const handleConnect = async () => {
    if (!requireAuth()) return;
    if (connectionStatus === 'connected') {
      toast.info('Already connected');
      return;
    }
    if (connectionStatus === 'pending') {
      toast.info('Request already sent');
      return;
    }
    setConnecting(true);
    try {
      const { error } = await supabase
        .from('connection_requests')
        .insert({ sender_id: currentUserId!, receiver_id: profile.id, status: 'pending' });
      if (error) throw error;
      setConnectionStatus('pending');
      toast.success(`Connection request sent to ${profile.username}`);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Failed to send request');
    } finally {
      setConnecting(false);
    }
  };


  const loadProfile = async (h: string) => {
    setLoading(true);
    try {
      const cleanHandle = normalizePublicHandle(h);

      const { data, error } = await supabase.rpc('get_public_profile' as any, {
        handle_input: cleanHandle,
      } as any);

      if (error) throw error;

      if (!data?.profile) {
        setProfile(null);
        setIdentities([]);
        setDiscovery(null);
        setLoading(false);
        return;
      }

      setProfile(data.profile);
      setIdentities(data.identities || []);
      setDiscovery(data.discovery || null);
    } catch (error) {
      console.error('Failed to load profile:', error);
      setProfile(null);
      setIdentities([]);
      setDiscovery(null);
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
        <p className="text-muted-foreground text-sm mb-4">@{normalizedHandle || handle} doesn't exist on CHATR</p>
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
        <span className="font-mono text-sm flex-1">chatr.chat/{normalizedHandle || handle}</span>
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
            <p className="text-sm text-muted-foreground font-mono mb-3">@{normalizedHandle || handle}</p>

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
              <Button size="sm" onClick={handleMessage}>
                <MessageSquare className="h-4 w-4 mr-1" /> Message
              </Button>
              <Button size="sm" variant="outline" onClick={handleCall}>
                <Phone className="h-4 w-4 mr-1" /> Call
              </Button>
              <Button
                size="sm"
                variant={connectionStatus === 'connected' ? 'secondary' : 'default'}
                onClick={handleConnect}
                disabled={connecting || connectionStatus !== 'none'}
              >
                {connectionStatus === 'connected' ? (
                  <><Check className="h-4 w-4 mr-1" /> Connected</>
                ) : connectionStatus === 'pending' ? (
                  <><Clock className="h-4 w-4 mr-1" /> Pending</>
                ) : (
                  <><UserPlus className="h-4 w-4 mr-1" /> Connect</>
                )}
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

      {/* QR Code Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">Scan to connect with {profile.username}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div id="qr-wrapper" className="bg-white p-4 rounded-xl border">
              <QRCodeSVG
                value={profileUrl}
                size={220}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-sm font-mono text-muted-foreground">chatr.chat/{normalizedHandle || handle}</p>
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(profileUrl);
                  toast.success('Link copied!');
                }}
              >
                <Copy className="h-4 w-4 mr-1" /> Copy
              </Button>
              <Button
                className="flex-1"
                onClick={async () => {
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: `${profile.username} on CHATR`,
                        text: `Connect with ${profile.username} on CHATR`,
                        url: profileUrl,
                      });
                      return;
                    } catch {}
                  }
                  navigator.clipboard.writeText(profileUrl);
                  toast.success('Link copied!');
                }}
              >
                <Share2 className="h-4 w-4 mr-1" /> Share
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PublicProfile;

