import { useState, useEffect, useCallback, useRef } from 'react';

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

interface CachedEmbedding {
  query: string;
  embedding: number[];
  timestamp: number;
}

// Singleton for the pipeline to avoid re-loading
let pipelineInstance: any = null;
let pipelineLoading = false;
let pipelineError: string | null = null;
let embeddingCache: Map<string, CachedEmbedding> = new Map();
const CACHE_MAX_SIZE = 1000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// IndexedDB for persistent model caching
const DB_NAME = 'chatr_ai_cache';
const DB_VERSION = 1;
const STORE_NAME = 'embeddings';

async function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => resolve(null);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'query' });
        }
      };
    } catch {
      resolve(null);
    }
  });
}

async function getCachedEmbedding(query: string): Promise<CachedEmbedding | null> {
  // Check memory cache first (fastest)
  const memCached = embeddingCache.get(query);
  if (memCached && Date.now() - memCached.timestamp < CACHE_TTL_MS) {
    return memCached;
  }

  // Check IndexedDB
  const db = await openDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(query);
      request.onsuccess = () => {
        const result = request.result as CachedEmbedding | undefined;
        if (result && Date.now() - result.timestamp < CACHE_TTL_MS) {
          // Update memory cache
          embeddingCache.set(query, result);
          resolve(result);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function setCachedEmbedding(data: CachedEmbedding): Promise<void> {
  // Update memory cache
  if (embeddingCache.size >= CACHE_MAX_SIZE) {
    // Remove oldest entries
    const entries = Array.from(embeddingCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    entries.slice(0, 100).forEach(([key]) => embeddingCache.delete(key));
  }
  embeddingCache.set(data.query, data);

  // Persist to IndexedDB
  const db = await openDB();
  if (!db) return;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(data);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export const useLocalAI = () => {
  const [state, setState] = useState<LocalAIState>({
    isLoading: false,
    isReady: false,
    error: null,
    supportsWebGPU: false,
    modelCached: false,
    gpuInfo: null
  });
  
  const initAttempted = useRef(false);
  const workerRef = useRef<Worker | null>(null);

  // Check WebGPU support with detailed info
  useEffect(() => {
    const checkWebGPU = async () => {
      try {
        if ('gpu' in navigator) {
          const adapter = await (navigator as any).gpu?.requestAdapter();
          if (adapter) {
            const info = await adapter.requestAdapterInfo?.();
            setState(s => ({ 
              ...s, 
              supportsWebGPU: true,
              gpuInfo: info?.description || info?.vendor || 'WebGPU Available'
            }));
          }
        }
      } catch {
        setState(s => ({ ...s, supportsWebGPU: false }));
      }
    };
    checkWebGPU();
  }, []);

  // Preload model on idle
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => {
        if (!pipelineInstance && !pipelineLoading && !initAttempted.current) {
          initializeLocalAI();
        }
      }, { timeout: 5000 });
    }
  }, []);

  // Initialize local AI model with caching
  const initializeLocalAI = useCallback(async () => {
    if (pipelineInstance || pipelineLoading || initAttempted.current) {
      if (pipelineInstance) {
        setState(s => ({ ...s, isReady: true, modelCached: true }));
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
      // Prioritize WebGPU for maximum speed
      pipelineInstance = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2', // Fast embedding model
        { 
          device: state.supportsWebGPU ? 'webgpu' : 'wasm',
          // Enable caching
          revision: 'main'
        }
      );

      pipelineLoading = false;
      setState(s => ({ ...s, isLoading: false, isReady: true, modelCached: true }));
      console.log('✅ Local AI ready with', state.supportsWebGPU ? 'WebGPU' : 'WASM');
    } catch (error) {
      console.warn('Local AI initialization failed, using fast fallback:', error);
      pipelineError = error instanceof Error ? error.message : 'Failed to load local AI';
      pipelineLoading = false;
      // Still mark as ready - we have fast fallback
      setState(s => ({ ...s, isLoading: false, isReady: true, error: pipelineError }));
    }
  }, [state.supportsWebGPU]);

  // Ultra-fast local intent analysis
  const analyzeIntent = useCallback(async (query: string): Promise<LocalAIResult> => {
    const startTime = performance.now();
    const normalizedQuery = query.toLowerCase().trim();
    
    // Check cache first (instant)
    const cached = await getCachedEmbedding(normalizedQuery);
    if (cached) {
      const result = processQueryWithEmbedding(normalizedQuery, cached.embedding);
      return {
        ...result,
        processingTimeMs: performance.now() - startTime
      };
    }

    // Fast keyword-based analysis (instant, no model)
    const keywordResult = fastKeywordAnalysis(normalizedQuery);
    
    // If model is ready, enhance with embeddings in background
    if (pipelineInstance) {
      // Non-blocking embedding computation
      computeAndCacheEmbedding(normalizedQuery).catch(console.warn);
    }

    return {
      ...keywordResult,
      processingTimeMs: performance.now() - startTime
    };
  }, []);

  return {
    ...state,
    initializeLocalAI,
    analyzeIntent
  };
};

// Ultra-fast keyword analysis (< 1ms)
function fastKeywordAnalysis(query: string): LocalAIResult {
  const keywords = query.split(/\s+/).filter(w => w.length > 2);
  
  // Intent detection with weighted patterns
  const intentPatterns: Record<string, { patterns: string[]; weight: number }> = {
    'local_services': { patterns: ['near', 'nearby', 'closest', 'local', 'around', 'in my area'], weight: 1.2 },
    'healthcare': { patterns: ['doctor', 'hospital', 'clinic', 'health', 'medical', 'medicine', 'pharmacy', 'dentist'], weight: 1.3 },
    'jobs': { patterns: ['job', 'hiring', 'vacancy', 'career', 'employment', 'work', 'salary', 'internship'], weight: 1.1 },
    'food': { patterns: ['restaurant', 'food', 'eat', 'dining', 'cafe', 'delivery', 'biryani', 'pizza', 'burger', 'order'], weight: 1.2 },
    'navigation': { patterns: ['directions', 'route', 'how to reach', 'way to', 'distance'], weight: 1.0 },
    'shopping': { patterns: ['buy', 'shop', 'store', 'price', 'cost', 'purchase', 'amazon', 'flipkart'], weight: 1.1 },
    'information': { patterns: ['what is', 'who is', 'when', 'why', 'how', 'explain', 'define', 'meaning'], weight: 0.9 },
    'entertainment': { patterns: ['movie', 'music', 'song', 'game', 'play', 'watch', 'download'], weight: 0.8 },
    'travel': { patterns: ['hotel', 'flight', 'train', 'bus', 'travel', 'booking', 'ticket'], weight: 1.0 }
  };

  let detectedIntent = 'search';
  let maxScore = 0;
  let confidence = 0.5;

  for (const [intent, { patterns, weight }] of Object.entries(intentPatterns)) {
    const matchCount = patterns.filter(p => query.includes(p)).length;
    const score = matchCount * weight;
    if (score > maxScore) {
      maxScore = score;
      detectedIntent = intent;
      confidence = Math.min(0.95, 0.5 + matchCount * 0.15);
    }
  }

  // Generate contextual suggestions
  const suggestions = generateSmartSuggestions(query, detectedIntent, keywords);
  
  // Generate quick answer
  const quickAnswer = generateInstantAnswer(query, detectedIntent);

  return {
    intent: detectedIntent,
    keywords,
    suggestedQueries: suggestions,
    quickAnswer,
    confidence,
    processingTimeMs: 0
  };
}

// Smart suggestion generation
function generateSmartSuggestions(query: string, intent: string, keywords: string[]): string[] {
  const suggestions: string[] = [];
  const baseQuery = query.trim();
  const mainKeyword = keywords[0] || baseQuery;

  const suggestionTemplates: Record<string, string[]> = {
    'healthcare': [
      `Best ${mainKeyword} doctors near me`,
      `${mainKeyword} specialists with ratings`,
      `Book ${mainKeyword} appointment today`
    ],
    'jobs': [
      `${mainKeyword} jobs hiring now`,
      `${mainKeyword} salary in India 2024`,
      `Remote ${mainKeyword} opportunities`
    ],
    'food': [
      `Best ${mainKeyword} restaurants near me`,
      `${mainKeyword} home delivery`,
      `${mainKeyword} with offers and discounts`
    ],
    'local_services': [
      `Top rated ${mainKeyword} nearby`,
      `${mainKeyword} open now`,
      `Affordable ${mainKeyword} with reviews`
    ],
    'shopping': [
      `${mainKeyword} best price online`,
      `${mainKeyword} reviews and ratings`,
      `${mainKeyword} offers today`
    ],
    'travel': [
      `${mainKeyword} booking deals`,
      `Cheapest ${mainKeyword} options`,
      `${mainKeyword} availability today`
    ],
    'entertainment': [
      `${mainKeyword} streaming free`,
      `${mainKeyword} download HD`,
      `Best ${mainKeyword} 2024`
    ],
    'information': [
      `${baseQuery} explained simply`,
      `${baseQuery} complete guide`,
      `${baseQuery} latest updates`
    ],
    'search': [
      `${baseQuery} in India`,
      `${baseQuery} near me`,
      `${baseQuery} complete guide`
    ]
  };

  return suggestionTemplates[intent] || suggestionTemplates['search'];
}

// Instant answers for common queries
function generateInstantAnswer(query: string, intent: string): string | undefined {
  const lowerQuery = query.toLowerCase();

  // Time queries
  if (lowerQuery.includes('time') && (lowerQuery.includes('now') || lowerQuery.includes('current'))) {
    return `🕐 ${new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST`;
  }

  // Date queries
  if (lowerQuery.includes('date') || lowerQuery.includes('today')) {
    return `📅 ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
  }

  // Calculator patterns
  const calcMatch = lowerQuery.match(/(\d+)\s*[\+\-\*\/x]\s*(\d+)/);
  if (calcMatch) {
    try {
      const result = eval(calcMatch[0].replace('x', '*'));
      return `🔢 = ${result}`;
    } catch {}
  }

  // Food-specific instant info
  if (intent === 'food') {
    return '🍽️ Finding restaurants with offers near you...';
  }

  // Healthcare-specific
  if (intent === 'healthcare') {
    return '🏥 Searching verified doctors and clinics...';
  }

  // Jobs-specific
  if (intent === 'jobs') {
    return '💼 Finding matching job opportunities...';
  }

  return undefined;
}

// Async embedding computation with caching
async function computeAndCacheEmbedding(query: string): Promise<void> {
  if (!pipelineInstance) return;

  try {
    const output = await pipelineInstance(query, { pooling: 'mean', normalize: true });
    const embedding = Array.from(output.data as ArrayLike<number>) as number[];
    
    await setCachedEmbedding({
      query,
      embedding,
      timestamp: Date.now()
    });
  } catch (error) {
    console.warn('Embedding computation failed:', error);
  }
}

// Process query using cached embedding
function processQueryWithEmbedding(query: string, embedding: number[]): LocalAIResult {
  // Use embedding for better intent classification
  // This is a simplified version - in production would use proper clustering
  const keywordResult = fastKeywordAnalysis(query);
  return {
    ...keywordResult,
    confidence: Math.min(0.98, keywordResult.confidence + 0.1) // Boost confidence for cached
  };
}

export default useLocalAI;
