import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MessageCircle, Pin, Send, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CommunityPost {
  id: string;
  content: string;
  author_id: string;
  created_at: string;
  likes_count: number;
  comments_count: number;
  is_pinned: boolean;
  image_url: string | null;
  author?: { username: string; avatar_url: string };
  liked?: boolean;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: { username: string; avatar_url: string };
}

export const CommunityFeed = ({ communityId }: { communityId: string }) => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [openComments, setOpenComments] = useState<Record<string, Comment[]>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    loadPosts();
    const channel = supabase
      .channel(`community_posts:${communityId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts', filter: `community_id=eq.${communityId}` }, () => loadPosts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [communityId, userId]);

  const loadPosts = async () => {
    const { data, error } = await supabase
      .from('community_posts' as any)
      .select('*, author:profiles!community_posts_author_id_fkey(username, avatar_url)')
      .eq('community_id', communityId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100) as any;
    if (error) { console.error(error); return; }

    let liked: Set<string> = new Set();
    if (userId && data?.length) {
      const ids = data.map((p: any) => p.id);
      const { data: r } = await supabase
        .from('community_post_reactions' as any)
        .select('post_id')
        .eq('user_id', userId)
        .in('post_id', ids) as any;
      liked = new Set((r ?? []).map((x: any) => x.post_id));
    }
    setPosts((data ?? []).map((p: any) => ({ ...p, liked: liked.has(p.id) })));
  };

  const createPost = async () => {
    if (!newPost.trim() || !userId) return;
    setLoading(true);
    const { error } = await supabase.from('community_posts' as any).insert({
      community_id: communityId, author_id: userId, content: newPost.trim(),
    } as any);
    if (!error) setNewPost('');
    setLoading(false);
  };

  const deletePost = async (id: string) => {
    await supabase.from('community_posts' as any).delete().eq('id', id);
  };

  const toggleLike = async (post: CommunityPost) => {
    if (!userId) return;
    // Optimistic
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, liked: !p.liked, likes_count: p.likes_count + (p.liked ? -1 : 1) } : p));
    if (post.liked) {
      await supabase.from('community_post_reactions' as any).delete()
        .eq('post_id', post.id).eq('user_id', userId).eq('reaction_type', 'like');
    } else {
      await supabase.from('community_post_reactions' as any).insert({
        post_id: post.id, user_id: userId, reaction_type: 'like',
      } as any);
    }
  };

  const loadComments = async (postId: string) => {
    if (openComments[postId]) {
      setOpenComments(prev => { const n = { ...prev }; delete n[postId]; return n; });
      return;
    }
    const { data } = await supabase
      .from('community_post_comments' as any)
      .select('*, author:profiles!community_post_comments_user_id_fkey(username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true }) as any;
    setOpenComments(prev => ({ ...prev, [postId]: (data ?? []) as any }));
  };

  const submitComment = async (postId: string) => {
    const content = (commentDrafts[postId] ?? '').trim();
    if (!content || !userId) return;
    const { data } = await supabase.from('community_post_comments' as any).insert({
      post_id: postId, user_id: userId, content,
    } as any).select('*, author:profiles!community_post_comments_user_id_fkey(username, avatar_url)').maybeSingle() as any;
    setCommentDrafts(prev => ({ ...prev, [postId]: '' }));
    if (data) setOpenComments(prev => ({ ...prev, [postId]: [...(prev[postId] ?? []), data] }));
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p));
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Textarea
          placeholder="Share something with the community..."
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          className="mb-2 min-h-[80px]"
        />
        <Button size="sm" onClick={createPost} disabled={loading || !newPost.trim()}>Post</Button>
      </Card>

      {posts.length === 0 && (
        <Card className="p-8 text-center text-sm text-muted-foreground">Be the first to post.</Card>
      )}

      {posts.map((post) => (
        <Card key={post.id} className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <Avatar className="w-9 h-9">
              <AvatarImage src={post.author?.avatar_url} />
              <AvatarFallback>{post.author?.username?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium text-sm">{post.author?.username ?? 'Unknown'}</p>
                <div className="flex items-center gap-1">
                  {post.is_pinned && <Pin className="w-3.5 h-3.5 text-primary" />}
                  {post.author_id === userId && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deletePost(post.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</p>
            </div>
          </div>

          <p className="mb-3 text-sm whitespace-pre-wrap">{post.content}</p>
          {post.image_url && <img src={post.image_url} alt="" className="rounded-lg mb-3 max-h-80 w-full object-cover" />}

          <div className="flex items-center gap-1 text-xs">
            <Button variant="ghost" size="sm" className="gap-1.5 h-8" onClick={() => toggleLike(post)}>
              <Heart className={`w-4 h-4 ${post.liked ? 'fill-red-500 text-red-500' : ''}`} />
              {post.likes_count}
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5 h-8" onClick={() => loadComments(post.id)}>
              <MessageCircle className="w-4 h-4" />
              {post.comments_count}
            </Button>
          </div>

          {openComments[post.id] && (
            <div className="mt-3 pt-3 border-t border-border/40 space-y-3">
              {openComments[post.id].map((c) => (
                <div key={c.id} className="flex gap-2">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={c.author?.avatar_url} />
                    <AvatarFallback>{c.author?.username?.[0]?.toUpperCase() ?? '?'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 bg-muted/40 rounded-lg px-3 py-2">
                    <p className="text-xs font-medium">{c.author?.username}</p>
                    <p className="text-sm">{c.content}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Write a comment..."
                  value={commentDrafts[post.id] ?? ''}
                  onChange={(e) => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitComment(post.id); }}
                  className="h-9 text-sm"
                />
                <Button size="icon" className="h-9 w-9" onClick={() => submitComment(post.id)}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};
