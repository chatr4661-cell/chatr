import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface VoiceRecorderProps {
  onTranscription: (text: string, audioUrl?: string) => void;
  onCancel: () => void;
}

export const VoiceRecorder = ({ onTranscription, onCancel }: VoiceRecorderProps) => {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await processAudio(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: 'Microphone Error',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        // Call transcription edge function
        const { data, error } = await supabase.functions.invoke('transcribe-voice', {
          body: { audio: base64Audio }
        });

        if (error) throw error;

        // Create audio URL for playback
        const audioUrl = URL.createObjectURL(audioBlob);
        
        onTranscription(data.text, audioUrl);
        
        toast({
          title: 'Voice message sent!',
          description: 'Transcription: ' + data.text.substring(0, 50) + '...',
        });
      };
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: 'Processing Error',
        description: 'Failed to process voice message. Please try again.',
        variant: 'destructive',
      });
      onCancel();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-4 bg-primary/5 rounded-lg">
      {!isRecording && !isProcessing && (
        <>
          <Button
            onClick={startRecording}
            variant="default"
            size="lg"
            className="rounded-full"
          >
            <Mic className="h-5 w-5 mr-2" />
            Start Recording
          </Button>
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
        </>
      )}
      
      {isRecording && (
        <>
          <div className="flex items-center gap-2 text-destructive animate-pulse">
            <div className="h-3 w-3 bg-destructive rounded-full" />
            <span className="font-medium">Recording...</span>
          </div>
          <Button
            onClick={stopRecording}
            variant="destructive"
            size="lg"
            className="rounded-full ml-auto"
          >
            <Square className="h-5 w-5 mr-2" />
            Stop & Send
          </Button>
        </>
      )}
      
      {isProcessing && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Processing voice message...</span>
        </div>
      )}
    </div>
  );
};
