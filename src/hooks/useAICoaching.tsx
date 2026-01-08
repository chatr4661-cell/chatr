/**
 * AI Coaching Hook - Feature #45
 * Real-time agent guidance during calls
 */
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CoachingSuggestion {
  id: string;
  type: 'suggestion' | 'warning' | 'action' | 'tone';
  text: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
  dismissed: boolean;
}

interface CoachingState {
  suggestions: string[];
  talkingPoints: string[];
  warningFlags: string[];
  recommendedActions: string[];
  toneAdvice: string;
  nextBestAction: string;
}

interface UseAICoachingOptions {
  callId: string;
  context?: 'sales' | 'support' | 'general';
  agentName?: string;
  enabled?: boolean;
}

export const useAICoaching = ({
  callId,
  context = 'support',
  agentName,
  enabled = true,
}: UseAICoachingOptions) => {
  const [coaching, setCoaching] = useState<CoachingState | null>(null);
  const [activeSuggestions, setActiveSuggestions] = useState<CoachingSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const lastTranscriptRef = useRef<string>('');

  const getCoaching = useCallback(async (
    transcript: string,
    sentiment?: string,
    urgency?: string
  ): Promise<CoachingState | null> => {
    if (!enabled || !transcript || transcript.length < 20) return null;

    // Avoid duplicate requests for same content
    if (transcript === lastTranscriptRef.current) return coaching;
    lastTranscriptRef.current = transcript;

    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke('ai-coaching', {
        body: { transcript, sentiment, urgency, context, agentName }
      });

      if (error) throw error;

      const newCoaching: CoachingState = data.coaching || {
        suggestions: [],
        talkingPoints: [],
        warningFlags: [],
        recommendedActions: [],
        toneAdvice: '',
        nextBestAction: '',
      };

      setCoaching(newCoaching);

      // Convert to active suggestions
      const now = Date.now();
      const newSuggestions: CoachingSuggestion[] = [];

      newCoaching.suggestions.forEach((text, i) => {
        newSuggestions.push({
          id: `sug-${now}-${i}`,
          type: 'suggestion',
          text,
          priority: 'medium',
          timestamp: now,
          dismissed: false,
        });
      });

      newCoaching.warningFlags.forEach((text, i) => {
        newSuggestions.push({
          id: `warn-${now}-${i}`,
          type: 'warning',
          text,
          priority: 'high',
          timestamp: now,
          dismissed: false,
        });
      });

      if (newCoaching.nextBestAction) {
        newSuggestions.push({
          id: `action-${now}`,
          type: 'action',
          text: newCoaching.nextBestAction,
          priority: 'high',
          timestamp: now,
          dismissed: false,
        });
      }

      if (newCoaching.toneAdvice) {
        newSuggestions.push({
          id: `tone-${now}`,
          type: 'tone',
          text: newCoaching.toneAdvice,
          priority: 'low',
          timestamp: now,
          dismissed: false,
        });
      }

      // Merge with existing, remove old duplicates
      setActiveSuggestions(prev => {
        const existing = prev.filter(s => !s.dismissed && now - s.timestamp < 60000);
        return [...existing, ...newSuggestions].slice(-10);
      });

      return newCoaching;
    } catch (err) {
      console.error('[useAICoaching] Error:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [enabled, context, agentName, coaching]);

  const dismissSuggestion = useCallback((id: string) => {
    setActiveSuggestions(prev => 
      prev.map(s => s.id === id ? { ...s, dismissed: true } : s)
    );
  }, []);

  const dismissAll = useCallback(() => {
    setActiveSuggestions(prev => prev.map(s => ({ ...s, dismissed: true })));
  }, []);

  const getUndismissedSuggestions = useCallback(() => {
    return activeSuggestions.filter(s => !s.dismissed);
  }, [activeSuggestions]);

  const getHighPrioritySuggestions = useCallback(() => {
    return activeSuggestions.filter(s => !s.dismissed && s.priority === 'high');
  }, [activeSuggestions]);

  return {
    coaching,
    activeSuggestions,
    isLoading,
    getCoaching,
    dismissSuggestion,
    dismissAll,
    getUndismissedSuggestions,
    getHighPrioritySuggestions,
  };
};
