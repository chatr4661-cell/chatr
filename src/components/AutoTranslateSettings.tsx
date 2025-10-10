import React, { useState, useEffect } from 'react';
import { Languages, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'it', name: 'Italian' },
];

interface AutoTranslateSettingsProps {
  userId: string;
}

export const AutoTranslateSettings = ({ userId }: AutoTranslateSettingsProps) => {
  const [enabled, setEnabled] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('en');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('preferred_language, auto_translate_enabled')
        .eq('id', userId)
        .single();

      if (data) {
        setTargetLanguage(data.preferred_language || 'en');
        setEnabled(data.auto_translate_enabled || false);
      }
    } catch (error) {
      console.error('Failed to load translation settings:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          preferred_language: targetLanguage,
          auto_translate_enabled: enabled,
        })
        .eq('id', userId);

      if (error) throw error;
      
      toast.success('Translation settings saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Languages className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Auto-Translate Messages</h4>
            <p className="text-sm text-muted-foreground">
              Automatically translate messages to your preferred language
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="auto-translate">Enable Auto-Translate</Label>
            <Switch
              id="auto-translate"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {enabled && (
            <div className="space-y-2">
              <Label>Preferred Language</Label>
              <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button 
            onClick={saveSettings} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
