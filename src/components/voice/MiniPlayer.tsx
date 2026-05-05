import { Pause, Play, SkipForward, X, Volume2 } from 'lucide-react';
import { useVoiceContext } from '@/voice/VoicePlayerContext';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function MiniPlayer() {
  const { isPlaying, isPaused, currentText, queue, pause, resume, stop, provider } = useVoiceContext();
  if (!currentText) return null;

  const next = () => { stop(); /* engine.onEnd not triggered by stop; let user manually replay */ };

  return (
    <div
      className={cn(
        'fixed bottom-20 left-1/2 -translate-x-1/2 z-[60]',
        'w-[min(92vw,420px)] rounded-2xl border border-border',
        'bg-background/85 backdrop-blur-xl shadow-lg',
        'px-3 py-2 flex items-center gap-2',
      )}
      role="region"
      aria-label="Voice mini player"
    >
      <div className="shrink-0 w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center">
        <Volume2 className="w-4 h-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{currentText}</p>
        <p className="text-[10px] text-muted-foreground">
          {provider === 'elevenlabs' ? 'Premium voice' : 'System voice'}
          {queue.length > 0 ? ` · ${queue.length} queued` : ''}
        </p>
      </div>
      {isPlaying && !isPaused ? (
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={pause} aria-label="Pause">
          <Pause className="w-4 h-4" />
        </Button>
      ) : (
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={resume} aria-label="Resume">
          <Play className="w-4 h-4" />
        </Button>
      )}
      {queue.length > 0 && (
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={next} aria-label="Skip">
          <SkipForward className="w-4 h-4" />
        </Button>
      )}
      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={stop} aria-label="Close">
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
