import { useState, useCallback, useEffect } from 'react';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { toast } from 'sonner';

export interface SpeechRecognitionResult {
  transcription: string;
  confidence?: number;
}

/**
 * Premium speech recognition hook
 * Supports voice search, AI assistant input, and voice commands
 */
export const useSpeechRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);

  // Check availability on mount
  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const { available } = await SpeechRecognition.available();
        setIsAvailable(available);
      } catch {
        setIsAvailable(false);
      }
    };
    checkAvailability();
  }, []);

  /**
   * Request microphone permissions
   */
  const requestPermissions = useCallback(async () => {
    try {
      const { available } = await SpeechRecognition.available();
      if (!available) {
        toast.error('Speech recognition not available');
        return false;
      }

      const { speechRecognition } = await SpeechRecognition.requestPermissions();
      
      if (speechRecognition === 'granted') {
        return true;
      }
      
      toast.error('Microphone permission denied');
      return false;
    } catch (error) {
      console.error('Permission request failed:', error);
      return false;
    }
  }, []);

  /**
   * Start continuous listening (for real-time transcription)
   */
  const startListening = useCallback(async (options?: {
    language?: string;
    maxResults?: number;
    prompt?: string;
    partialResults?: boolean;
  }) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      setIsListening(true);
      setTranscript('');
      setPartialTranscript('');

      await SpeechRecognition.start({
        language: options?.language || 'en-US',
        maxResults: options?.maxResults || 5,
        prompt: options?.prompt || 'Speak now...',
        partialResults: options?.partialResults !== false,
        popup: false
      });

      // Listen for matches
      SpeechRecognition.addListener('partialResults', (data: any) => {
        if (data.matches && data.matches.length > 0) {
          setPartialTranscript(data.matches[0]);
        }
      });

      SpeechRecognition.addListener('listeningState', (data: any) => {
        setIsListening(data.status === 'started');
      });

    } catch (error) {
      console.error('Speech recognition failed:', error);
      toast.error('Voice recognition failed');
      setIsListening(false);
    }
  }, [requestPermissions]);

  /**
   * Stop listening
   */
  const stopListening = useCallback(async () => {
    try {
      await SpeechRecognition.stop();
      setIsListening(false);
      
      if (partialTranscript) {
        setTranscript(partialTranscript);
      }
    } catch (error) {
      console.error('Stop listening failed:', error);
    }
  }, [partialTranscript]);

  /**
   * One-shot recognition (single command/phrase)
   */
  const getSingleResult = useCallback(async (options?: {
    language?: string;
    maxResults?: number;
    prompt?: string;
  }): Promise<SpeechRecognitionResult | null> => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return null;

    try {
      setIsListening(true);

      const result = await SpeechRecognition.start({
        language: options?.language || 'en-US',
        maxResults: options?.maxResults || 1,
        prompt: options?.prompt || 'Speak now...',
        partialResults: false,
        popup: true
      });

      setIsListening(false);

      if (result.matches && result.matches.length > 0) {
        const transcription = result.matches[0];
        setTranscript(transcription);
        return {
          transcription,
          confidence: 1.0
        };
      }

      return null;
    } catch (error) {
      console.error('Single result failed:', error);
      setIsListening(false);
      return null;
    }
  }, [requestPermissions]);

  /**
   * Check if speech recognition is available
   */
  const checkAvailability = useCallback(async () => {
    try {
      const { available } = await SpeechRecognition.available();
      return available;
    } catch {
      return false;
    }
  }, []);

  /**
   * Get supported languages
   */
  const getSupportedLanguages = useCallback(async () => {
    try {
      const { languages } = await SpeechRecognition.getSupportedLanguages();
      return languages;
    } catch {
      return [];
    }
  }, []);

  return {
    isListening,
    transcript,
    partialTranscript,
    startListening,
    stopListening,
    getSingleResult,
    checkAvailability,
    getSupportedLanguages,
    requestPermissions,
    isAvailable,
    clearTranscript: () => setTranscript('')
  };
};
