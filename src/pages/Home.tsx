import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Phone, Video, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [recentChats, setRecentChats] = useState<any[]>([]);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    setProfile(profileData);

    const { data: conversations } = await supabase
      .from('conversations')
      .select('*, messages(*)')
      .contains('participant_ids', [user.id])
      .order('updated_at', { ascending: false })
      .limit(3);

    setRecentChats(conversations || []);

    const { data: calls } = await supabase
      .from('calls')
      .select('*')
      .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('started_at', { ascending: false })
      .limit(3);

    setRecentCalls(calls || []);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-6 space-y-6">
        {/* Profile Section */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="text-2xl">
                {profile?.username?.[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{profile?.username || 'User'}</h1>
              <p className="text-sm text-muted-foreground">{profile?.email}</p>
            </div>
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => navigate('/chat')}
          >
            <MessageCircle className="h-8 w-8" />
            <span>New Chat</span>
          </Button>
          <Button
            variant="outline"
            className="h-24 flex-col gap-2"
            onClick={() => navigate('/call-history')}
          >
            <Phone className="h-8 w-8" />
            <span>New Call</span>
          </Button>
        </div>

        {/* Recent Activity */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Activity</h2>
          
          {recentChats.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Recent Chats
              </h3>
              <div className="space-y-2">
                {recentChats.slice(0, 3).map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => navigate(`/chat?conversation=${chat.id}`)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                  >
                    <MessageCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Conversation</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {recentCalls.length > 0 && (
            <Card className="p-4">
              <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Recent Calls
              </h3>
              <div className="space-y-2">
                {recentCalls.slice(0, 3).map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center gap-3 p-2 rounded-lg"
                  >
                    {call.call_type === 'video' ? (
                      <Video className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Phone className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm capitalize">{call.call_type} Call</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
