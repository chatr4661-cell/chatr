import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSpeechInput } from '@/voice/useSpeechInput';
import { useVoiceContext } from '@/voice/VoicePlayerContext';
import { useState } from 'react';

interface Props {
  onTranscript: (text: string) => void;
  className?: string;
  lang?: string;
}

/**
 * Push-to-talk mic button using on-device SpeechRecognition.
 * No audio leaves the device.
 */
export function VoiceInputButton({ onTranscript, className, lang }: Props) {
  const { prefs } = useVoiceContext();
  const [error, setError] = useState<string | null>(null);
  const { supported, listening, start, stop, interim } = useSpeechInput({
    lang,
    interimResults: true,
    onFinal: (t) => onTranscript(t),
    onError: (e) => setError(e),
  });

  if (!prefs.voice_input_enabled) return null;
  if (!supported) {
    return (
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn('h-9 w-9 opacity-50', className)}
        title="Voice input not supported on this device"
        disabled
      >
        <MicOff className="w-4 h-4" />
      </Button>
    );
  }

  const onPointerDown = (e: React.PointerEvent) => { e.preventDefault(); setError(null); start(); };
  const onPointerUp = (e: React.PointerEvent) => { e.preventDefault(); stop(); };

  return (
    <Button
      type="button"
      size="icon"
      variant={listening ? 'default' : 'ghost'}
      className={cn('h-9 w-9 select-none', listening && 'bg-destructive text-destructive-foreground animate-pulse', className)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={(e) => { if (listening) onPointerUp(e); }}
      title={listening ? `Listening… ${interim}` : 'Hold to talk'}
      aria-label="Hold to talk"
    >
      {listening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
    </Button>
  );
}
