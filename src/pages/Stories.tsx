import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Camera } from '@capacitor/camera';

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption?: string;
  created_at: string;
  expires_at: string;
  profile?: {
    username: string;
    avatar_url: string;
  };
}

const Stories = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        loadStories(session.user.id);
      }
    });
  }, [navigate]);

  const loadStories = async (userId: string) => {
    // Load all non-expired stories
    const { data: storiesData } = await supabase
      .from('stories')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (storiesData) {
      const mine = storiesData.filter((s: any) => s.user_id === userId);
      const others = storiesData.filter((s: any) => s.user_id !== userId);
      setMyStories(mine as any);
      setStories(others as any);
    }
  };

  const createStory = async () => {
    try {
      setIsUploading(true);
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: true,
        resultType: 'Base64' as any,
      });

      if (!photo.base64String) return;

      // Upload to storage
      const fileName = `story-${Date.now()}.${photo.format}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('social-media')
        .upload(fileName, Buffer.from(photo.base64String, 'base64'), {
          contentType: `image/${photo.format}`,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('social-media')
        .getPublicUrl(fileName);

      // Create story record
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

      const { error: storyError } = await supabase
        .from('stories' as any)
        .insert({
          user_id: user.id,
          media_url: publicUrl,
          media_type: 'image',
          expires_at: expiresAt.toISOString(),
        });

      if (storyError) throw storyError;

      toast({
        title: 'Success',
        description: 'Story posted successfully!',
      });

      loadStories(user.id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-background/95 backdrop-blur-md border-b sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/chat')}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Stories</h1>
          </div>
          <Button
            onClick={createStory}
            disabled={isUploading}
            size="icon"
            className="rounded-full"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Story Viewer */}
      {selectedStory ? (
        <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedStory(null)}
            className="absolute top-4 right-4 text-white z-10"
          >
            <X className="h-6 w-6" />
          </Button>
          
          <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
            <Avatar>
              <AvatarImage src={selectedStory.profile?.avatar_url || ''} />
              <AvatarFallback>{selectedStory.profile?.username?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white font-semibold">{selectedStory.profile?.username}</p>
              <p className="text-white/70 text-xs">
                {new Date(selectedStory.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <img
            src={selectedStory.media_url}
            alt="Story"
            className="max-h-screen max-w-full object-contain"
          />
        </div>
      ) : (
        <div className="max-w-2xl mx-auto p-4">
          {/* My Stories */}
          {myStories.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">Your Stories</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {myStories.map((story) => (
                  <div
                    key={story.id}
                    onClick={() => setSelectedStory(story)}
                    className="flex-shrink-0 cursor-pointer"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5">
                        <img
                          src={story.media_url}
                          alt="Story"
                          className="w-full h-full rounded-full object-cover border-2 border-background"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-center mt-1 max-w-[64px] truncate">You</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Others' Stories */}
          {stories.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">Stories</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {stories.map((story) => (
                  <div
                    key={story.id}
                    onClick={() => setSelectedStory(story)}
                    className="flex-shrink-0 cursor-pointer"
                  >
                    <div className="relative">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-0.5">
                        <Avatar className="w-full h-full border-2 border-background">
                          <AvatarImage src={story.profile?.avatar_url || ''} />
                          <AvatarFallback>{story.profile?.username?.[0]}</AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                    <p className="text-xs text-center mt-1 max-w-[64px] truncate">
                      {story.profile?.username}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {myStories.length === 0 && stories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No stories yet</p>
              <Button onClick={createStory} disabled={isUploading}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Story
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Stories;

