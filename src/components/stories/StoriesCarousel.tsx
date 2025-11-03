import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface StoriesCarouselProps {
  userId: string;
}

export const StoriesCarousel = ({ userId }: StoriesCarouselProps) => {
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadStories();

    const channel = supabase.channel('stories-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => {
      loadStories();
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadStories = async () => {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select(`
          *,
          profile:profiles!stories_user_id_fkey(id, username, avatar_url),
          views:story_views(viewer_id)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const groupedStories = data?.reduce((acc: any[], story) => {
        const profileData = Array.isArray(story.profile) ? story.profile[0] : story.profile;
        const existingUser = acc.find(s => s.user_id === story.user_id);
        
        if (existingUser) {
          existingUser.stories.push(story);
        } else {
          acc.push({
            user_id: story.user_id,
            username: profileData?.username || 'Unknown',
            avatar_url: profileData?.avatar_url,
            stories: [story],
            hasViewed: story.views?.some((v: any) => v.viewer_id === userId) || false
          });
        }
        
        return acc;
      }, []) || [];

      setStories(groupedStories);
    } catch (error) {
      console.error('Error loading stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStoryClick = (story: any) => {
    navigate('/stories', { state: { selectedStory: story.stories[0] } });
  };

  const handleCreateStory = () => {
    navigate('/stories', { state: { createNew: true } });
  };

  if (loading) {
    return (
      <div className="flex gap-4 p-4 overflow-x-auto">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-muted" />
            <div className="w-12 h-3 rounded bg-muted" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 p-4 overflow-x-auto scrollbar-hide">
      <div className="flex flex-col items-center gap-2 shrink-0">
        <Button onClick={handleCreateStory} variant="outline" className="w-16 h-16 rounded-full border-2 border-dashed border-primary p-0 hover:bg-primary/10">
          <Plus className="h-6 w-6 text-primary" />
        </Button>
        <span className="text-xs text-muted-foreground">Add Story</span>
      </div>

      {stories.map((story) => (
        <div key={story.user_id} className="flex flex-col items-center gap-2 shrink-0 cursor-pointer" onClick={() => handleStoryClick(story)}>
          <div className={cn("p-0.5 rounded-full", story.hasViewed ? "bg-muted" : "bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600")}>
            <Avatar className="w-16 h-16 border-2 border-background">
              <AvatarImage src={story.avatar_url} />
              <AvatarFallback className="bg-primary text-white">{story.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
          <span className="text-xs text-foreground max-w-[64px] truncate">
            {story.user_id === userId ? 'Your Story' : story.username}
          </span>
        </div>
      ))}
    </div>
  );
};
