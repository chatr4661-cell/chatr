import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Brain, Heart, MessageCircle, Share2, Upload, Sparkles, TrendingUp, Award, Image as ImageIcon, Smile, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Post {
  id: string;
  user_id: string;
  content: string;
  media_urls: string[];
  likes_count: number;
  comments_count: number;
  created_at: string;
  mood?: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
  isLiked?: boolean;
}

const YouthEngagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedMood, setSelectedMood] = useState<string>('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [sharePost, setSharePost] = useState<Post | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const moods = [
    { emoji: '😊', label: 'Happy' },
    { emoji: '😔', label: 'Sad' },
    { emoji: '😌', label: 'Calm' },
    { emoji: '😰', label: 'Anxious' },
    { emoji: '😤', label: 'Frustrated' },
    { emoji: '🤗', label: 'Grateful' },
    { emoji: '💪', label: 'Motivated' },
    { emoji: '😴', label: 'Tired' },
  ];

  useEffect(() => {
    loadCurrentUser();
    loadPosts();
    subscribeToRealtime();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setCurrentUser({ ...user, profile });
    }
  };

  const loadPosts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: posts, error } = await supabase
        .from('youth_posts')
        .select('*, profiles!inner(username, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (user) {
        const { data: likes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id);

        const likedPostIds = new Set(likes?.map(l => l.post_id) || []);
        
        setPosts(posts.map(p => ({
          ...p,
          isLiked: likedPostIds.has(p.id)
        })));
      } else {
        setPosts(posts);
      }
    } catch (error: any) {
      console.error('Error loading feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToRealtime = () => {
    const channel = supabase
      .channel('youth-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'youth_posts' }, () => {
        loadPosts();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, () => {
        loadPosts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && selectedImages.length === 0) return;
    if (!currentUser) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to create posts',
        variant: 'destructive',
      });
      return;
    }

    setPosting(true);
    try {
      const mediaUrls: string[] = [];
      const mediaTypes: string[] = [];

      // Upload images if any
      for (const file of selectedImages) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUser.id}/${Date.now()}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('social-media')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('social-media')
          .getPublicUrl(fileName);

        mediaUrls.push(publicUrl);
        mediaTypes.push(file.type);
      }

      const { error } = await supabase
        .from('youth_posts')
        .insert({
          user_id: currentUser.id,
          content: newPostContent,
          media_urls: mediaUrls,
          media_types: mediaTypes,
          mood: selectedMood,
        });

      if (error) throw error;

      toast({
        title: '🎉 Post shared!',
        description: 'Your thoughts are now part of the community',
      });

      setNewPostContent('');
      setSelectedMood('');
      setSelectedImages([]);
      loadPosts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setPosting(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedImages(prev => [...prev, ...files].slice(0, 4)); // Max 4 images
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleShare = (post: Post) => {
    setSharePost(post);
    setShowShareDialog(true);
  };

  const copyShareLink = () => {
    const shareText = `Check out this post: ${sharePost?.content.substring(0, 100)}...`;
    navigator.clipboard.writeText(shareText);
    toast({
      title: 'Copied!',
      description: 'Post content copied to clipboard',
    });
    setShowShareDialog(false);
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!currentUser) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to like posts',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUser.id);

        const { data: post } = await supabase
          .from('youth_posts')
          .select('likes_count')
          .eq('id', postId)
          .single();

        if (post) {
          await supabase
            .from('youth_posts')
            .update({ likes_count: Math.max(0, post.likes_count - 1) })
            .eq('id', postId);
        }
      } else {
        await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: currentUser.id });

        const { data: post } = await supabase
          .from('youth_posts')
          .select('likes_count')
          .eq('id', postId)
          .single();

        if (post) {
          await supabase
            .from('youth_posts')
            .update({ likes_count: post.likes_count + 1 })
            .eq('id', postId);
        }
      }

      loadPosts();
    } catch (error: any) {
      console.error('Error liking post:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 pb-20">
      {/* Header */}
      <div className="p-4 border-b border-glass-border backdrop-blur-glass bg-gradient-glass sticky top-0 z-50">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-glow">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Mental Health Hub</h1>
            <p className="text-sm text-muted-foreground">Share, connect, grow together</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Engagement Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-glass-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">{posts.length}</p>
                <p className="text-xs text-muted-foreground">Posts Today</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-pink-500/10 to-rose-500/10 border-glass-border">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-pink-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {posts.reduce((sum, p) => sum + p.likes_count, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Likes</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 bg-gradient-to-br from-green-500/10 to-teal-500/10 border-glass-border">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-foreground">Active</p>
                <p className="text-xs text-muted-foreground">Community</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Create Post */}
        <Card className="p-4 backdrop-blur-glass bg-gradient-glass border-glass-border">
          <div className="flex gap-3">
            <Avatar>
              <AvatarImage src={currentUser?.profile?.avatar_url} />
              <AvatarFallback>
                {currentUser?.profile?.username?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                placeholder="Share your wellness journey, thoughts, or ask for support..."
                className="min-h-[80px] bg-background/50"
              />
              
              {/* Selected Mood Display */}
              {selectedMood && (
                <div className="flex items-center gap-2 text-sm">
                  <span>Feeling:</span>
                  <div className="flex items-center gap-1 px-3 py-1 bg-primary/10 rounded-full">
                    <span>{selectedMood}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => setSelectedMood('')}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Image Preview */}
              {selectedImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {selectedImages.map((file, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-1 right-1 h-6 w-6 p-0 rounded-full"
                        onClick={() => removeImage(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={selectedImages.length >= 4}
                  >
                    <ImageIcon className="w-4 h-4 mr-1" />
                    Photo
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowMoodPicker(true)}
                  >
                    <Smile className="w-4 h-4 mr-1" />
                    Mood
                  </Button>
                </div>
                <Button
                  onClick={handleCreatePost}
                  disabled={posting || (!newPostContent.trim() && selectedImages.length === 0)}
                  className="shadow-glow"
                >
                  {posting ? 'Sharing...' : 'Share'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Posts Feed */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading your community feed...</p>
          </div>
        ) : posts.length === 0 ? (
          <Card className="p-12 text-center backdrop-blur-glass bg-gradient-glass border-glass-border">
            <Brain className="w-16 h-16 mx-auto mb-4 text-primary opacity-50" />
            <h3 className="text-xl font-bold text-foreground mb-2">Start the Conversation</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to share your wellness journey with the community
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Card key={post.id} className="backdrop-blur-glass bg-gradient-glass border-glass-border hover:shadow-glow transition-shadow">
                <CardContent className="p-4">
                  {/* Post Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar>
                      <AvatarImage src={post.profiles.avatar_url} />
                      <AvatarFallback>{post.profiles.username[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{post.profiles.username}</p>
                        {post.mood && <span className="text-lg">{post.mood}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {/* Post Content */}
                  <p className="text-foreground mb-4 whitespace-pre-wrap">{post.content}</p>

                  {/* Post Media */}
                  {post.media_urls && post.media_urls.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {post.media_urls.map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt="Post media"
                          className="rounded-lg w-full object-cover aspect-square"
                        />
                      ))}
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="flex gap-4 pt-3 border-t border-glass-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id, post.isLiked || false)}
                      className={post.isLiked ? 'text-pink-500' : ''}
                    >
                      <Heart className={`w-4 h-4 mr-2 ${post.isLiked ? 'fill-current' : ''}`} />
                      {post.likes_count}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {post.comments_count}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleShare(post)}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Mood Picker Dialog */}
      <Dialog open={showMoodPicker} onOpenChange={setShowMoodPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>How are you feeling?</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-3">
            {moods.map((mood) => (
              <Button
                key={mood.label}
                variant="outline"
                className="flex flex-col items-center gap-2 h-auto py-4"
                onClick={() => {
                  setSelectedMood(`${mood.emoji} ${mood.label}`);
                  setShowMoodPicker(false);
                }}
              >
                <span className="text-3xl">{mood.emoji}</span>
                <span className="text-xs">{mood.label}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this post with your friends and community
            </p>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm line-clamp-3">{sharePost?.content}</p>
            </div>
            <Button onClick={copyShareLink} className="w-full">
              Copy to Clipboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default YouthEngagement;
