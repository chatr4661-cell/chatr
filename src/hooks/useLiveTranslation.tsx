/**
 * Live Translation Hook - Feature #59
 * Real-time voice translation during calls
 */
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TranslationResult {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  timestamp: number;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
  { code: 'bn', name: 'Bengali' },
  { code: 'mr', name: 'Marathi' },
];

interface UseLiveTranslationOptions {
  callId?: string;
  targetLang: string;
  enabled?: boolean;
}

export const useLiveTranslation = ({
  callId,
  targetLang,
  enabled = true,
}: UseLiveTranslationOptions) => {
  const [translations, setTranslations] = useState<TranslationResult[]>([]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  
  const cacheRef = useRef<Map<string, string>>(new Map());

  const translate = useCallback(async (
    text: string,
    sourceLang: string = 'auto'
  ): Promise<string> => {
    if (!enabled || !text || text.length < 2) return text;
    
    // Check cache
    const cacheKey = `${text}-${sourceLang}-${targetLang}`;
    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey)!;
    }

    try {
      setIsTranslating(true);

      const { data, error } = await supabase.functions.invoke('live-translate', {
        body: { text, sourceLang, targetLang, callId }
      });

      if (error) throw error;

      const translatedText = data.translatedText || text;
      const detected = data.sourceLang || sourceLang;
      
      setDetectedLanguage(detected);
      
      // Cache result
      cacheRef.current.set(cacheKey, translatedText);
      
      // Store in history
      const result: TranslationResult = {
        id: crypto.randomUUID(),
        originalText: text,
        translatedText,
        sourceLang: detected,
        targetLang,
        timestamp: Date.now(),
      };
      
      setTranslations(prev => [...prev.slice(-50), result]);
      
      return translatedText;
    } catch (err) {
      console.error('[useLiveTranslation] Error:', err);
      return text;
    } finally {
      setIsTranslating(false);
    }
  }, [enabled, targetLang, callId]);

  const translateBatch = useCallback(async (
    texts: string[],
    sourceLang: string = 'auto'
  ): Promise<string[]> => {
    return Promise.all(texts.map(t => translate(t, sourceLang)));
  }, [translate]);

  const clearTranslations = useCallback(() => {
    setTranslations([]);
    cacheRef.current.clear();
  }, []);

  const getLanguageName = useCallback((code: string): string => {
    return SUPPORTED_LANGUAGES.find(l => l.code === code)?.name || code;
  }, []);

  return {
    translations,
    isTranslating,
    detectedLanguage,
    translate,
    translateBatch,
    clearTranslations,
    getLanguageName,
    supportedLanguages: SUPPORTED_LANGUAGES,
  };
};
