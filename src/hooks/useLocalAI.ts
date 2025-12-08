import { useState, useEffect, useCallback, useRef } from 'react';

interface LocalAIState {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  supportsWebGPU: boolean;
}

interface LocalAIResult {
  intent: string;
  keywords: string[];
  suggestedQueries: string[];
  quickAnswer?: string;
}

// Singleton for the pipeline to avoid re-loading
let pipelineInstance: any = null;
let pipelineLoading = false;
let pipelineError: string | null = null;

export const useLocalAI = () => {
  const [state, setState] = useState<LocalAIState>({
    isLoading: false,
    isReady: false,
    error: null,
    supportsWebGPU: false
  });
  
  const initAttempted = useRef(false);

  // Check WebGPU support
  useEffect(() => {
    const checkWebGPU = async () => {
      try {
        if ('gpu' in navigator) {
          const adapter = await (navigator as any).gpu?.requestAdapter();
          setState(s => ({ ...s, supportsWebGPU: !!adapter }));
        }
      } catch {
        setState(s => ({ ...s, supportsWebGPU: false }));
      }
    };
    checkWebGPU();
  }, []);

  // Initialize local AI model
  const initializeLocalAI = useCallback(async () => {
    if (pipelineInstance || pipelineLoading || initAttempted.current) {
      if (pipelineInstance) {
        setState(s => ({ ...s, isReady: true }));
      }
      return;
    }

    initAttempted.current = true;
    pipelineLoading = true;
    setState(s => ({ ...s, isLoading: true }));

    try {
      // Dynamically import to avoid blocking initial load
      const { pipeline } = await import('@huggingface/transformers');
      
      // Use a small, fast model for intent classification
      pipelineInstance = await pipeline(
        'text-classification',
        'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
        { device: state.supportsWebGPU ? 'webgpu' : 'wasm' }
      );

      pipelineLoading = false;
      setState(s => ({ ...s, isLoading: false, isReady: true }));
    } catch (error) {
      console.warn('Local AI initialization failed, falling back to server:', error);
      pipelineError = error instanceof Error ? error.message : 'Failed to load local AI';
      pipelineLoading = false;
      setState(s => ({ ...s, isLoading: false, error: pipelineError }));
    }
  }, [state.supportsWebGPU]);

  // Fast local intent analysis
  const analyzeIntent = useCallback(async (query: string): Promise<LocalAIResult> => {
    const defaultResult: LocalAIResult = {
      intent: 'search',
      keywords: query.toLowerCase().split(/\s+/).filter(w => w.length > 2),
      suggestedQueries: []
    };

    // Quick keyword-based intent detection (instant, no model needed)
    const lowerQuery = query.toLowerCase();
    
    // Detect intent patterns
    const intents: Record<string, string[]> = {
      'local_services': ['near', 'nearby', 'closest', 'local', 'around'],
      'healthcare': ['doctor', 'hospital', 'clinic', 'health', 'medical', 'medicine'],
      'jobs': ['job', 'hiring', 'vacancy', 'career', 'employment', 'work'],
      'food': ['restaurant', 'food', 'eat', 'dining', 'cafe', 'delivery'],
      'navigation': ['directions', 'route', 'how to reach', 'way to'],
      'shopping': ['buy', 'shop', 'store', 'price', 'cost', 'purchase'],
      'information': ['what is', 'who is', 'when', 'why', 'how', 'explain']
    };

    for (const [intent, patterns] of Object.entries(intents)) {
      if (patterns.some(p => lowerQuery.includes(p))) {
        defaultResult.intent = intent;
        break;
      }
    }

    // Generate quick suggestions based on query
    const suggestions = generateQuickSuggestions(query, defaultResult.intent);
    defaultResult.suggestedQueries = suggestions;

    // Generate quick answer for simple queries
    const quickAnswer = generateQuickAnswer(query, defaultResult.intent);
    if (quickAnswer) {
      defaultResult.quickAnswer = quickAnswer;
    }

    return defaultResult;
  }, []);

  return {
    ...state,
    initializeLocalAI,
    analyzeIntent
  };
};

// Fast keyword-based suggestion generation
function generateQuickSuggestions(query: string, intent: string): string[] {
  const suggestions: string[] = [];
  const baseQuery = query.trim();

  switch (intent) {
    case 'healthcare':
      suggestions.push(
        `Best ${baseQuery} doctors near me`,
        `${baseQuery} hospitals with reviews`,
        `Book ${baseQuery} appointment online`
      );
      break;
    case 'jobs':
      suggestions.push(
        `${baseQuery} jobs salary`,
        `${baseQuery} fresher jobs`,
        `Remote ${baseQuery} opportunities`
      );
      break;
    case 'food':
      suggestions.push(
        `${baseQuery} restaurants near me`,
        `Best ${baseQuery} delivery`,
        `${baseQuery} with offers`
      );
      break;
    case 'local_services':
      suggestions.push(
        `Top rated ${baseQuery}`,
        `${baseQuery} open now`,
        `Cheapest ${baseQuery} nearby`
      );
      break;
    default:
      suggestions.push(
        `${baseQuery} in India`,
        `${baseQuery} latest news`,
        `${baseQuery} complete guide`
      );
  }

  return suggestions.slice(0, 3);
}

// Generate instant answers for common queries
function generateQuickAnswer(query: string, intent: string): string | undefined {
  const lowerQuery = query.toLowerCase();

  // Time queries
  if (lowerQuery.includes('time') && lowerQuery.includes('now')) {
    return `Current time: ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
  }

  // Date queries
  if (lowerQuery.includes('date') && lowerQuery.includes('today')) {
    return `Today's date: ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
  }

  // Weather indication
  if (lowerQuery.includes('weather')) {
    return `Checking weather for your location...`;
  }

  return undefined;
}

export default useLocalAI;
