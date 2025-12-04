import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Transcription {
  text: string;
  language?: string;
  confidence?: number;
  durationSeconds?: number;
}

export const useVoiceTranscription = () => {
  const [loading, setLoading] = useState(false);
  const [transcriptions, setTranscriptions] = useState<Map<string, Transcription>>(new Map());

  const transcribeVoiceMessage = useCallback(async (
    messageId: string,
    audioUrl: string
  ): Promise<Transcription | null> => {
    // Check cache first
    const cached = transcriptions.get(messageId);
    if (cached) return cached;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('transcribe-voice', {
        body: { audioUrl }
      });

      if (error) throw error;

      const transcription: Transcription = {
        text: data?.text || '',
        language: data?.language,
        confidence: data?.confidence,
        durationSeconds: data?.duration
      };

      // Cache locally
      setTranscriptions(prev => new Map(prev).set(messageId, transcription));

      // Store in database
      await supabase.from('voice_transcriptions').insert({
        message_id: messageId,
        transcription: transcription.text,
        language: transcription.language,
        confidence: transcription.confidence,
        duration_seconds: transcription.durationSeconds
      });

      return transcription;
    } catch (error) {
      console.error('Transcription failed:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [transcriptions]);

  const getStoredTranscription = useCallback(async (
    messageId: string
  ): Promise<Transcription | null> => {
    try {
      const { data } = await supabase
        .from('voice_transcriptions')
        .select('*')
        .eq('message_id', messageId)
        .single();

      if (!data) return null;

      return {
        text: data.transcription,
        language: data.language || undefined,
        confidence: data.confidence ? parseFloat(String(data.confidence)) : undefined,
        durationSeconds: data.duration_seconds || undefined
      };
    } catch {
      return null;
    }
  }, []);

  return {
    loading,
    transcribeVoiceMessage,
    getStoredTranscription,
    transcriptions
  };
};
