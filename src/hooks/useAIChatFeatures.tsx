import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useAIChatFeatures = () => {
  const [loading, setLoading] = useState(false);

  const getSmartReplies = async (messageText: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat-assistant', {
        body: {
          action: 'smart-reply',
          messageText
        }
      });

      if (error) throw error;
      
      if (data?.error) {
        if (data.error.includes('Rate limit')) {
          toast.error('AI rate limit reached. Please wait a moment.');
        } else if (data.error.includes('credits')) {
          toast.error('AI credits depleted. Please add credits to continue.');
        } else {
          toast.error(data.error);
        }
        return null;
      }

      return data.data.replies;
    } catch (error: any) {
      console.error('Smart reply error:', error);
      toast.error('Failed to generate smart replies');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const summarizeConversation = async (messages: any[]) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat-assistant', {
        body: {
          action: 'summarize',
          messages: messages.map(m => ({
            role: m.sender_id ? 'user' : 'assistant',
            content: m.content
          }))
        }
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      return data.data;
    } catch (error: any) {
      console.error('Summarize error:', error);
      toast.error('Failed to summarize conversation');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const extractTasks = async (messageText: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat-assistant', {
        body: {
          action: 'extract-tasks',
          messageText
        }
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      return data.data.tasks;
    } catch (error: any) {
      console.error('Extract tasks error:', error);
      toast.error('Failed to extract tasks');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const analyzeSentiment = async (messageText: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-chat-assistant', {
        body: {
          action: 'sentiment-analysis',
          messageText
        }
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return null;
      }

      return data.data;
    } catch (error: any) {
      console.error('Sentiment analysis error:', error);
      toast.error('Failed to analyze sentiment');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    getSmartReplies,
    summarizeConversation,
    extractTasks,
    analyzeSentiment,
    loading
  };
};
