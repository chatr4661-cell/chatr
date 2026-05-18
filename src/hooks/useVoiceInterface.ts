import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { RealtimeChat } from '@/utils/RealtimeAudio';
import { supabase } from '@/integrations/supabase/client';

interface UseVoiceInterfaceOptions {
  onSpeakingChange?: (speaking: boolean) => void;
  onTranscriptUpdate?: (transcript: string) => void;
}

/**
 * Voice interface side-effects as a hook (replaces former render-null
 * VoiceInterface component). Owns the RealtimeChat lifecycle and cleanup.
 */
export function useVoiceInterface(options: UseVoiceInterfaceOptions = {}) {
  const { onSpeakingChange, onTranscriptUpdate } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const chatRef = useRef<RealtimeChat | null>(null);
  const transcriptRef = useRef('');

  useEffect(() => {
    return () => {
      chatRef.current?.disconnect();
      chatRef.current = null;
    };
  }, []);

  const handleMessage = useCallback(async (event: any) => {
    if (event.type === 'response.audio_transcript.delta') {
      transcriptRef.current += event.delta;
      onTranscriptUpdate?.(transcriptRef.current);
    } else if (event.type === 'response.audio_transcript.done') {
      transcriptRef.current = '';
    } else if (event.type === 'response.audio.delta') {
      setIsSpeaking(true);
      onSpeakingChange?.(true);
    } else if (event.type === 'response.audio.done') {
      setIsSpeaking(false);
      onSpeakingChange?.(false);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('user_streaks')
            .upsert(
              {
                user_id: user.id,
                streak_type: 'ai_chat',
                current_streak: 1,
                last_activity_date: new Date().toISOString().split('T')[0],
              },
              { onConflict: 'user_id,streak_type' }
            );
        }
      } catch (err) {
        console.error('[useVoiceInterface] streak update failed:', err);
      }
    }
  }, [onSpeakingChange, onTranscriptUpdate]);

  const startConversation = useCallback(async () => {
    if (chatRef.current) return;
    try {
      setIsLoading(true);
      chatRef.current = new RealtimeChat(handleMessage);
      await chatRef.current.init();
      setIsConnected(true);
      toast.success('Voice interface ready - start talking!');
    } catch (error) {
      console.error('[useVoiceInterface] start failed:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start conversation');
      chatRef.current = null;
    } finally {
      setIsLoading(false);
    }
  }, [handleMessage]);

  const endConversation = useCallback(() => {
    chatRef.current?.disconnect();
    chatRef.current = null;
    setIsConnected(false);
    setIsSpeaking(false);
    onSpeakingChange?.(false);
  }, [onSpeakingChange]);

  return { isConnected, isLoading, isSpeaking, startConversation, endConversation };
}
