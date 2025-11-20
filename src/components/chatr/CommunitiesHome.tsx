import React, { useState, useEffect } from 'react';
import { Search, Plus, TrendingUp, Users, Crown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface CommunitiesHomeProps {
  userId: string;
}

export function CommunitiesHome({ userId }: CommunitiesHomeProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [promoted, setPromoted] = useState<any[]>([]);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [familyGroups, setFamilyGroups] = useState<any[]>([]);

  useEffect(() => {
    loadCommunities();
  }, [userId]);

  const loadCommunities = async () => {
    // Load promoted communities
    const { data: promotedData } = await supabase
      .from('conversations')
      .select('id, group_name, group_icon_url, member_count, is_community')
      .eq('is_community', true)
      .eq('is_group', true)
      .order('member_count', { ascending: false })
      .limit(5);
    
    if (promotedData) setPromoted(promotedData);

    // Load user's groups
    const { data: myGroupsData } = await supabase
      .from('conversation_participants')
      .select('conversations!inner(id, group_name, group_icon_url, member_count, is_group)')
      .eq('user_id', userId)
      .eq('conversations.is_group', true)
      .order('conversations.updated_at', { ascending: false });
    
    if (myGroupsData) {
      setMyGroups(myGroupsData.map((g: any) => g.conversations));
    }
  };

  return (
    <div className="h-full bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-b from-[hsl(263,70%,50%)] to-[hsl(263,70%,55%)] px-4 pt-4 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Communities</h1>
          <Button
            size="sm"
            onClick={() => navigate('/create-community')}
            className="bg-white/20 hover:bg-white/30 text-white border-0"
          >
            <Plus className="w-4 h-4 mr-1" />
            Create
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search communities..."
            className="pl-9 bg-white/90"
          />
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* Promoted Communities */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">Promoted</h2>
          </div>
          <div className="space-y-2">
            {promoted.map(community => (
              <button
                key={community.id}
                onClick={() => navigate(`/chat/${community.id}`)}
                className="w-full flex items-center gap-3 p-3 bg-card rounded-xl border border-border hover:bg-muted/50 transition-colors active:scale-98"
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={community.group_icon_url} />
                  <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                    {community.group_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <div className="font-semibold flex items-center gap-2">
                    {community.group_name}
                    <Crown className="w-4 h-4 text-yellow-500" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {community.member_count?.toLocaleString() || 0} members
                  </div>
                </div>
                <Button size="sm" variant="outline">Join</Button>
              </button>
            ))}
          </div>
        </section>

        {/* My Groups */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-lg">My Groups</h2>
          </div>
          {myGroups.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              You haven't joined any groups yet
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {myGroups.map(group => (
                <button
                  key={group.id}
                  onClick={() => navigate(`/chat/${group.id}`)}
                  className="flex flex-col items-center gap-2 p-3 bg-card rounded-xl border border-border hover:bg-muted/50 transition-colors active:scale-95"
                >
                  <Avatar className="w-16 h-16">
                    <AvatarImage src={group.group_icon_url} />
                    <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white text-lg">
                      {group.group_name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-center w-full">
                    <div className="font-semibold text-sm truncate">{group.group_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {group.member_count || 0} members
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Family & Close Groups */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">👨‍👩‍👧‍👦</span>
            <h2 className="font-bold text-lg">Family & Close</h2>
          </div>
          <div className="text-center py-8 text-muted-foreground">
            No family groups yet
          </div>
        </section>
      </div>
    </div>
  );
}
