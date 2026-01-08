/**
 * Call Sentiment Analysis Hook - Feature #44
 * Real-time emotion detection during calls
 */
import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type Sentiment = 'positive' | 'negative' | 'neutral' | 'frustrated' | 'happy' | 'confused';
export type Urgency = 'low' | 'medium' | 'high';

interface SentimentResult {
  sentiment: Sentiment;
  score: number;
  emotions: Record<string, number>;
  keywords: string[];
  urgency: Urgency;
  suggestions?: string[];
  timestamp: number;
}

interface UseCallSentimentOptions {
  callId: string;
  enabled?: boolean;
  analyzeInterval?: number; // ms between analyses
}

export const useCallSentiment = ({ 
  callId, 
  enabled = true, 
  analyzeInterval = 15000 
}: UseCallSentimentOptions) => {
  const [currentSentiment, setCurrentSentiment] = useState<SentimentResult | null>(null);
  const [sentimentHistory, setSentimentHistory] = useState<SentimentResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const accumulatedTextRef = useRef<string>('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const analyzeSentiment = useCallback(async (text: string): Promise<SentimentResult | null> => {
    if (!text || text.length < 10) return null;

    try {
      setIsAnalyzing(true);
      
      const { data, error } = await supabase.functions.invoke('call-sentiment', {
        body: { text, callId }
      });

      if (error) throw error;

      const result: SentimentResult = {
        sentiment: data.sentiment || 'neutral',
        score: data.score || 0,
        emotions: data.emotions || {},
        keywords: data.keywords || [],
        urgency: data.urgency || 'low',
        suggestions: data.suggestions,
        timestamp: Date.now(),
      };

      setCurrentSentiment(result);
      setSentimentHistory(prev => [...prev, result]);
      
      return result;
    } catch (err) {
      console.error('[useCallSentiment] Analysis error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, [callId]);

  const addText = useCallback((text: string) => {
    accumulatedTextRef.current += ' ' + text;
  }, []);

  const startMonitoring = useCallback(() => {
    if (!enabled || intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      const text = accumulatedTextRef.current.trim();
      if (text.length > 20) {
        analyzeSentiment(text);
        // Keep last 500 chars for context
        accumulatedTextRef.current = text.slice(-500);
      }
    }, analyzeInterval);

    console.log('[useCallSentiment] Monitoring started');
  }, [enabled, analyzeInterval, analyzeSentiment]);

  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    console.log('[useCallSentiment] Monitoring stopped');
  }, []);

  const getAverageSentiment = useCallback((): number => {
    if (sentimentHistory.length === 0) return 0;
    const sum = sentimentHistory.reduce((acc, s) => acc + s.score, 0);
    return sum / sentimentHistory.length;
  }, [sentimentHistory]);

  const getDominantEmotion = useCallback((): string | null => {
    if (!currentSentiment?.emotions) return null;
    const emotions = currentSentiment.emotions;
    const entries = Object.entries(emotions);
    if (entries.length === 0) return null;
    return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }, [currentSentiment]);

  const getSentimentTrend = useCallback((): 'improving' | 'declining' | 'stable' => {
    if (sentimentHistory.length < 3) return 'stable';
    
    const recent = sentimentHistory.slice(-3);
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));
    
    const firstAvg = firstHalf.reduce((a, s) => a + s.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, s) => a + s.score, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    if (diff > 0.2) return 'improving';
    if (diff < -0.2) return 'declining';
    return 'stable';
  }, [sentimentHistory]);

  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    currentSentiment,
    sentimentHistory,
    isAnalyzing,
    addText,
    analyzeSentiment,
    startMonitoring,
    stopMonitoring,
    getAverageSentiment,
    getDominantEmotion,
    getSentimentTrend,
  };
};
