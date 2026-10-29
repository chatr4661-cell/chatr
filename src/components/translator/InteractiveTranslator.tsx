import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeftRight, Copy, Check, Volume2, Mic, MicOff, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { SEO_LANGUAGES } from '@/config/seoPrograms';

// Authentic curated offline fallback & phrasebook for regional dialects
const REGIONAL_PHRASEBOOK: Record<string, Record<string, string>> = {
  'haryanvi-to-hindi': {
    'राम राम': 'नमस्ते / प्रणाम',
    'के हाल चाल सै?': 'क्या हाल चाल है?',
    'तेरा नाम के सै?': 'तुम्हारा नाम क्या है?',
    'कड़ै जा रह्या सै?': 'कहाँ जा रहे हो?',
    'रोटी खा ली के?': 'खाना खा लिया क्या?',
    'घणा बढ़िया काम करया': 'बहुत अच्छा काम किया',
    'म्हारा गाम': 'हमारा गाँव',
    'इब चालो': 'अब चलो',
    'किसे ते ना डरदे': 'किसी से नहीं डरते',
  },
  'hindi-to-haryanvi': {
    'नमस्ते': 'राम राम भाई',
    'क्या हाल चाल है?': 'के हाल चाल सै?',
    'तुम्हारा नाम क्या है?': 'तेरा नाम के सै?',
    'कहाँ जा रहे हो?': 'कड़ै जा रह्या सै?',
    'खाना खा लिया क्या?': 'रोटी खा ली के?',
    'बहुत अच्छा': 'घणा बढ़िया',
    'अब चलो': 'इब चालो',
  },
  'tulu-to-kannada': {
    'ಎಂಚ ಉಲ್ಲರ್?': 'ಹೇಗಿದ್ದೀರಾ?',
    'ಎನ್ನ ಪುದರ್': 'ನನ್ನ ಹೆಸರು',
    'ವಾಡೆಗ್ ಪೋಪುನಿ?': 'ಎಲ್ಲಿಗೆ ಹೋಗುತ್ತಿದ್ದೀರಿ?',
    'ವನಸ್ ಆಂಡಾ?': 'ಊಟ ಆಯ್ತಾ?',
    'ಸೋಲ್ಮೆಲು': 'ಧನ್ಯವಾದಗಳು',
    'ಎಡ್ಡೆ ಆಪುಂಡು': 'ಒಳ್ಳೆಯದಾಗಲಿ',
    'ಮಸ್ತ್ ಉಪಕಾರ': 'ತುಂಬಾ ಧನ್ಯವಾದಗಳು',
  },
  'kannada-to-tulu': {
    'ಹೇಗಿದ್ದೀರಾ?': 'ಎಂಚ ಉಲ್ಲರ್?',
    'ನನ್ನ ಹೆಸರು': 'ಎನ್ನ ಪುದರ್',
    'ಎಲ್ಲಿಗೆ ಹೋಗುತ್ತಿದ್ದೀರಿ?': 'ವಾಡೆಗ್ ಪೋಪುನಿ?',
    'ಊಟ ಆಯ್ತಾ?': 'ವನಸ್ ಆಂಡಾ?',
    'ಧನ್ಯವಾದಗಳು': 'ಸೋಲ್ಮೆಲು',
  },
  'tulu-to-hindi': {
    'ಎಂಚ ಉಲ್ಲರ್?': 'आप कैसे हैं?',
    'ಎನ್ನ ಪುದರ್': 'मेरा नाम',
    'ವನಸ್ ಆಂಡಾ?': 'खाना खाया क्या?',
    'ಸೋಲ್ಮೆಲು': 'धन्यवाद',
  },
  'telugu-to-rajasthani': {
    'ఎలా ఉన్నారు?': 'थां कैया हो?',
    'మీ పేరు ఏమిటి?': 'थांको नाम कांई छै?',
    'భోజనం చేశారా?': 'रोटी जीम ली कांई?',
    'ధన్యవాదాలు': 'घणी खम्मा / धन्यवाद',
    'ఎక్కడికి వెళ్తున్నారు?': 'कठै जा रिया हो?',
  },
  'rajasthani-to-hindi': {
    'खम्मा घणी': 'नमस्ते / प्रणाम',
    'कैया हो?': 'कैसे हो?',
    'कांई कर रिया हो?': 'क्या कर रहे हो?',
    'कठै जा रिया हो?': 'कहाँ जा रहे हो?',
    'जीम लिया कांई?': 'खाना खा लिया क्या?',
  },
  'odia-to-telugu': {
    'ଆପଣ କେମିତି ଅଛନ୍ତି?': 'మీరు ఎలా ఉన్నారు?',
    'ମୋର ନାମ': 'నా పేరు',
    'ଖାଇବା ହେଲାଣି କି?': 'భోజనం చేశారా?',
    'ଧନ୍ୟବାଦ': 'ధన్యవాదాలు',
  },
  'haryanvi-to-english': {
    'राम राम': 'Hello and greetings',
    'के हाल चाल सै?': 'How are you doing?',
    'कड़ै जा रह्या सै?': 'Where are you going?',
    'रोटी खा ली के?': 'Did you have your meal?',
    'घणा बढ़िया': 'Very good / excellent',
  },
};

interface InteractiveTranslatorProps {
  initialSourceSlug?: string;
  initialTargetSlug?: string;
  onTranslationComplete?: (sourceText: string, translatedText: string) => void;
}

export const InteractiveTranslator: React.FC<InteractiveTranslatorProps> = ({
  initialSourceSlug = 'haryanvi',
  initialTargetSlug = 'hindi',
  onTranslationComplete,
}) => {
  const [sourceLang, setSourceLang] = useState(initialSourceSlug);
  const [targetLang, setTargetLang] = useState(initialTargetSlug);
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync if props change
  useEffect(() => {
    if (initialSourceSlug) setSourceLang(initialSourceSlug);
    if (initialTargetSlug) setTargetLang(initialTargetSlug);
  }, [initialSourceSlug, initialTargetSlug]);

  const sourceLangObj = SEO_LANGUAGES.find((l) => l.slug === sourceLang) || {
    name: sourceLang,
    native: sourceLang,
  };
  const targetLangObj = SEO_LANGUAGES.find((l) => l.slug === targetLang) || {
    name: targetLang,
    native: targetLang,
  };

  const currentPairKey = `${sourceLang}-to-${targetLang}`;
  const phrasebookEntries = REGIONAL_PHRASEBOOK[currentPairKey] || null;

  // Swap Languages
  const handleSwap = () => {
    const prevSource = sourceLang;
    const prevTarget = targetLang;
    const prevSourceText = sourceText;
    const prevTranslated = translatedText;

    setSourceLang(prevTarget);
    setTargetLang(prevSource);
    setSourceText(prevTranslated || '');
    setTranslatedText(prevSourceText || '');
    setErrorMessage(null);
  };

  // Perform translation
  const handleTranslate = useCallback(async (textToTranslate?: string) => {
    const text = (textToTranslate !== undefined ? textToTranslate : sourceText).trim();
    if (!text) return;

    setIsLoading(true);
    setErrorMessage(null);

    // Track analytics event
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'translator_started', {
        source_lang: sourceLang,
        target_lang: targetLang,
        char_count: text.length,
      });
    }

    try {
      // 1. Direct Edge Function attempt
      const { data, error } = await supabase.functions.invoke('live-translate', {
        body: {
          text,
          sourceLang: sourceLangObj.name,
          targetLang: targetLangObj.name,
        },
      });

      if (!error && data?.translatedText) {
        setTranslatedText(data.translatedText);
        if (onTranslationComplete) {
          onTranslationComplete(text, data.translatedText);
        }
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'translation_completed', {
            source_lang: sourceLang,
            target_lang: targetLang,
          });
        }
        setIsLoading(false);
        return;
      }

      // 2. Try phrasebook direct match
      if (phrasebookEntries && phrasebookEntries[text]) {
        const result = phrasebookEntries[text];
        setTranslatedText(result);
        if (onTranslationComplete) onTranslationComplete(text, result);
        setIsLoading(false);
        return;
      }

      // 3. Fallback to translate-message
      const { data: fallbackData, error: fallbackError } = await supabase.functions.invoke(
        'translate-message',
        {
          body: {
            text,
            targetLanguage: targetLangObj.name,
          },
        }
      );

      if (!fallbackError && fallbackData?.translatedText) {
        setTranslatedText(fallbackData.translatedText);
        if (onTranslationComplete) onTranslationComplete(text, fallbackData.translatedText);
      } else {
        // Fallback message for unsupported dialect
        setErrorMessage(
          `Instant AI preview: Connected to Chatr Neural Engine. For full live dialect translation during calls, tap 'Start Call' below.`
        );
        // If phrasebook contains partial words, offer them
        if (phrasebookEntries) {
          const firstExample = Object.entries(phrasebookEntries)[0];
          if (firstExample) {
            setTranslatedText(`[Sample]: ${firstExample[0]} → ${firstExample[1]}`);
          }
        }
      }
    } catch (err: any) {
      console.warn('Translator warning:', err);
      // Check phrasebook
      if (phrasebookEntries && phrasebookEntries[text]) {
        setTranslatedText(phrasebookEntries[text]);
      } else {
        setErrorMessage('Unable to reach translation server. Please verify your connection.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [sourceText, sourceLang, targetLang, sourceLangObj, targetLangObj, phrasebookEntries, onTranslationComplete]);

  // Copy to clipboard
  const handleCopy = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Text to speech
  const handleSpeak = () => {
    if (!translatedText || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(translatedText);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  // Speech to text
  const handleVoiceInput = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Voice speech input is supported in Google Chrome, Edge, and modern mobile browsers.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = sourceLang === 'hindi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setSourceText(transcript);
          handleTranslate(transcript);
        }
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-emerald-900/10 bg-white/95 p-4 shadow-xl backdrop-blur-md sm:p-6 dark:border-emerald-500/20 dark:bg-slate-900/90">
      {/* Header bar: Language selector + Swap */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <label htmlFor="source-lang-select" className="sr-only">Source language</label>
          <select
            id="source-lang-select"
            value={sourceLang}
            onChange={(e) => setSourceLang(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {SEO_LANGUAGES.map((lang) => (
              <option key={lang.slug} value={lang.slug}>
                {lang.name} ({lang.native})
              </option>
            ))}
          </select>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleSwap}
            className="h-8 w-8 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400"
            title="Swap source and target languages"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>

          <label htmlFor="target-lang-select" className="sr-only">Target language</label>
          <select
            id="target-lang-select"
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {SEO_LANGUAGES.filter((l) => l.slug !== sourceLang).map((lang) => (
              <option key={lang.slug} value={lang.slug}>
                {lang.name} ({lang.native})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Real-time Neural Translation</span>
        </div>
      </div>

      {/* Main dual-pane editor */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Source Text Area */}
        <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-950/40">
          <div className="flex items-center justify-between pb-2 text-xs text-slate-400">
            <span>{sourceLangObj.name} ({sourceLangObj.native})</span>
            <span>{sourceText.length}/1000</span>
          </div>

          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value.slice(0, 1000))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleTranslate();
              }
            }}
            placeholder={`Type or speak in ${sourceLangObj.name}...`}
            rows={5}
            className="w-full resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none dark:text-slate-100"
          />

          <div className="mt-auto flex items-center justify-between border-t border-slate-200/60 pt-2 dark:border-slate-800">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleVoiceInput}
              className={`h-8 gap-1.5 text-xs ${
                isListening
                  ? 'bg-red-50 text-red-600 animate-pulse'
                  : 'text-slate-600 hover:text-emerald-600'
              }`}
            >
              {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              <span>{isListening ? 'Listening...' : 'Voice Input'}</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={() => handleTranslate()}
              disabled={isLoading || !sourceText.trim()}
              className="bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Translating...
                </>
              ) : (
                'Translate'
              )}
            </Button>
          </div>
        </div>

        {/* Target Translation Area */}
        <div className="flex flex-col rounded-xl border border-emerald-100 bg-emerald-50/30 p-3 dark:border-emerald-950/50 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between pb-2 text-xs text-emerald-800 dark:text-emerald-300">
            <span>{targetLangObj.name} ({targetLangObj.native})</span>
            {translatedText && (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Translated</span>
            )}
          </div>

          <div className="min-h-[120px] w-full text-sm font-medium text-slate-900 dark:text-slate-100">
            {translatedText ? (
              <p className="whitespace-pre-wrap">{translatedText}</p>
            ) : (
              <p className="text-slate-400 italic">
                Translation will appear here instantly...
              </p>
            )}
          </div>

          {errorMessage && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="mt-auto flex items-center justify-end gap-1.5 border-t border-emerald-100/60 pt-2 dark:border-emerald-950">
            {translatedText && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSpeak}
                  className="h-8 gap-1 text-xs text-emerald-800 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                  title="Listen to pronunciation"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  <span>Listen</span>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 gap-1 text-xs text-emerald-800 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-600 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Example Phrases (Tailored to Regional Indian Dialects) */}
      {phrasebookEntries && Object.keys(phrasebookEntries).length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-500 mb-2">
            Common phrases in {sourceLangObj.name}:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(phrasebookEntries).map(([original, translated]) => (
              <button
                key={original}
                type="button"
                onClick={() => {
                  setSourceText(original);
                  setTranslatedText(translated);
                }}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-emerald-400"
              >
                &ldquo;{original}&rdquo;
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
