import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Translation {
  originalText: string;
  translatedText: string;
  targetLanguage: string;
  sourceLanguage?: string;
}

export const useMessageTranslation = () => {
  const [loading, setLoading] = useState(false);
  const [translations, setTranslations] = useState<Map<string, Translation>>(new Map());

  const translateMessage = useCallback(async (
    messageId: string,
    text: string,
    targetLanguage: string = 'en'
  ): Promise<string | null> => {
    // Check cache first
    const cached = translations.get(`${messageId}_${targetLanguage}`);
    if (cached) return cached.translatedText;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('translate-message', {
        body: { text, targetLanguage }
      });

      if (error) throw error;

      const translatedText = data?.translatedText || text;
      
      // Cache locally
      setTranslations(prev => new Map(prev).set(`${messageId}_${targetLanguage}`, {
        originalText: text,
        translatedText,
        targetLanguage,
        sourceLanguage: data?.sourceLanguage
      }));

      // Store in database for future use
      await supabase.from('message_translations').insert({
        original_language: data?.sourceLanguage || 'auto',
        target_language: targetLanguage,
        translated_text: translatedText
      });

      return translatedText;
    } catch (error) {
      console.error('Translation failed:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [translations]);

  const getStoredTranslation = useCallback(async (
    messageId: string,
    targetLanguage: string
  ): Promise<string | null> => {
    try {
      const { data } = await supabase
        .from('message_translations')
        .select('translated_text')
        .eq('message_id', messageId)
        .eq('target_language', targetLanguage)
        .single();

      return data?.translated_text || null;
    } catch {
      return null;
    }
  }, []);

  const detectLanguage = useCallback(async (text: string): Promise<string> => {
    try {
      const { data } = await supabase.functions.invoke('detect-language', {
        body: { text }
      });
      return data?.language || 'en';
    } catch {
      return 'en';
    }
  }, []);

  return {
    loading,
    translateMessage,
    getStoredTranslation,
    detectLanguage,
    translations
  };
};
