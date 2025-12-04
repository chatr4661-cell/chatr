import React, { useEffect, useState } from 'react';
import { Music, Play, Pause, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useProfileMusic } from '@/hooks/useProfileMusic';
import { cn } from '@/lib/utils';

interface ProfileMusicCardProps {
  userId: string;
  editable?: boolean;
  className?: string;
}

export const ProfileMusicCard = ({
  userId,
  editable = false,
  className
}: ProfileMusicCardProps) => {
  const { 
    music, 
    loading, 
    isPlaying, 
    fetchProfileMusic, 
    removeProfileMusic,
    playPreview, 
    stopPreview 
  } = useProfileMusic();

  useEffect(() => {
    fetchProfileMusic(userId);
  }, [userId, fetchProfileMusic]);

  if (loading) {
    return (
      <div className={cn("animate-pulse bg-muted rounded-lg h-16", className)} />
    );
  }

  if (!music) return null;

  return (
    <Card className={cn("p-3 bg-gradient-to-r from-primary/10 to-primary/5", className)}>
      <div className="flex items-center gap-3">
        {music.albumArtUrl ? (
          <img 
            src={music.albumArtUrl} 
            alt={music.trackName}
            className="w-12 h-12 rounded-md object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-md bg-primary/20 flex items-center justify-center">
            <Music className="w-6 h-6 text-primary" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">{music.trackName}</h4>
          {music.artistName && (
            <p className="text-xs text-muted-foreground truncate">{music.artistName}</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {music.previewUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={isPlaying ? stopPreview : playPreview}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
          )}

          {editable && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={removeProfileMusic}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
