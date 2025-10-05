import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Languages, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MessageTranslatorProps {
  text: string;
  messageId: string;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
];

export const MessageTranslator = ({ text, messageId }: MessageTranslatorProps) => {
  const { toast } = useToast();
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('es');
  const [isTranslating, setIsTranslating] = useState(false);
  const [showLanguageSelect, setShowLanguageSelect] = useState(false);

  const translateMessage = async () => {
    setIsTranslating(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('translate-message', {
        body: { text, targetLanguage }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setTranslatedText(data.translatedText);
      setShowTranslation(true);
      setShowLanguageSelect(false);
    } catch (error: any) {
      console.error('Translation error:', error);
      toast({
        title: 'Translation Failed',
        description: error.message || 'Could not translate message',
        variant: 'destructive',
      });
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="mt-2">
      {!showTranslation && !showLanguageSelect && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowLanguageSelect(true)}
          className="h-6 text-xs text-muted-foreground hover:text-foreground"
        >
          <Languages className="h-3 w-3 mr-1" />
          Translate
        </Button>
      )}

      {showLanguageSelect && !showTranslation && (
        <div className="flex items-center gap-2 mt-2">
          <Select value={targetLanguage} onValueChange={setTargetLanguage}>
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code} className="text-xs">
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            size="sm"
            onClick={translateMessage}
            disabled={isTranslating}
            className="h-8 text-xs"
          >
            {isTranslating ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Translating...
              </>
            ) : (
              'Translate'
            )}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowLanguageSelect(false)}
            className="h-8"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {showTranslation && (
        <div className="mt-2 p-2 bg-primary/5 rounded border-l-4 border-primary">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-primary">
              Translation ({LANGUAGES.find(l => l.code === targetLanguage)?.name})
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTranslation(false)}
              className="h-5 w-5 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-sm">{translatedText}</p>
        </div>
      )}
    </div>
  );
};
