import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Users, MessageSquare, Settings, LogOut } from 'lucide-react';
import { CommunityFeed } from '@/components/communities/CommunityFeed';
import { SEOHead } from '@/components/SEOHead';

interface Community {
  id: string;
  group_name: string;
  community_description: string | null;
  category: string | null;
  member_count: number;
  group_icon_url: string | null;
  is_public: boolean;
  created_by?: string;
}

export default function CommunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [community, setCommunity] = useState<Community | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/auth'); return; }
      setUserId(user.id);

      const { data: c } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      setCommunity(c as any);

      const { data: mem } = await supabase
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', id)
        .eq('user_id', user.id)
        .maybeSingle();
      setIsMember(!!mem);
      setLoading(false);
    })();
  }, [id, navigate]);

  const join = async () => {
    if (!id || !userId) return;
    await supabase.from('conversation_participants').insert({
      conversation_id: id, user_id: userId, role: 'member',
    } as any);
    await supabase.rpc('increment_community_members' as any, { community_id: id } as any);
    setIsMember(true);
  };

  const leave = async () => {
    if (!id || !userId) return;
    await supabase.from('conversation_participants').delete()
      .eq('conversation_id', id).eq('user_id', userId);
    setIsMember(false);
  };

  if (loading || !community) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <SEOHead title={`${community.group_name} · Communities`} description={community.community_description || 'Chatr community'} />
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/communities')}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-base font-semibold flex-1 truncate">{community.group_name}</h1>
            {community.created_by === userId && (
              <Button variant="ghost" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            )}
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-5">
          <Card className="p-4 mb-5">
            <div className="flex items-start gap-4">
              {community.group_icon_url ? (
                <img src={community.group_icon_url} alt={community.group_name} className="w-16 h-16 rounded-xl object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-7 h-7 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold">{community.group_name}</h2>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{community.community_description || 'No description'}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <Users className="w-3 h-3" />
                  <span>{community.member_count} members</span>
                  {community.category && <Badge variant="secondary" className="text-[10px]">{community.category}</Badge>}
                  {community.is_public ? <Badge variant="outline" className="text-[10px]">Public</Badge> : <Badge variant="outline" className="text-[10px]">Private</Badge>}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              {isMember ? (
                <>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate(`/chat?conversation=${id}`)}>
                    <MessageSquare className="w-4 h-4 mr-2" />Open Chat
                  </Button>
                  <Button size="sm" variant="ghost" onClick={leave}>
                    <LogOut className="w-4 h-4 mr-2" />Leave
                  </Button>
                </>
              ) : (
                <Button size="sm" className="flex-1" onClick={join}>Join Community</Button>
              )}
            </div>
          </Card>

          {isMember || community.is_public ? (
            <CommunityFeed communityId={community.id} />
          ) : (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Join this community to see posts.
            </Card>
          )}
        </main>
      </div>
    </>
  );
}
