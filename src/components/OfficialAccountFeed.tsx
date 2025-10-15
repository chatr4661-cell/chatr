import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Heart, MessageCircle, Share2, Eye, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Post {
  id: string;
  account_id: string;
  title: string;
  content: string;
  post_type: string;
  view_count: number;
  like_count: number;
  created_at: string;
  official_accounts: {
    account_name: string;
    avatar_url: string;
    is_verified: boolean;
  };
}

interface OfficialAccountFeedProps {
  accountId?: string;
}

export const OfficialAccountFeed: React.FC<OfficialAccountFeedProps> = ({ accountId }) => {
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPosts();
    loadLikedPosts();
  }, [accountId]);

  const loadPosts = async () => {
    try {
      let query = (supabase as any)
        .from('official_account_posts')
        .select('*, official_accounts(account_name, avatar_url, is_verified)')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error } = await query;
      if (!error && data) setPosts(data);
    } finally {
      setLoading(false);
    }
  };

  const loadLikedPosts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await (supabase as any)
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id);

    if (data) {
      setLikedPosts(new Set(data.map((like: any) => like.post_id)));
    }
  };

  const handleLike = async (postId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Please login to like posts', variant: 'destructive' });
      return;
    }

    const isLiked = likedPosts.has(postId);

    try {
      if (isLiked) {
        await (supabase as any)
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.delete(postId);
          return newSet;
        });

        setPosts(posts.map(p => p.id === postId ? { ...p, like_count: p.like_count - 1 } : p));
      } else {
        await (supabase as any)
          .from('post_likes')
          .insert({ post_id: postId, user_id: user.id });

        setLikedPosts(prev => new Set([...prev, postId]));
        setPosts(posts.map(p => p.id === postId ? { ...p, like_count: p.like_count + 1 } : p));
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      article: 'bg-blue-500',
      video: 'bg-red-500',
      image: 'bg-green-500',
      announcement: 'bg-orange-500'
    };
    return colors[type] || 'bg-gray-500';
  };

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Loading posts...</div>;
  }

  if (posts.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No posts yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {posts.map(post => (
        <Card key={post.id} className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <Avatar>
              <AvatarImage src={post.official_accounts.avatar_url} />
              <AvatarFallback>{post.official_accounts.account_name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{post.official_accounts.account_name}</span>
                {post.official_accounts.is_verified && (
                  <CheckCircle className="h-4 w-4 text-blue-500 fill-blue-500" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
            <Badge className={getTypeColor(post.post_type)}>
              {post.post_type}
            </Badge>
          </div>

          <h3 className="font-bold text-lg mb-2">{post.title}</h3>
          <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">
            {post.content}
          </p>

          <div className="flex items-center gap-6 text-sm text-muted-foreground border-t pt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLike(post.id)}
              className={likedPosts.has(post.id) ? 'text-red-500' : ''}
            >
              <Heart className={`h-4 w-4 mr-1 ${likedPosts.has(post.id) ? 'fill-red-500' : ''}`} />
              {post.like_count}
            </Button>

            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {post.view_count}
            </div>

            <Button variant="ghost" size="sm">
              <MessageCircle className="h-4 w-4 mr-1" />
              Comment
            </Button>

            <Button variant="ghost" size="sm">
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};