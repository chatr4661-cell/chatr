import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ChevronLeft, ChevronRight, X, Eye } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';

interface Story {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
  view_count: number;
}

interface StoryViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stories: Story[];
  initialIndex?: number;
}

export function StoryViewer({ open, onOpenChange, stories, initialIndex = 0 }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);

  const currentStory = stories[currentIndex];

  useEffect(() => {
    if (!open) return;
    
    setLoading(true);
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNext();
          return 0;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [open, currentIndex]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setProgress(0);
    } else {
      onOpenChange(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setProgress(0);
    }
  };

  if (!currentStory) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 bg-black border-0">
        <div className="relative h-[600px] bg-black">
          {/* Progress bars */}
          <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
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
          <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Avatar className="w-8 h-8 border-2 border-white">
                <AvatarImage src={currentStory.avatar_url || ''} />
                <AvatarFallback>{currentStory.username[0]}</AvatarFallback>
              </Avatar>
              <div>
                <div className="text-white text-sm font-semibold">{currentStory.username}</div>
                <div className="text-white/70 text-xs">
                  {formatDistanceToNow(new Date(currentStory.created_at), { addSuffix: true })}
                </div>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-white p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Story content */}
          <div className="h-full flex items-center justify-center">
            {currentStory.media_type === 'image' ? (
              <img
                src={currentStory.media_url}
                alt="Story"
                className="max-w-full max-h-full object-contain"
                onLoad={() => setLoading(false)}
              />
            ) : (
              <div className="bg-muted/20 rounded-lg p-12 text-white/50">
                Video Story (Placeholder)
              </div>
            )}
            
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* View count */}
          <div className="absolute bottom-4 left-4 flex items-center gap-1 text-white text-sm">
            <Eye className="w-4 h-4" />
            <span>{currentStory.view_count}</span>
          </div>

          {/* Navigation */}
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 text-white disabled:opacity-30"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === stories.length - 1}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white disabled:opacity-30"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
