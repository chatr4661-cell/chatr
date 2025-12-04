import React, { useState, useEffect } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useVoiceTranscription } from '@/hooks/useVoiceTranscription';
import { cn } from '@/lib/utils';

interface VoiceTranscriptProps {
  messageId: string;
  audioUrl: string;
  className?: string;
}

export const VoiceTranscript = ({
  messageId,
  audioUrl,
  className
}: VoiceTranscriptProps) => {
  const { loading, transcribeVoiceMessage, getStoredTranscription } = useVoiceTranscription();
  const [transcript, setTranscript] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    // Check for existing transcription
    const checkExisting = async () => {
      const existing = await getStoredTranscription(messageId);
      if (existing) {
        setTranscript(existing.text);
      }
    };
    checkExisting();
  }, [messageId, getStoredTranscription]);

  const handleTranscribe = async () => {
    if (transcript) {
      setShowTranscript(!showTranscript);
      return;
    }

    const result = await transcribeVoiceMessage(messageId, audioUrl);
    if (result) {
      setTranscript(result.text);
      setShowTranscript(true);
    }
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 px-2 text-xs gap-1 self-start"
        onClick={handleTranscribe}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <FileText className="w-3 h-3" />
        )}
        {transcript ? (showTranscript ? 'Hide' : 'Show') : 'Transcribe'}
      </Button>

      {showTranscript && transcript && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 mt-1">
          {transcript}
        </div>
      )}
    </div>
  );
};
