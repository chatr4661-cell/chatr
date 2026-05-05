import { Volume2, VolumeX } from 'lucide-react';
import { useVoice } from '@/voice/useVoice';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

interface Props {
  variant?: 'switch' | 'icon';
  className?: string;
}

export function VoiceToggle({ variant = 'switch', className }: Props) {
  const { isAutoReadEnabled, toggleAutoRead } = useVoice();

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={toggleAutoRead}
        aria-pressed={isAutoReadEnabled}
        aria-label={isAutoReadEnabled ? 'Auto-read on' : 'Auto-read off'}
        className={cn(
          'inline-flex items-center justify-center h-8 w-8 rounded-full transition-colors',
          isAutoReadEnabled ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-muted',
          className,
        )}
      >
        {isAutoReadEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <label className={cn('flex items-center justify-between gap-3 py-2', className)}>
      <span className="flex items-center gap-2 text-sm">
        {isAutoReadEnabled ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
        Auto-read incoming messages
      </span>
      <Switch checked={isAutoReadEnabled} onCheckedChange={toggleAutoRead} />
    </label>
  );
}
