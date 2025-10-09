import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Trash2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceMessageRecorderProps {
  onSend: (audioBlob: Blob, duration: number) => void;
  onCancel: () => void;
}

export const VoiceMessageRecorder = ({ onSend, onCancel }: VoiceMessageRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);

      // Start timer
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive"
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const handleSend = () => {
    if (audioBlob) {
      onSend(audioBlob, duration);
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      stopRecording();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setDuration(0);
    setAudioBlob(null);
    onCancel();
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-20 left-0 right-0 bg-card border-t border-border p-4 flex items-center justify-between gap-4 animate-slide-up">
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCancel}
        className="text-destructive"
      >
        <Trash2 className="h-5 w-5" />
      </Button>

      {!isRecording && !audioBlob && (
        <Button
          variant="default"
          size="lg"
          onClick={startRecording}
          className="flex-1"
        >
          <Mic className="h-5 w-5 mr-2" />
          Start Recording
        </Button>
      )}

      {isRecording && (
        <>
          <div className="flex-1 flex items-center gap-3">
            <div className="w-3 h-3 bg-destructive rounded-full animate-pulse" />
            <span className="text-lg font-mono">{formatDuration(duration)}</span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary animate-pulse" style={{ width: '100%' }} />
            </div>
          </div>
          <Button
            variant="destructive"
            size="icon"
            onClick={stopRecording}
          >
            <Square className="h-5 w-5" />
          </Button>
        </>
      )}

      {audioBlob && !isRecording && (
        <>
          <div className="flex-1">
            <audio src={URL.createObjectURL(audioBlob)} controls className="w-full" />
            <p className="text-xs text-muted-foreground mt-1">Duration: {formatDuration(duration)}</p>
          </div>
          <Button
            variant="default"
            size="icon"
            onClick={handleSend}
          >
            <Send className="h-5 w-5" />
          </Button>
        </>
      )}
    </div>
  );
};
