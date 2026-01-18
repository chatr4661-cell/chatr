import { useState, useCallback } from 'react';

/**
 * Stub for local AI - disabled to reduce bundle size.
 * Re-enable by installing @huggingface/transformers.
 */

interface LocalAIState {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  supportsWebGPU: boolean;
  modelCached: boolean;
  gpuInfo: string | null;
}

interface LocalAIResult {
  intent: string;
  keywords: string[];
  suggestedQueries: string[];
  quickAnswer?: string;
  confidence: number;
  processingTimeMs: number;
}

export const useLocalAI = () => {
  const [state] = useState<LocalAIState>({
    isLoading: false,
    isReady: true,
    error: 'Local AI is disabled',
    supportsWebGPU: false,
    modelCached: false,
    gpuInfo: null,
  });

  const initializeLocalAI = useCallback(async () => {
    console.warn('Local AI is disabled');
  }, []);

  const analyzeIntent = useCallback(async (query: string): Promise<LocalAIResult> => {
    const keywords = query.split(/\s+/).filter(w => w.length > 2);
    return {
      intent: 'search',
      keywords,
      suggestedQueries: [`${query} near me`, `${query} best results`, `${query} today`],
      quickAnswer: undefined,
      confidence: 0.5,
      processingTimeMs: 0,
    };
  }, []);

  return {
    ...state,
    initializeLocalAI,
    analyzeIntent,
  };
};

export default useLocalAI;
