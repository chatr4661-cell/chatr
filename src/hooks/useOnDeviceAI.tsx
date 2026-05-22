import { useState, useCallback, useEffect, useRef } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';

/**
 * On-device AI hook — routes to Android AICore (Gemini Nano) when available,
 * falls back to cloud (summarize-chat / smart-compose edge fns) otherwise.
 *
 * Zero server cost on supported devices (Pixel 8+/Galaxy S24+).
 */

interface OnDeviceAiPluginShape {
  checkAvailability(): Promise<{ available: boolean; status: string }>;
  generate(options: { system?: string; prompt: string }): Promise<{ text: string }>;
}

const OnDeviceAi =
  Capacitor.getPlatform() === 'android'
    ? registerPlugin<OnDeviceAiPluginShape>('OnDeviceAi')
    : null;

let availabilityCache: boolean | null = null;
const checkNativeAvailability = async (): Promise<boolean> => {
  if (availabilityCache !== null) return availabilityCache;
  if (!OnDeviceAi) return (availabilityCache = false);
  try {
    const r = await OnDeviceAi.checkAvailability();
    return (availabilityCache = !!r.available);
  } catch {
    return (availabilityCache = false);
  }
};

interface OnDeviceAIState {
  isLoading: boolean;
  isModelLoaded: boolean;
  progress: number;
  error: string | null;
  device: 'aicore' | 'cloud' | null;
}

export const useOnDeviceAI = () => {
  const [state, setState] = useState<OnDeviceAIState>({
    isLoading: false,
    isModelLoaded: false,
    progress: 0,
    error: null,
    device: null,
  });
  const checkedRef = useRef(false);

  useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    (async () => {
      const native = await checkNativeAvailability();
      setState((s) => ({
        ...s,
        isModelLoaded: true,
        device: native ? 'aicore' : 'cloud',
      }));
    })();
  }, []);

  const loadModel = useCallback(async () => {
    availabilityCache = null;
    const native = await checkNativeAvailability();
    setState((s) => ({ ...s, isModelLoaded: true, device: native ? 'aicore' : 'cloud' }));
  }, []);

  const generateText = useCallback(
    async (prompt: string, system?: string): Promise<string> => {
      const native = await checkNativeAvailability();
      if (native && OnDeviceAi) {
        try {
          const r = await OnDeviceAi.generate({ system, prompt });
          return r.text || '';
        } catch (e) {
          console.warn('[OnDeviceAI] native failed, falling back to cloud', e);
        }
      }
      // Cloud fallback via summarize-chat (generic enough for short prompts)
      try {
        const { data, error } = await supabase.functions.invoke('summarize-chat', {
          body: { messages: [{ sender: 'User', content: `${system ?? ''}\n${prompt}` }] },
        });
        if (error) throw error;
        return data?.summary ?? '';
      } catch {
        return '';
      }
    },
    []
  );

  const summarize = useCallback(
    async (messages: Array<{ sender?: string; content: string }>): Promise<string> => {
      const native = await checkNativeAvailability();
      if (native && OnDeviceAi) {
        try {
          const transcript = messages
            .map((m) => `${m.sender ?? 'User'}: ${m.content}`)
            .join('\n');
          const r = await OnDeviceAi.generate({
            system:
              'Summarize this conversation in 2-3 concise sentences. Highlight key decisions and action items.',
            prompt: transcript,
          });
          if (r.text?.trim()) return r.text.trim();
        } catch (e) {
          console.warn('[OnDeviceAI] summarize native failed', e);
        }
      }
      const { data, error } = await supabase.functions.invoke('summarize-chat', {
        body: { messages },
      });
      if (error) throw error;
      return data?.summary ?? '';
    },
    []
  );

  const analyzeSentiment = useCallback(async () => ({ label: 'NEUTRAL', score: 0.5 }), []);
  const getEmbeddings = useCallback(async (): Promise<number[][]> => [], []);
  const cleanup = useCallback(() => {}, []);

  return {
    ...state,
    loadModel,
    generateText,
    analyzeSentiment,
    summarize,
    getEmbeddings,
    cleanup,
  };
};

export const useSmartReplies = () => {
  const getSuggestedReplies = useCallback(
    async (recentMessages: Array<{ sender?: string; content: string }> = []): Promise<string[]> => {
      const native = await checkNativeAvailability();
      if (native && OnDeviceAi) {
        try {
          const context = recentMessages
            .slice(-5)
            .map((m) => `${m.sender ?? 'User'}: ${m.content}`)
            .join('\n');
          const r = await OnDeviceAi.generate({
            system:
              'Suggest exactly 3 short reply options (max 6 words each) to the latest message. Return ONLY the 3 replies separated by newlines, nothing else.',
            prompt: context,
          });
          const lines = (r.text || '')
            .split('\n')
            .map((l) => l.replace(/^[-•\d.\s]+/, '').trim())
            .filter(Boolean)
            .slice(0, 3);
          if (lines.length) return lines;
        } catch (e) {
          console.warn('[SmartReplies] native failed', e);
        }
      }
      try {
        const { data } = await supabase.functions.invoke('smart-compose', {
          body: { recentMessages, context: 'general conversation' },
        });
        return data?.suggestions ?? ['👍', 'Thanks!', 'Got it'];
      } catch {
        return ['👍', 'Thanks!', 'Got it'];
      }
    },
    []
  );

  return {
    isModelLoaded: true,
    isLoading: false,
    device: Capacitor.getPlatform() === 'android' ? 'aicore' : 'cloud',
    loadModel: async () => {},
    getSuggestedReplies,
  };
};
