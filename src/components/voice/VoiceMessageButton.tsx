import { Volume2, Loader2 } from 'lucide-react';
import { useVoice } from '@/voice/useVoice';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  text: string;
  messageId: string;
  className?: string;
}

export function VoiceMessageButton({ text, messageId, className }: Props) {
  const { speak, currentMessageId, isPlaying } = useVoice();
  const active = currentMessageId === messageId && isPlaying;

  if (!text?.trim()) return null;

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className={cn('h-7 w-7 rounded-full', active && 'text-primary', className)}
      onClick={(e) => { e.stopPropagation(); speak(text, messageId); }}
      aria-label={active ? 'Playing message' : 'Listen to message'}
      title="Listen"
    >
      {active ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
    </Button>
  );
}
