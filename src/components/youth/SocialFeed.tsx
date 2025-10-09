import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Share2, Smile, Send, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface SocialPost {
  id: string;
  user_id: string;
  content: string;
  post_type: string;
  mood: string | null;
  is_anonymous: boolean;
  media_urls: string[];
  tags: string[];
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  };
  user_has_liked?: boolean;
}

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊',
  sad: '😢',
  anxious: '😰',
  calm: '😌',
  motivated: '💪',
  tired: '😴',
};

export default function SocialFeed() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [posting, setPosting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    getCurrentUser();
    loadPosts();
    subscribeToRealtime();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: postsData, error } = await supabase
        .from('social_posts')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Check which posts the user has liked
      if (user && postsData) {
        const { data: likesData } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id);

        const likedPostIds = new Set(likesData?.map((l: any) => l.post_id) || []);

        setPosts((postsData as any[]).map((post: any) => ({
          ...post,
          user_has_liked: likedPostIds.has(post.id)
        })));
      } else {
        setPosts((postsData as any[]) || []);
      }
    } catch (error: any) {
      console.error('Error loading posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const subscribeToRealtime = () => {
    const channel = supabase
      .channel('social_posts_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_posts'
        },
        () => {
          loadPosts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_likes'
        },
        () => {
          loadPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleCreatePost = async () => {
    if (!newPost.trim() || !currentUser) return;

    setPosting(true);
    try {
      const { error } = await supabase
        .from('social_posts')
        .insert({
          user_id: currentUser.id,
          content: newPost.trim(),
          mood: selectedMood || null,
          is_anonymous: isAnonymous,
          post_type: 'text'
        } as any);

      if (error) throw error;

      setNewPost('');
      setSelectedMood('');
      setIsAnonymous(false);
      toast.success('Post shared!');
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string, currentlyLiked: boolean) => {
    if (!currentUser) {
      toast.error('Please sign in to like posts');
      return;
    }

    try {
      if (currentlyLiked) {
        // Unlike
        const { error: deleteError } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id);

        if (deleteError) throw deleteError;

        const currentPost = posts.find(p => p.id === postId);
        const { error: updateError } = await supabase
          .from('social_posts')
          .update({ like_count: Math.max(0, (currentPost?.like_count || 1) - 1) } as any)
          .eq('id', postId);

        if (updateError) throw updateError;
      } else {
        // Like
        const { error: insertError } = await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: currentUser.id } as any);

        if (insertError) throw insertError;

        const currentPost = posts.find(p => p.id === postId);
        const { error: updateError } = await supabase
          .from('social_posts')
          .update({ like_count: (currentPost?.like_count || 0) + 1 } as any)
          .eq('id', postId);

        if (updateError) throw updateError;
      }

      loadPosts();
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Post */}
      <Card className="p-6 bg-gradient-card backdrop-blur-glass border-glass-border">
        <div className="space-y-4">
          <div className="flex gap-3">
            <Avatar>
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <Textarea
              placeholder="Share your thoughts, feelings, or experiences..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="min-h-[100px] bg-background/50 border-glass-border"
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            {Object.entries(MOOD_EMOJIS).map(([mood, emoji]) => (
              <Button
                key={mood}
                variant={selectedMood === mood ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedMood(selectedMood === mood ? '' : mood)}
                className="gap-2"
              >
                <span>{emoji}</span>
                <span className="capitalize">{mood}</span>
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={isAnonymous ? 'text-primary' : ''}
            >
              Post Anonymously
            </Button>
            <Button
              onClick={handleCreatePost}
              disabled={!newPost.trim() || posting}
              className="gap-2"
            >
              {posting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Share
            </Button>
          </div>
        </div>
      </Card>

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id} className="p-6 bg-gradient-card backdrop-blur-glass border-glass-border hover:shadow-glow transition-shadow">
            <div className="space-y-4">
              {/* Post Header */}
              <div className="flex items-start gap-3">
                <Avatar>
                  <AvatarImage src={post.is_anonymous ? undefined : post.profiles?.avatar_url || undefined} />
                  <AvatarFallback>
                    {post.is_anonymous ? '?' : post.profiles?.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">
                      {post.is_anonymous ? 'Anonymous' : post.profiles?.username || 'User'}
                    </p>
                    {post.mood && (
                      <Badge variant="secondary" className="gap-1">
                        <span>{MOOD_EMOJIS[post.mood]}</span>
                        <span className="capitalize">{post.mood}</span>
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Post Content */}
              <p className="text-foreground whitespace-pre-wrap">{post.content}</p>

              {/* Post Actions */}
              <div className="flex items-center gap-6 pt-2 border-t border-glass-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleLike(post.id, post.user_has_liked || false)}
                >
                  <Heart className={`w-4 h-4 ${post.user_has_liked ? 'fill-primary text-primary' : ''}`} />
                  <span>{post.like_count || 0}</span>
                </Button>
                <Button variant="ghost" size="sm" className="gap-2">
                  <MessageCircle className="w-4 h-4" />
                  <span>{post.comment_count || 0}</span>
                </Button>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {posts.length === 0 && (
        <Card className="p-12 text-center bg-gradient-card backdrop-blur-glass border-glass-border">
          <Smile className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No posts yet</h3>
          <p className="text-muted-foreground">Be the first to share your thoughts!</p>
        </Card>
      )}
    </div>
  );
}
