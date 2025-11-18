/**
 * CHATR ULTRA Hook
 * Main interface for on-device AI across all CHATR modules
 */

import { useState, useEffect, useCallback } from 'react';
import { deviceAI, DeviceAICapabilities } from '@/services/chatrUltra/deviceAI';
import { moduleHandler, ChatrModule, ModuleResponse } from '@/services/chatrUltra/moduleHandlers';
import { behaviorIntelligence } from '@/services/chatrUltra/behaviorIntelligence';
import { webExtraction, ExtractedContent } from '@/services/chatrUltra/webExtraction';

export interface ChatrUltraQuery {
  query: string;
  module: ChatrModule;
  context?: Record<string, any>;
  useMultiModel?: boolean;
}

export interface ChatrUltraResponse {
  answer: string;
  structured?: any;
  sources?: string[];
  confidence: number;
  latencyMs: number;
  moduleUsed: ChatrModule;
  modelUsed: string;
}

export interface ChatrUltraHook {
  // Query methods
  query: (request: ChatrUltraQuery) => Promise<ChatrUltraResponse>;
  extractWeb: (url: string) => Promise<ExtractedContent>;
  
  // Status
  isReady: boolean;
  availableModels: DeviceAICapabilities[];
  
  // Behavior intelligence
  enableBehaviorIntelligence: () => Promise<boolean>;
  isBehaviorEnabled: boolean;
  
  // Loading state
  isProcessing: boolean;
}

/**
 * Main CHATR ULTRA hook
 */
export function useChatrUltra(): ChatrUltraHook {
  const [isReady, setIsReady] = useState(false);
  const [availableModels, setAvailableModels] = useState<DeviceAICapabilities[]>([]);
  const [isBehaviorEnabled, setIsBehaviorEnabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      console.log('🚀 [CHATR ULTRA] Initializing...');
      
      // Initialize device AI
      await deviceAI.initialize();
      setAvailableModels(deviceAI.getAvailableModels());
      
      // Check behavior intelligence status
      setIsBehaviorEnabled(behaviorIntelligence.isEnabled());
      
      setIsReady(true);
      console.log('✅ [CHATR ULTRA] Ready');
    };

    initialize();
  }, []);

  /**
   * Query CHATR ULTRA with module-specific logic
   */
  const query = useCallback(async (request: ChatrUltraQuery): Promise<ChatrUltraResponse> => {
    if (!isReady) {
      throw new Error('CHATR ULTRA not ready. Please wait.');
    }

    setIsProcessing(true);
    const startTime = performance.now();

    try {
      console.log(`🎯 [CHATR ULTRA] Query for module: ${request.module}`);

      // Record behavior pattern
      if (behaviorIntelligence.isEnabled()) {
        behaviorIntelligence.recordPattern(`module_${request.module}`, request.query);
        behaviorIntelligence.updateInterests(request.query);
      }

      // Route to module handler
      const response = await moduleHandler.handleModuleRequest({
        module: request.module,
        query: request.query,
        context: request.context,
      });

      const latencyMs = performance.now() - startTime;

      console.log(`✅ [CHATR ULTRA] Response in ${latencyMs.toFixed(0)}ms`);

      return {
        answer: response.answer,
        structured: response.structured,
        sources: response.sources,
        confidence: response.confidence,
        latencyMs,
        moduleUsed: response.moduleUsed,
        modelUsed: 'device-ai', // TODO: Get actual model used
      };
    } catch (error) {
      console.error('❌ [CHATR ULTRA] Query failed:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [isReady]);

  /**
   * Extract content from a web URL
   */
  const extractWeb = useCallback(async (url: string): Promise<ExtractedContent> => {
    console.log('🌐 [CHATR ULTRA] Extracting web content...');
    return webExtraction.extractFromURL(url);
  }, []);

  /**
   * Enable behavior intelligence
   */
  const enableBehaviorIntelligence = useCallback(async (): Promise<boolean> => {
    const granted = await behaviorIntelligence.requestPermission();
    setIsBehaviorEnabled(granted);
    return granted;
  }, []);

  return {
    query,
    extractWeb,
    isReady,
    availableModels,
    enableBehaviorIntelligence,
    isBehaviorEnabled,
    isProcessing,
  };
}
