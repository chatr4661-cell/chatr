import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
  expires_at: string;
  profile: {
    username: string;
    avatar_url: string | null;
  };
  has_viewed: boolean;
}

interface StoriesCarouselProps {
  userId: string;
}

export const StoriesCarousel = ({ userId }: StoriesCarouselProps) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadStories();

    // Subscribe to new stories
    const channel = supabase
      .channel('stories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => {
        loadStories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadStories = async () => {
    try {
      // Get active stories from contacts
      const { data: storiesData, error } = await supabase
        .from('stories')
        .select(`
          *,
          profile:profiles!stories_user_id_fkey(username, avatar_url)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check which stories have been viewed
      const storyIds = storiesData?.map(s => s.id) || [];
      const { data: viewsData } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('viewer_id', userId)
        .in('story_id', storyIds);

      const viewedIds = new Set(viewsData?.map(v => v.story_id) || []);

      const storiesWithViews = (storiesData || []).map(story => {
        const profileData = Array.isArray(story.profile) ? story.profile[0] : story.profile;
        return {
          ...story,
          profile: profileData || { username: 'Unknown', avatar_url: null },
          has_viewed: viewedIds.has(story.id)
        };
      });

      setStories(storiesWithViews);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStoryClick = (story: Story) => {
    navigate('/stories', { state: { selectedStory: story } });
  };

  const handleCreateStory = () => {
    navigate('/stories', { state: { createNew: true } });
  };

  if (loading) {
    return (
      <div className="flex gap-4 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-shrink-0">
            <div className="h-20 w-20 rounded-full bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 p-4">
        {/* Create Story Button */}
        <button
          onClick={handleCreateStory}
          className="flex-shrink-0 flex flex-col items-center gap-2 group"
        >
          <div className="relative h-20 w-20 rounded-full bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
            <Plus className="h-8 w-8 text-primary-foreground" />
          </div>
          <span className="text-xs font-medium">Add Story</span>
        </button>

        {/* Stories from contacts */}
        {stories.map((story) => (
          <button
            key={story.id}
            onClick={() => handleStoryClick(story)}
            className="flex-shrink-0 flex flex-col items-center gap-2 group"
          >
            <div
              className={`relative h-20 w-20 rounded-full ring-2 ${
                story.has_viewed
                  ? 'ring-muted'
                  : 'ring-gradient-to-br from-primary via-pink-500 to-orange-500'
              } p-0.5 group-hover:scale-105 transition-transform`}
            >
              <Avatar className="h-full w-full border-2 border-background">
                <AvatarImage src={story.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-lg">
                  {story.profile?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </div>
            <span className="text-xs font-medium max-w-[80px] truncate">
              {story.user_id === userId ? 'Your Story' : story.profile?.username}
            </span>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
};