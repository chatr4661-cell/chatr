import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Music, Pause, Play } from 'lucide-react';
import { useSpotifyStatus } from '@/hooks/useSpotifyStatus';

interface SpotifyNowPlayingProps {
  userId?: string;
  className?: string;
}

export const SpotifyNowPlaying: React.FC<SpotifyNowPlayingProps> = ({
  userId,
  className,
}) => {
  const { status, isLoading } = useSpotifyStatus(userId);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const currentTrack = status.currentTrack;
  const isPlaying = status.isPlaying;

  const togglePreview = () => {
    if (!currentTrack?.previewUrl) return;

    if (isPlayingPreview) {
      audioRef.current?.pause();
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(currentTrack.previewUrl);
        audioRef.current.onended = () => setIsPlayingPreview(false);
      }
      audioRef.current.play();
    }
    setIsPlayingPreview(!isPlayingPreview);
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  if (isLoading) {
    return (
      <div className={cn('animate-pulse bg-muted h-16 rounded-xl', className)} />
    );
  }

  if (!currentTrack) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl',
        'bg-gradient-to-r from-green-500/10 to-green-600/5',
        'border border-green-500/20',
        className
      )}
    >
      {/* Album art */}
      <div className="relative w-12 h-12 shrink-0">
        <img
          src={currentTrack.albumArt}
          alt={currentTrack.name}
          className="w-full h-full rounded-lg object-cover"
        />
        {currentTrack.previewUrl && (
          <button
            onClick={togglePreview}
            className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity rounded-lg"
          >
            {isPlayingPreview ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white" />
            )}
          </button>
        )}
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <Music className="w-3.5 h-3.5 text-green-500 shrink-0" />
          <span className="text-xs text-green-500 font-medium">
            {isPlaying ? 'Now Playing' : 'Last Played'}
          </span>
        </div>
        <p className="font-medium truncate">{currentTrack.name}</p>
        <p className="text-sm text-muted-foreground truncate">{currentTrack.artist}</p>
      </div>

      {/* Playing animation */}
      {isPlaying && (
        <div className="flex items-end gap-0.5 h-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-1 bg-green-500 rounded-full animate-pulse"
              style={{
                height: `${40 + Math.random() * 60}%`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
