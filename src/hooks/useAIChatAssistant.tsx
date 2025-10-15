import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAIChatAssistant = () => {
  const [loading, setLoading] = useState(false);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [insights, setInsights] = useState<any>(null);

  const generateSummary = useCallback(async (
    messages: any[],
    summaryType: 'brief' | 'detailed' | 'action_items' | 'meeting_notes' = 'brief'
  ) => {
    setLoading(true);
    setSummary(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat-summary', {
        body: { messages, summaryType }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      setSummary(data.summary);
      toast.success('Summary generated!');
      return data.summary;
    } catch (error: any) {
      console.error('Summary generation error:', error);
      toast.error('Failed to generate summary');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateSmartReplies = useCallback(async (
    lastMessage: string,
    conversationContext: any[] = [],
    replyCount: number = 3
  ) => {
    setLoading(true);
    setSmartReplies([]);

    try {
      const { data, error } = await supabase.functions.invoke('ai-smart-reply', {
        body: { lastMessage, conversationContext, replyCount }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return [];
      }

      setSmartReplies(data.replies || []);
      return data.replies || [];
    } catch (error: any) {
      console.error('Smart reply generation error:', error);
      toast.error('Failed to generate smart replies');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzeMessages = useCallback(async (
    messages: any[],
    analysisType: 'sentiment' | 'topics' | 'urgency' | 'language'
  ) => {
    setLoading(true);
    setInsights(null);

    try {
      const { data, error } = await supabase.functions.invoke('ai-message-insights', {
        body: { messages, analysisType }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      setInsights(data.insights);
      toast.success('Analysis complete!');
      return data.insights;
    } catch (error: any) {
      console.error('Message analysis error:', error);
      toast.error('Failed to analyze messages');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSummary = useCallback(() => {
    setSummary(null);
  }, []);

  const clearSmartReplies = useCallback(() => {
    setSmartReplies([]);
  }, []);

  const clearInsights = useCallback(() => {
    setInsights(null);
  }, []);

  return {
    loading,
    summary,
    smartReplies,
    insights,
    generateSummary,
    generateSmartReplies,
    analyzeMessages,
    clearSummary,
    clearSmartReplies,
    clearInsights
  };
};
