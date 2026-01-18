import { useState, useCallback } from 'react';

/**
 * Stub for on-device AI - disabled to reduce bundle size.
 * Re-enable by installing @huggingface/transformers.
 */

interface OnDeviceAIState {
  isLoading: boolean;
  isModelLoaded: boolean;
  progress: number;
  error: string | null;
  device: 'webgpu' | 'wasm' | null;
}

export const useOnDeviceAI = () => {
  const [state] = useState<OnDeviceAIState>({
    isLoading: false,
    isModelLoaded: false,
    progress: 0,
    error: 'On-device AI is disabled',
    device: null,
  });

  const loadModel = useCallback(async () => {
    console.warn('On-device AI is disabled');
  }, []);

  const generateText = useCallback(async (): Promise<string> => {
    return '';
  }, []);

  const analyzeSentiment = useCallback(async () => {
    return { label: 'NEUTRAL', score: 0.5 };
  }, []);

  const summarize = useCallback(async (): Promise<string> => {
    return '';
  }, []);

  const getEmbeddings = useCallback(async (): Promise<number[][]> => {
    return [];
  }, []);

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
  const getSuggestedReplies = useCallback(async (): Promise<string[]> => {
    return ['👍', 'Thanks!', 'Got it'];
  }, []);

  return {
    isModelLoaded: false,
    isLoading: false,
    device: null,
    loadModel: async () => {},
    getSuggestedReplies,
  };
};
