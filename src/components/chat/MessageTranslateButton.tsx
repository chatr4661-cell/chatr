import React, { useState, useEffect } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMessageTranslation } from '@/hooks/useMessageTranslation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MessageTranslateButtonProps {
  messageId: string;
  text: string;
  onTranslated: (translatedText: string) => void;
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
];

export const MessageTranslateButton = ({
  messageId,
  text,
  onTranslated
}: MessageTranslateButtonProps) => {
  const { loading, translateMessage } = useMessageTranslation();
  const [isTranslated, setIsTranslated] = useState(false);

  const handleTranslate = async (languageCode: string) => {
    const result = await translateMessage(messageId, text, languageCode);
    if (result) {
      onTranslated(result);
      setIsTranslated(true);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 px-2 text-xs gap-1"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Languages className="w-3 h-3" />
          )}
          {isTranslated ? 'Translated' : 'Translate'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-60 overflow-y-auto">
        {LANGUAGES.map(lang => (
          <DropdownMenuItem 
            key={lang.code}
            onClick={() => handleTranslate(lang.code)}
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
