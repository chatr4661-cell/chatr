import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';

interface Story {
  id: string;
  user_id: string;
  media_url: string | null;
  media_type: 'image' | 'video' | 'text';
  caption: string;
  created_at: string;
  expires_at: string;
  profile?: {
    username: string;
    avatar_url: string;
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

export const StoryViewer = ({ stories, currentIndex, userId, onClose, onNext, onPrevious }: StoryViewerProps) => {
  const [progress, setProgress] = useState(0);
  const currentStory = stories[currentIndex];
  const duration = currentStory.media_type === 'video' ? 15000 : 5000;

  useEffect(() => {
    const markAsViewed = async () => {
      await supabase.from('story_views').upsert({
        story_id: currentStory.id,
        viewer_id: userId,
        viewed_at: new Date().toISOString()
      }, { onConflict: 'story_id,viewer_id' });
    };

    markAsViewed();

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = (elapsed / duration) * 100;
      
      if (newProgress >= 100) {
        onNext();
      } else {
        setProgress(newProgress);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [currentStory.id, currentIndex, duration, userId, onNext]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setProgress(0);
      onPrevious();
    }
  };

  const handleNext = () => {
    setProgress(0);
    onNext();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-10 flex gap-1 p-2">
        {stories.map((_, idx) => (
          <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white transition-all" style={{ width: idx < currentIndex ? '100%' : idx === currentIndex ? `${progress}%` : '0%' }} />
          </div>
        ))}
      </div>

      <div className="absolute top-4 left-0 right-0 z-10 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-white">
            <AvatarImage src={currentStory.profile?.avatar_url} />
            <AvatarFallback className="bg-primary text-white">{currentStory.profile?.username?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-white font-semibold text-sm">{currentStory.profile?.username}</p>
            <p className="text-white/70 text-xs">{getTimeAgo(currentStory.created_at)}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20">
          <X className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center relative">
        <div className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer z-5" onClick={handlePrevious} />
        <div className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer z-5" onClick={handleNext} />

        {currentStory.media_type === 'text' ? (
          <div className="w-full h-full flex items-center justify-center p-8">
            <p className="text-white text-2xl text-center leading-relaxed max-w-lg">{currentStory.caption}</p>
          </div>
        ) : currentStory.media_type === 'video' ? (
          <video src={currentStory.media_url!} className="w-full h-full object-contain" autoPlay playsInline muted />
        ) : (
          <img src={currentStory.media_url!} alt="Story" className="w-full h-full object-contain" />
        )}

        {currentStory.caption && currentStory.media_type !== 'text' && (
          <div className="absolute bottom-8 left-0 right-0 px-6">
            <p className="text-white text-lg text-center drop-shadow-lg">{currentStory.caption}</p>
          </div>
        )}
      </div>

      {currentIndex > 0 && (
        <button onClick={handlePrevious} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors z-10">
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
      )}
      {currentIndex < stories.length - 1 && (
        <button onClick={handleNext} className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full hover:bg-black/70 transition-colors z-10">
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
      )}
    </div>
  );
};

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
