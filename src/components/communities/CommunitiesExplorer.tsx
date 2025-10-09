import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Search, Plus, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Community {
  id: string;
  group_name: string;
  community_description: string | null;
  category: string | null;
  member_count: number;
  group_icon_url: string | null;
  is_public: boolean;
}

export const CommunitiesExplorer = ({ userId }: { userId: string }) => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const navigate = useNavigate();

  const categories = ['Technology', 'Health', 'Education', 'Entertainment', 'Sports', 'Business'];

  useEffect(() => {
    loadCommunities();
  }, [selectedCategory]);

  const loadCommunities = async () => {
    try {
      let query = supabase
        .from('conversations')
        .select('*')
        .eq('is_community', true)
        .eq('is_public', true)
        .order('member_count', { ascending: false });

      if (selectedCategory) {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;

      if (error) throw error;
      setCommunities(data || []);
    } catch (error) {
      console.error('Error loading communities:', error);
      toast.error('Failed to load communities');
    } finally {
      setLoading(false);
    }
  };

  const joinCommunity = async (communityId: string) => {
    try {
      // Check if already a member
      const { data: existing } = await supabase
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', communityId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        toast.info('You are already a member of this community');
        navigate(`/chat?conversation=${communityId}`);
        return;
      }

      // Join community
      const { error } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: communityId,
          user_id: userId,
          role: 'member'
        });

      if (error) throw error;

      // Update member count
      await supabase.rpc('increment_community_members', {
        community_id: communityId
      });

      toast.success('Successfully joined community!');
      navigate(`/chat?conversation=${communityId}`);
    } catch (error) {
      console.error('Error joining community:', error);
      toast.error('Failed to join community');
    }
  };

  const filteredCommunities = communities.filter(c =>
    c.group_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.community_description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Discover Communities</h1>
          <p className="text-muted-foreground">Join communities and connect with like-minded people</p>
        </div>
        <Button onClick={() => navigate('/create-community')}>
          <Plus className="mr-2 h-4 w-4" />
          Create Community
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search communities..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories */}
      <div className="flex gap-2 flex-wrap">
        <Badge
          variant={selectedCategory === null ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setSelectedCategory(null)}
        >
          All
        </Badge>
        {categories.map(cat => (
          <Badge
            key={cat}
            variant={selectedCategory === cat ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </Badge>
        ))}
      </div>

      {/* Communities Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-32 bg-muted rounded" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCommunities.map(community => (
            <Card key={community.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="space-y-4">
                {/* Icon */}
                {community.group_icon_url ? (
                  <img
                    src={community.group_icon_url}
                    alt={community.group_name || 'Community'}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                )}

                {/* Info */}
                <div>
                  <h3 className="font-semibold text-lg mb-1">{community.group_name}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {community.community_description || 'No description'}
                  </p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{community.member_count} members</span>
                  </div>
                  {community.category && (
                    <Badge variant="secondary" className="text-xs">
                      {community.category}
                    </Badge>
                  )}
                </div>

                {/* Join Button */}
                <Button
                  onClick={() => joinCommunity(community.id)}
                  className="w-full"
                  size="sm"
                >
                  Join Community
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {filteredCommunities.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No communities found</p>
        </div>
      )}
    </div>
  );
};