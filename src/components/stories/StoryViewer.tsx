import { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

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
}

interface StoryViewerProps {
  stories: Story[];
  currentIndex: number;
  userId: string;
  onClose: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export const StoryViewer = ({
  stories,
  currentIndex,
  userId,
  onClose,
  onNext,
  onPrevious
}: StoryViewerProps) => {
  const [progress, setProgress] = useState(0);
  const [viewCount, setViewCount] = useState(0);
  const currentStory = stories[currentIndex];
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!currentStory) return;

    // Mark story as viewed
    markAsViewed(currentStory.id);

    // Load view count if it's the user's own story
    if (currentStory.user_id === userId) {
      loadViewCount(currentStory.id);
    }

    // Reset progress
    setProgress(0);

    // Auto-advance timer (5 seconds for images, longer for videos)
    const duration = currentStory.media_type === 'video' ? 15000 : 5000;
    const interval = 50;
    const increment = (interval / duration) * 100;

    timerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          onNext();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [currentIndex, currentStory?.id]);

  const markAsViewed = async (storyId: string) => {
    try {
      await supabase
        .from('story_views')
        .upsert({
          story_id: storyId,
          viewer_id: userId
        }, {
          onConflict: 'story_id,viewer_id'
        });
    } catch (error) {
      console.error('Error marking story as viewed:', error);
    }
  };

  const loadViewCount = async (storyId: string) => {
    try {
      const { count, error } = await supabase
        .from('story_views')
        .select('*', { count: 'exact', head: true })
        .eq('story_id', storyId);

      if (!error && count !== null) {
        setViewCount(count);
      }
    } catch (error) {
      console.error('Error loading view count:', error);
    }
  };

  if (!currentStory) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-10">
        {stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-10">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-white">
            <AvatarImage src={currentStory.profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {currentStory.profile?.username?.[0]?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="text-white">
            <p className="font-semibold">{currentStory.profile?.username}</p>
            <p className="text-xs opacity-75">
              {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentStory.user_id === userId && (
            <div className="flex items-center gap-1 text-white">
              <Eye className="h-4 w-4" />
              <span className="text-sm">{viewCount}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Navigation zones */}
      <button
        onClick={onPrevious}
        className="absolute left-0 top-0 bottom-0 w-1/3 z-5 flex items-center justify-start pl-4"
        disabled={currentIndex === 0}
      >
        {currentIndex > 0 && (
          <ChevronLeft className="h-8 w-8 text-white opacity-50 hover:opacity-100" />
        )}
      </button>

      <button
        onClick={onNext}
        className="absolute right-0 top-0 bottom-0 w-1/3 z-5 flex items-center justify-end pr-4"
      >
        <ChevronRight className="h-8 w-8 text-white opacity-50 hover:opacity-100" />
      </button>

      {/* Media */}
      <div className="absolute inset-0 flex items-center justify-center">
        {currentStory.media_type === 'image' ? (
          <img
            src={currentStory.media_url}
            alt="Story"
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <video
            src={currentStory.media_url}
            className="max-h-full max-w-full object-contain"
            autoPlay
            muted
            playsInline
          />
        )}
      </div>

      {/* Caption */}
      {currentStory.caption && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
          <p className="text-white text-center">{currentStory.caption}</p>
        </div>
      )}
    </div>
  );
};