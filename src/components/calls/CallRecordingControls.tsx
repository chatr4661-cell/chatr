import React, { useState } from 'react';
import { Video, Mic, MicOff, Circle, Square, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCallRecording } from '@/hooks/useCallRecording';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CallRecordingControlsProps {
  callId: string;
  stream: MediaStream | null;
  onRecordingStarted?: () => void;
  onRecordingStopped?: (recordingUrl: string) => void;
  className?: string;
}

export const CallRecordingControls = ({
  callId,
  stream,
  onRecordingStarted,
  onRecordingStopped,
  className
}: CallRecordingControlsProps) => {
  const { isRecording, startRecording, stopRecording } = useCallRecording();
  const [duration, setDuration] = useState(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    if (!stream) {
      toast.error('No audio stream available');
      return;
    }

    const success = await startRecording(callId, stream);
    if (success) {
      onRecordingStarted?.();
      const id = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
      setIntervalId(id);
    }
  };

  const handleStopRecording = async () => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
    setDuration(0);

    const recording = await stopRecording(callId);
    if (recording) {
      onRecordingStopped?.(recording.url);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {isRecording ? (
        <>
          <Badge variant="destructive" className="gap-1 animate-pulse">
            <Circle className="w-2 h-2 fill-current" />
            REC
          </Badge>
          <span className="text-sm font-mono">{formatDuration(duration)}</span>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1"
            onClick={handleStopRecording}
          >
            <Square className="w-3 h-3" />
            Stop
          </Button>
        </>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={handleStartRecording}
          disabled={!stream}
        >
          <Circle className="w-3 h-3 text-destructive" />
          Record
        </Button>
      )}
    </div>
  );
};
