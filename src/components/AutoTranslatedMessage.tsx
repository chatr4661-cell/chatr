import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface AutoTranslatedMessageProps {
  messageId: string;
  originalText: string;
  userLanguage: string;
  messageLanguage?: string;
  className?: string;
}

export const AutoTranslatedMessage = ({ 
  messageId, 
  originalText, 
  userLanguage,
  messageLanguage,
  className = ''
}: AutoTranslatedMessageProps) => {
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    // Don't translate if it's the same language or no user language preference
    if (!userLanguage || userLanguage === messageLanguage || userLanguage === 'en') {
      return;
    }

    const translateMessage = async () => {
      setIsTranslating(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('auto-translate', {
          body: { 
            messageId,
            text: originalText, 
            targetLanguage: userLanguage,
            sourceLanguage: messageLanguage
          }
        });

        if (error) throw error;

        if (data.error) {
          throw new Error(data.error);
        }

        if (data.translatedText !== originalText) {
          setTranslatedText(data.translatedText);
        }
      } catch (error: any) {
        console.error('Auto-translation error:', error);
        // Silently fail - just show original text
      } finally {
        setIsTranslating(false);
      }
    };

    translateMessage();
  }, [messageId, originalText, userLanguage, messageLanguage]);

  if (isTranslating) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Translating...</span>
      </div>
    );
  }

  if (!translatedText) {
    return <span className={className}>{originalText}</span>;
  }

  return (
    <div className="space-y-1">
      <p className={className}>
        {showOriginal ? originalText : translatedText}
      </p>
      <button
        onClick={() => setShowOriginal(!showOriginal)}
        className="text-xs text-primary/70 hover:text-primary underline"
      >
        {showOriginal ? 'See translation' : 'See original'}
      </button>
    </div>
  );
};
