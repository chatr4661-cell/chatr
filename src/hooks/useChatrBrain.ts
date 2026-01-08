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
  query: (text: string, forceAgent?: AgentType) => Promise<BrainResponse>;
  quickDetect: (text: string) => DetectedIntent;
  isReady: boolean;
  isProcessing: boolean;
  lastResponse: BrainResponse | null;
  agents: AgentType[];
  getAgentInfo: (type: AgentType) => ReturnType<typeof chatrBrain.getAgentInfo>;
  updateLocation: (location: SharedContext['location']) => void;
  error: string | null;
  location: SharedContext['location'] | null;
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
  const [location, setLocation] = useState<SharedContext['location'] | null>(null);

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
        
        // Auto-detect location
        detectLocation();
      } catch (err) {
        console.error('Brain initialization failed:', err);
        setError('Failed to initialize AI Brain');
      }
    };

    initialize();
  }, []);

  // Detect user location
  const detectLocation = useCallback(async () => {
    try {
      // Try browser geolocation first
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            try {
              const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
              );
              const data = await response.json();
              const loc: SharedContext['location'] = {
                lat: latitude,
                lon: longitude,
                city: data.address?.city || data.address?.town || data.address?.village,
                state: data.address?.state,
                country: data.address?.country,
              };
              setLocation(loc);
              chatrBrain.updateLocation(loc);
              console.log('📍 [Location] Detected:', loc.city);
            } catch {
              setLocation({ lat: latitude, lon: longitude });
              chatrBrain.updateLocation({ lat: latitude, lon: longitude });
            }
          },
          () => fetchIPLocation(),
          { timeout: 5000, enableHighAccuracy: false }
        );
      } else {
        fetchIPLocation();
      }
    } catch {
      console.log('📍 [Location] Detection failed');
    }
  }, []);

  const fetchIPLocation = async () => {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      const loc: SharedContext['location'] = {
        city: data.city,
        state: data.region,
        country: data.country_name,
        lat: data.latitude,
        lon: data.longitude,
      };
      setLocation(loc);
      chatrBrain.updateLocation(loc);
      console.log('📍 [Location] IP-based:', loc.city);
    } catch {
      console.log('📍 [Location] IP detection failed');
    }
  };

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
        context: location ? { location } : undefined,
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
  }, [userId, location]);

  const quickDetect = useCallback((text: string): DetectedIntent => {
    return chatrBrain.quickDetect(text);
  }, []);

  const updateLocation = useCallback((loc: SharedContext['location']) => {
    setLocation(loc);
    chatrBrain.updateLocation(loc);
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
    location,
  };
}
