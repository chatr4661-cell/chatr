import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceMessageBubbleProps {
  audioUrl: string;
  transcription: string;
  duration?: number;
  isSender: boolean;
}

export const VoiceMessageBubble = ({ 
  audioUrl, 
  transcription, 
  duration = 0,
  isSender 
}: VoiceMessageBubbleProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setAudioDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className={cn(
      "flex flex-col gap-2 p-3 rounded-2xl max-w-xs",
      isSender 
        ? "bg-primary text-primary-foreground" 
        : "bg-muted"
    )}>
      <div className="flex items-center gap-3">
        <Button
          onClick={togglePlay}
          size="icon"
          variant="ghost"
          className={cn(
            "rounded-full h-10 w-10 shrink-0",
            isSender 
              ? "hover:bg-primary-foreground/20 text-primary-foreground" 
              : "hover:bg-background"
          )}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
        </Button>

        <div className="flex-1">
          {/* Waveform Progress Bar */}
          <div className="relative h-8 flex items-center">
            <div className={cn(
              "h-1 rounded-full w-full",
              isSender ? "bg-primary-foreground/20" : "bg-background"
            )}>
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  isSender ? "bg-primary-foreground" : "bg-primary"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Time Display */}
          <div className="flex justify-between items-center mt-1">
            <span className={cn(
              "text-xs",
              isSender ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              {formatTime(currentTime)}
            </span>
            <span className={cn(
              "text-xs",
              isSender ? "text-primary-foreground/70" : "text-muted-foreground"
            )}>
              {formatTime(audioDuration)}
            </span>
          </div>
        </div>
      </div>

      {/* Transcription */}
      {transcription && (
        <p className={cn(
          "text-sm leading-relaxed",
          isSender ? "text-primary-foreground/90" : "text-foreground/90"
        )}>
          {transcription}
        </p>
      )}

      <audio ref={audioRef} src={audioUrl} className="hidden" />
    </div>
  );
};
