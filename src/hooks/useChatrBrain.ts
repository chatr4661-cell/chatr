/**
 * CHATR BRAIN - React Hook
 * Main interface for using the AI Brain in components
 */

import { useState, useCallback, useEffect } from 'react';
import { chatrBrain } from '@/services/chatrBrain';
import { 
  AgentType, 
  BrainResponse, 
  DetectedIntent,
  SharedContext 
} from '@/services/chatrBrain/types';
import { supabase } from '@/integrations/supabase/client';

export interface UseChatrBrainReturn {
  // Query methods
  query: (text: string, forceAgent?: AgentType) => Promise<BrainResponse>;
  quickDetect: (text: string) => DetectedIntent;
  
  // State
  isReady: boolean;
  isProcessing: boolean;
  lastResponse: BrainResponse | null;
  
  // Agent info
  agents: AgentType[];
  getAgentInfo: (type: AgentType) => ReturnType<typeof chatrBrain.getAgentInfo>;
  
  // Context management
  updateLocation: (location: SharedContext['location']) => void;
  
  // Error handling
  error: string | null;
}

/**
 * Main hook for interacting with CHATR Brain
 */
export function useChatrBrain(): UseChatrBrainReturn {
  const [userId, setUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<BrainResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get user and initialize brain on mount
  useEffect(() => {
    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;
      
      setUserId(user.id);
      
      try {
        await chatrBrain.initialize(user.id);
        setIsReady(true);
        console.log('🧠 [CHATR Intelligence] Ready');
      } catch (err) {
        console.error('Brain initialization failed:', err);
        setError('Failed to initialize AI Brain');
      }
    };

    initialize();
  }, []);

  /**
   * Process a query through the brain
   */
  const query = useCallback(async (
    text: string,
    forceAgent?: AgentType
  ): Promise<BrainResponse> => {
    if (!userId) {
      throw new Error('User not authenticated');
    }

    setIsProcessing(true);
    setError(null);

    try {
      const response = await chatrBrain.process({
        query: text,
        userId,
        forceAgent,
      });

      setLastResponse(response);
      return response;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [userId]);

  /**
   * Quick intent detection without full processing
   */
  const quickDetect = useCallback((text: string): DetectedIntent => {
    return chatrBrain.quickDetect(text);
  }, []);

  /**
   * Update user location
   */
  const updateLocation = useCallback((location: SharedContext['location']) => {
    chatrBrain.updateLocation(location);
  }, []);

  return {
    query,
    quickDetect,
    isReady,
    isProcessing,
    lastResponse,
    agents: chatrBrain.getAgents(),
    getAgentInfo: chatrBrain.getAgentInfo.bind(chatrBrain),
    updateLocation,
    error,
  };
}
