import { useState, useCallback, useRef } from 'react';
import { pipeline } from '@huggingface/transformers';

type AITask = 'text-generation' | 'sentiment-analysis' | 'summarization' | 'feature-extraction';

interface OnDeviceAIState {
  isLoading: boolean;
  isModelLoaded: boolean;
  progress: number;
  error: string | null;
  device: 'webgpu' | 'wasm' | null;
}

interface UseOnDeviceAIOptions {
  task?: AITask;
  model?: string;
  preferWebGPU?: boolean;
}

// Default models for each task (small, efficient models)
const DEFAULT_MODELS: Record<AITask, string> = {
  'text-generation': 'Xenova/Qwen1.5-0.5B-Chat',
  'sentiment-analysis': 'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
  'summarization': 'Xenova/distilbart-cnn-6-6',
  'feature-extraction': 'Xenova/all-MiniLM-L6-v2',
};

export const useOnDeviceAI = (options: UseOnDeviceAIOptions = {}) => {
  const {
    task = 'text-generation',
    model = DEFAULT_MODELS[task],
    preferWebGPU = true,
  } = options;

  const [state, setState] = useState<OnDeviceAIState>({
    isLoading: false,
    isModelLoaded: false,
    progress: 0,
    error: null,
    device: null,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pipelineRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check WebGPU support
  const checkWebGPU = useCallback(async (): Promise<boolean> => {
    if (!preferWebGPU) return false;
    try {
      // @ts-ignore - WebGPU API
      if (!navigator.gpu) return false;
      // @ts-ignore - WebGPU API
      const adapter = await navigator.gpu.requestAdapter();
      return !!adapter;
    } catch {
      return false;
    }
  }, [preferWebGPU]);

  // Initialize the model
  const loadModel = useCallback(async () => {
    if (pipelineRef.current || state.isLoading) return;

    setState(prev => ({ ...prev, isLoading: true, error: null, progress: 0 }));

    try {
      const hasWebGPU = await checkWebGPU();
      const device = hasWebGPU ? 'webgpu' : 'wasm';

      console.log(`🤖 Loading ${task} model on ${device}:`, model);

      // @ts-ignore - dynamic pipeline creation
      pipelineRef.current = await pipeline(task as any, model, {
        device: device as any,
        progress_callback: (progress: any) => {
          if (progress.status === 'progress') {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setState(prev => ({ ...prev, progress: percent }));
          }
        },
      });

      setState(prev => ({
        ...prev,
        isLoading: false,
        isModelLoaded: true,
        progress: 100,
        device,
      }));

      console.log(`✅ Model loaded successfully on ${device}`);
    } catch (error) {
      console.error('Failed to load AI model:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load model',
      }));
    }
  }, [task, model, checkWebGPU, state.isLoading]);

  // Generate text
  const generateText = useCallback(async (
    prompt: string,
    options?: { maxNewTokens?: number; temperature?: number }
  ): Promise<string> => {
    if (!pipelineRef.current) {
      await loadModel();
    }

    if (!pipelineRef.current) {
      throw new Error('Model not loaded');
    }

    try {
      const result = await pipelineRef.current(prompt, {
        max_new_tokens: options?.maxNewTokens || 128,
        temperature: options?.temperature || 0.7,
        do_sample: true,
      });

      if (Array.isArray(result) && result[0]?.generated_text) {
        return result[0].generated_text;
      }
      return String(result);
    } catch (error) {
      console.error('Text generation failed:', error);
      throw error;
    }
  }, [loadModel]);

  // Analyze sentiment
  const analyzeSentiment = useCallback(async (text: string): Promise<{
    label: string;
    score: number;
  }> => {
    if (!pipelineRef.current) {
      await loadModel();
    }

    if (!pipelineRef.current) {
      throw new Error('Model not loaded');
    }

    try {
      const result = await pipelineRef.current(text);
      if (Array.isArray(result) && result[0]) {
        return result[0] as { label: string; score: number };
      }
      return { label: 'NEUTRAL', score: 0.5 };
    } catch (error) {
      console.error('Sentiment analysis failed:', error);
      throw error;
    }
  }, [loadModel]);

  // Summarize text
  const summarize = useCallback(async (
    text: string,
    options?: { maxLength?: number; minLength?: number }
  ): Promise<string> => {
    if (!pipelineRef.current) {
      await loadModel();
    }

    if (!pipelineRef.current) {
      throw new Error('Model not loaded');
    }

    try {
      const result = await pipelineRef.current(text, {
        max_length: options?.maxLength || 100,
        min_length: options?.minLength || 30,
      });

      if (Array.isArray(result) && result[0]?.summary_text) {
        return result[0].summary_text;
      }
      return String(result);
    } catch (error) {
      console.error('Summarization failed:', error);
      throw error;
    }
  }, [loadModel]);

  // Get text embeddings
  const getEmbeddings = useCallback(async (texts: string[]): Promise<number[][]> => {
    if (!pipelineRef.current) {
      await loadModel();
    }

    if (!pipelineRef.current) {
      throw new Error('Model not loaded');
    }

    try {
      const result = await pipelineRef.current(texts, {
        pooling: 'mean',
        normalize: true,
      });

      return result.tolist();
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw error;
    }
  }, [loadModel]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    pipelineRef.current = null;
    setState({
      isLoading: false,
      isModelLoaded: false,
      progress: 0,
      error: null,
      device: null,
    });
  }, []);

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

// Smart replies using on-device AI
export const useSmartReplies = () => {
  const { isModelLoaded, isLoading, loadModel, generateText, device } = useOnDeviceAI({
    task: 'text-generation',
    model: 'Xenova/Qwen1.5-0.5B-Chat',
  });

  const getSuggestedReplies = useCallback(async (
    lastMessage: string,
    context?: string
  ): Promise<string[]> => {
    if (!isModelLoaded) {
      await loadModel();
    }

    const prompt = context 
      ? `Context: ${context}\nMessage: "${lastMessage}"\nSuggest 3 brief, natural replies:`
      : `Message: "${lastMessage}"\nSuggest 3 brief, natural replies:`;

    try {
      const response = await generateText(prompt, { maxNewTokens: 100 });
      
      // Parse the response into individual replies
      const replies = response
        .split(/\d+\.|[-•]/)
        .map(r => r.trim())
        .filter(r => r.length > 0 && r.length < 100)
        .slice(0, 3);

      return replies.length > 0 ? replies : ['👍', 'Thanks!', 'Got it'];
    } catch {
      return ['👍', 'Thanks!', 'Got it'];
    }
  }, [isModelLoaded, loadModel, generateText]);

  return {
    isModelLoaded,
    isLoading,
    device,
    loadModel,
    getSuggestedReplies,
  };
};
