/**
 * Live Transcription Hook - Feature #41
 * Real-time voice-to-text during calls
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TranscriptionSegment {
  id: string;
  text: string;
  speaker: 'local' | 'remote';
  timestamp: number;
  confidence: number;
}

interface UseLiveTranscriptionOptions {
  callId: string;
  enabled?: boolean;
  language?: string;
}

export const useLiveTranscription = ({ callId, enabled = true, language = 'en' }: UseLiveTranscriptionOptions) => {
  const [transcripts, setTranscripts] = useState<TranscriptionSegment[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const processAudioChunk = useCallback(async (audioBlob: Blob) => {
    try {
      // Convert blob to base64
      const buffer = await audioBlob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

      const { data, error: fnError } = await supabase.functions.invoke('live-transcription', {
        body: { audioBase64: base64, callId, language }
      });

      if (fnError) throw fnError;

      if (data?.transcription && data.transcription.length > 5) {
        const segment: TranscriptionSegment = {
          id: crypto.randomUUID(),
          text: data.transcription,
          speaker: 'local',
          timestamp: Date.now(),
          confidence: data.confidence || 0.9,
        };
        setTranscripts(prev => [...prev, segment]);
      }
    } catch (err) {
      console.error('[useLiveTranscription] Processing error:', err);
    }
  }, [callId, language]);

  const startTranscription = useCallback(async (stream: MediaStream) => {
    if (!enabled || isTranscribing) return;

    try {
      setIsTranscribing(true);
      setError(null);

      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio track available');
      }

      // Create audio-only stream
      const audioStream = new MediaStream(audioTracks);
      
      const mediaRecorder = new MediaRecorder(audioStream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          processAudioChunk(audioBlob);
          chunksRef.current = [];
        }
      };

      // Record in 5-second intervals for live transcription
      mediaRecorder.start();
      
      intervalRef.current = setInterval(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.start();
        }
      }, 5000);

      console.log('[useLiveTranscription] Started');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start transcription';
      setError(message);
      setIsTranscribing(false);
      console.error('[useLiveTranscription] Start error:', err);
    }
  }, [enabled, isTranscribing, processAudioChunk]);

  const stopTranscription = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
    setIsTranscribing(false);
    console.log('[useLiveTranscription] Stopped');
  }, []);

  const addRemoteTranscript = useCallback((text: string, confidence: number = 0.9) => {
    const segment: TranscriptionSegment = {
      id: crypto.randomUUID(),
      text,
      speaker: 'remote',
      timestamp: Date.now(),
      confidence,
    };
    setTranscripts(prev => [...prev, segment]);
  }, []);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  const getFullTranscript = useCallback(() => {
    return transcripts
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(t => `[${t.speaker === 'local' ? 'You' : 'Them'}]: ${t.text}`)
      .join('\n');
  }, [transcripts]);

  useEffect(() => {
    return () => {
      stopTranscription();
    };
  }, [stopTranscription]);

  return {
    transcripts,
    isTranscribing,
    error,
    startTranscription,
    stopTranscription,
    addRemoteTranscript,
    clearTranscripts,
    getFullTranscript,
  };
};
