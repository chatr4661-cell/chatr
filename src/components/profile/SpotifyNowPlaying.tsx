import React from 'react';
import { cn } from '@/lib/utils';
import { Music, Pause, Play } from 'lucide-react';

interface SpotifyNowPlayingProps {
  track: {
    name: string;
    artist: string;
    albumArt: string;
    isPlaying: boolean;
    previewUrl?: string;
  };
  compact?: boolean;
  className?: string;
}

export const SpotifyNowPlaying: React.FC<SpotifyNowPlayingProps> = ({
  track,
  compact = false,
  className,
}) => {
  const [isPlayingPreview, setIsPlayingPreview] = React.useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const togglePreview = () => {
    if (!track.previewUrl) return;

    if (isPlayingPreview) {
      audioRef.current?.pause();
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(track.previewUrl);
        audioRef.current.onended = () => setIsPlayingPreview(false);
      }
      audioRef.current.play();
    }
    setIsPlayingPreview(!isPlayingPreview);
  };

  React.useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 text-xs', className)}>
        <Music className="w-3 h-3 text-green-500" />
        <span className="text-muted-foreground truncate">
          {track.name} • {track.artist}
        </span>
      </div>
    );
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
          src={track.albumArt}
          alt={track.name}
          className="w-full h-full rounded-lg object-cover"
        />
        {track.previewUrl && (
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
            {track.isPlaying ? 'Now Playing' : 'Last Played'}
          </span>
        </div>
        <p className="font-medium truncate">{track.name}</p>
        <p className="text-sm text-muted-foreground truncate">{track.artist}</p>
      </div>

      {/* Playing animation */}
      {track.isPlaying && (
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
