import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SmartReply {
  id: string;
  text: string;
  confidence: number;
  type: 'contextual' | 'greeting' | 'affirmative' | 'negative' | 'question';
}

export const useSmartReplies = () => {
  const [suggestions, setSuggestions] = useState<SmartReply[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Pattern-based smart replies (works offline)
  const getPatternReplies = useCallback((message: string): SmartReply[] => {
    const lowerMessage = message.toLowerCase().trim();
    const replies: SmartReply[] = [];

    // Greetings
    if (/^(hi|hello|hey|good morning|good afternoon|good evening)/i.test(lowerMessage)) {
      replies.push(
        { id: '1', text: 'Hey! How are you?', confidence: 0.95, type: 'greeting' },
        { id: '2', text: 'Hi there! 👋', confidence: 0.9, type: 'greeting' },
        { id: '3', text: 'Hello! What\'s up?', confidence: 0.85, type: 'greeting' }
      );
    }

    // Questions about well-being
    if (/how are you|how('s| is) it going|what('s| is) up/i.test(lowerMessage)) {
      replies.push(
        { id: '4', text: 'I\'m good, thanks! You?', confidence: 0.95, type: 'contextual' },
        { id: '5', text: 'Doing great! How about you?', confidence: 0.9, type: 'contextual' },
        { id: '6', text: 'All good here! 😊', confidence: 0.85, type: 'contextual' }
      );
    }

    // Yes/No questions
    if (/\?$/.test(lowerMessage) && /^(can|could|would|will|do|does|is|are|was|were|have|has|should)/i.test(lowerMessage)) {
      replies.push(
        { id: '7', text: 'Yes, sure!', confidence: 0.8, type: 'affirmative' },
        { id: '8', text: 'No, sorry', confidence: 0.75, type: 'negative' },
        { id: '9', text: 'Let me check and get back to you', confidence: 0.7, type: 'contextual' }
      );
    }

    // Thank you responses
    if (/thank(s| you)|thx|ty/i.test(lowerMessage)) {
      replies.push(
        { id: '10', text: 'You\'re welcome! 😊', confidence: 0.95, type: 'contextual' },
        { id: '11', text: 'No problem!', confidence: 0.9, type: 'contextual' },
        { id: '12', text: 'Anytime!', confidence: 0.85, type: 'contextual' }
      );
    }

    // Apologies
    if (/sorry|apologize|my bad/i.test(lowerMessage)) {
      replies.push(
        { id: '13', text: 'No worries!', confidence: 0.95, type: 'contextual' },
        { id: '14', text: 'It\'s okay, don\'t worry about it', confidence: 0.9, type: 'contextual' },
        { id: '15', text: 'All good! 👍', confidence: 0.85, type: 'contextual' }
      );
    }

    // Location/meeting questions
    if (/where|when|what time/i.test(lowerMessage)) {
      replies.push(
        { id: '16', text: 'I\'ll send you the location', confidence: 0.8, type: 'contextual' },
        { id: '17', text: 'Let me check my calendar', confidence: 0.75, type: 'contextual' },
        { id: '18', text: 'I\'ll let you know soon', confidence: 0.7, type: 'contextual' }
      );
    }

    // Goodbye
    if (/bye|goodbye|see you|talk later|gtg|gotta go/i.test(lowerMessage)) {
      replies.push(
        { id: '19', text: 'Bye! Take care! 👋', confidence: 0.95, type: 'greeting' },
        { id: '20', text: 'See you later!', confidence: 0.9, type: 'greeting' },
        { id: '21', text: 'Talk soon!', confidence: 0.85, type: 'greeting' }
      );
    }

    // Excitement/Good news
    if (/awesome|great|amazing|wonderful|fantastic|congrat/i.test(lowerMessage)) {
      replies.push(
        { id: '22', text: 'That\'s amazing! 🎉', confidence: 0.9, type: 'contextual' },
        { id: '23', text: 'So happy for you!', confidence: 0.85, type: 'contextual' },
        { id: '24', text: 'Congratulations! 🥳', confidence: 0.8, type: 'contextual' }
      );
    }

    // Default responses if nothing matches
    if (replies.length === 0) {
      replies.push(
        { id: '25', text: 'Okay', confidence: 0.6, type: 'affirmative' },
        { id: '26', text: 'Got it!', confidence: 0.55, type: 'affirmative' },
        { id: '27', text: '👍', confidence: 0.5, type: 'affirmative' }
      );
    }

    return replies.slice(0, 3);
  }, []);

  // AI-powered smart replies using Lovable AI
  const getAIReplies = useCallback(async (
    message: string,
    conversationContext?: string[]
  ): Promise<SmartReply[]> => {
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-smart-replies', {
        body: {
          message,
          context: conversationContext?.slice(-5), // Last 5 messages for context
        },
      });

      if (error) throw error;

      if (data?.replies) {
        return data.replies.map((reply: string, index: number) => ({
          id: `ai-${index}`,
          text: reply,
          confidence: 0.9 - (index * 0.1),
          type: 'contextual' as const,
        }));
      }

      // Fallback to pattern-based
      return getPatternReplies(message);
    } catch (error) {
      console.error('AI smart replies error:', error);
      return getPatternReplies(message);
    } finally {
      setIsLoading(false);
    }
  }, [getPatternReplies]);

  const generateReplies = useCallback(async (
    message: string,
    conversationContext?: string[],
    useAI: boolean = false
  ) => {
    if (useAI) {
      const replies = await getAIReplies(message, conversationContext);
      setSuggestions(replies);
    } else {
      const replies = getPatternReplies(message);
      setSuggestions(replies);
    }
  }, [getAIReplies, getPatternReplies]);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return {
    suggestions,
    isLoading,
    generateReplies,
    clearSuggestions,
    getPatternReplies,
  };
};
