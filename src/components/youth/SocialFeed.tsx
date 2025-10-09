import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Heart, MessageCircle, Share2, Send, MoreVertical, Smile } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface Post {
  id: string;
  user_id: string;
  content: string;
  post_type: string;
  media_url: string | null;
  category: string | null;
  mood: string | null;
  is_anonymous: boolean;
  like_count: number;
  comment_count: number;
  share_count: number;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  } | null;
  user_has_liked?: boolean;
}

const moodEmojis: { [key: string]: string } = {
  happy: '😊',
  grateful: '🙏',
  anxious: '😰',
  calm: '😌',
  motivated: '💪',
  thoughtful: '🤔',
};

const categories = [
  { id: 'all', label: 'All Posts', emoji: '🌐' },
  { id: 'mental-health', label: 'Mental Health', emoji: '🧠' },
  { id: 'wellness', label: 'Wellness', emoji: '🌿' },
  { id: 'motivation', label: 'Motivation', emoji: '✨' },
  { id: 'support', label: 'Support', emoji: '🤝' },
  { id: 'story', label: 'My Story', emoji: '📖' },
];

export function SocialFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPosts();
    subscribeToRealtimeUpdates();
  }, [selectedCategory]);

  const loadPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      let query = supabase
        .from('social_posts')
        .select(`
          *,
          profiles:user_id (username, avatar_url)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(50);

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Check which posts the user has liked
      if (user && data) {
        const postIds = data.map(p => p.id);
        const { data: likes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds);

        const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
        
        setPosts(data.map(post => ({
          ...post,
          user_has_liked: likedPostIds.has(post.id)
        })));
      } else {
        setPosts(data || []);
      }
    } catch (error) {
      console.error('Error loading posts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load posts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const subscribeToRealtimeUpdates = () => {
    const channel = supabase
      .channel('social-posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_posts',
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
          table: 'post_likes',
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

  const createPost = async () => {
    if (!newPost.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('social_posts').insert({
        user_id: user.id,
        content: newPost,
        category: selectedCategory === 'all' ? 'general' : selectedCategory,
        mood: selectedMood,
        is_anonymous: isAnonymous,
      });

      if (error) throw error;

      setNewPost('');
      setSelectedMood(null);
      setIsAnonymous(false);

      toast({
        title: '✅ Posted!',
        description: 'Your post has been shared with the community',
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: 'Error',
        description: 'Failed to create post',
        variant: 'destructive',
      });
    }
  };

  const toggleLike = async (postId: string, currentlyLiked: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (currentlyLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        await supabase.rpc('increment', {
          table_name: 'social_posts',
          row_id: postId,
          column_name: 'like_count',
          x: -1
        });
      } else {
        await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: user.id });

        await supabase.rpc('increment', {
          table_name: 'social_posts',
          row_id: postId,
          column_name: 'like_count',
          x: 1
        });
      }

      loadPosts();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <Button
            key={cat.id}
            variant={selectedCategory === cat.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.id)}
            className="whitespace-nowrap"
          >
            <span className="mr-2">{cat.emoji}</span>
            {cat.label}
          </Button>
        ))}
      </div>

      {/* Create Post */}
      <Card className="p-6 bg-gradient-card backdrop-blur-glass border-glass-border">
        <div className="space-y-4">
          <Textarea
            placeholder="Share your thoughts, feelings, or story..."
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            className="min-h-[100px] bg-background/50 border-glass-border resize-none"
          />
          
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-2">
              <span className="text-sm text-muted-foreground">Mood:</span>
              {Object.entries(moodEmojis).map(([mood, emoji]) => (
                <button
                  key={mood}
                  onClick={() => setSelectedMood(mood === selectedMood ? null : mood)}
                  className={`text-2xl transition-transform hover:scale-125 ${
                    selectedMood === mood ? 'scale-125' : 'opacity-50'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            
            <div className="ml-auto flex gap-2">
              <Button
                variant={isAnonymous ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsAnonymous(!isAnonymous)}
              >
                {isAnonymous ? '🎭 Anonymous' : '👤 Public'}
              </Button>
              <Button onClick={createPost} disabled={!newPost.trim()}>
                <Send className="w-4 h-4 mr-2" />
                Post
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Posts Feed */}
      <AnimatePresence mode="popLayout">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : posts.length === 0 ? (
          <Card className="p-12 text-center bg-gradient-card backdrop-blur-glass border-glass-border">
            <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
          </Card>
        ) : (
          posts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="p-6 bg-gradient-card backdrop-blur-glass border-glass-border hover:shadow-glow transition-shadow">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12 border-2 border-primary/20">
                    {!post.is_anonymous && post.profiles?.avatar_url ? (
                      <img src={post.profiles.avatar_url} alt="Avatar" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                        {post.is_anonymous ? '🎭' : post.profiles?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                  </Avatar>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">
                          {post.is_anonymous ? 'Anonymous' : post.profiles?.username || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                          {post.mood && ` • ${moodEmojis[post.mood] || ''} ${post.mood}`}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>

                    <p className="text-foreground whitespace-pre-wrap">{post.content}</p>

                    {post.media_url && (
                      <img
                        src={post.media_url}
                        alt="Post media"
                        className="rounded-lg w-full max-h-96 object-cover"
                      />
                    )}

                    <div className="flex items-center gap-6 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLike(post.id, post.user_has_liked || false)}
                        className={post.user_has_liked ? 'text-pink-500' : ''}
                      >
                        <Heart className={`w-4 h-4 mr-2 ${post.user_has_liked ? 'fill-current' : ''}`} />
                        {post.like_count}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        {post.comment_count}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Share2 className="w-4 h-4 mr-2" />
                        {post.share_count}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))
        )}
      </AnimatePresence>
    </div>
  );
}
