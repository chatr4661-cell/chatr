import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share2, Pin } from 'lucide-react';
import { toast } from 'sonner';

interface CommunityPost {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_pinned: boolean;
  author?: {
    username: string;
    avatar_url: string;
  };
}

export const CommunityFeed = ({ communityId }: { communityId: string }) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPosts();
    subscribeToUpdates();
  }, [communityId]);

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from('community_posts' as any)
      .select(`
        *,
        profiles!author_id (
          username,
          avatar_url
        )
      `)
      .eq('community_id', communityId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false }) as any;

    if (error) {
      toast.error('Failed to load posts');
      return;
    }

    setPosts(data || []);
  };

  const subscribeToUpdates = () => {
    const channel = supabase
      .channel(`community_posts:${communityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'community_posts',
          filter: `community_id=eq.${communityId}`,
        },
        () => loadPosts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const createPost = async () => {
    if (!newPost.trim()) return;

    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('community_posts' as any)
      .insert({
        community_id: communityId,
        author_id: user?.id,
        content: newPost,
      } as any);

    if (error) {
      toast.error('Failed to create post');
    } else {
      setNewPost('');
      toast.success('Post created');
    }
    
    setLoading(false);
  };

  const toggleLike = async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: existing } = await supabase
      .from('post_reactions' as any)
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', user?.id)
      .eq('reaction_type', 'like')
      .maybeSingle() as any;

    if (existing) {
      await supabase.from('post_reactions' as any).delete().eq('id', existing.id);
    } else {
      await supabase.from('post_reactions' as any).insert({
        post_id: postId,
        user_id: user?.id,
        reaction_type: 'like',
      } as any);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Textarea
          placeholder="Share something with the community..."
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          className="mb-2"
        />
        <Button onClick={createPost} disabled={loading || !newPost.trim()}>
          Post
        </Button>
      </Card>

      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="p-4">
            <div className="flex items-start gap-3 mb-3">
              <Avatar>
                <AvatarImage src={post.author?.avatar_url} />
                <AvatarFallback>{post.author?.username?.[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{post.author?.username}</p>
                  {post.is_pinned && <Pin className="h-4 w-4 text-primary" />}
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date(post.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            <p className="mb-4 whitespace-pre-wrap">{post.content}</p>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleLike(post.id)}
                className="gap-2"
              >
                <Heart className="h-4 w-4" />
                {post.likes_count}
              </Button>
              <Button variant="ghost" size="sm" className="gap-2">
                <MessageCircle className="h-4 w-4" />
                {post.comments_count}
              </Button>
              <Button variant="ghost" size="sm" className="gap-2">
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
