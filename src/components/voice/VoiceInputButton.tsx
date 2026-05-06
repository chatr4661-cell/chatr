import { Mic, MicOff, X, Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSpeechInput } from '@/voice/useSpeechInput';
import { useVoiceContext } from '@/voice/VoicePlayerContext';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STT_LANGUAGES } from '@/voice/types';

interface Props {
  onTranscript: (text: string) => void;
  className?: string;
  /** Override locale (otherwise uses persisted prefs.stt_lang) */
  lang?: string;
}

/**
 * Tap-to-dictate mic with a live preview overlay.
 * Shows interim transcript + Clear / Send before committing the message.
 * Uses on-device SpeechRecognition only — audio never leaves the device.
 */
export function VoiceInputButton({ onTranscript, className, lang }: Props) {
  const { prefs, updatePrefs } = useVoiceContext();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const activeLang = lang || prefs.stt_lang || 'en-US';

  const { supported, listening, interim, start, stop, permission, checkPermission } = useSpeechInput({
    lang: activeLang,
    continuous: true,
    interimResults: true,
    onFinal: (t) => setDraft((d) => (d ? `${d} ${t}` : t).trim()),
    onError: (e) => setError(e),
  });

  // Auto-start when opening, stop when closing
  useEffect(() => {
    if (open) { setError(null); setDraft(''); start(); }
    else { stop(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!prefs.voice_input_enabled) return null;
  if (!supported) {
    return (
      <Button type="button" size="icon" variant="ghost" disabled
        className={cn('h-9 w-9 opacity-50', className)}
        title="Voice input not supported on this device">
        <MicOff className="w-4 h-4" />
      </Button>
    );
  }

  const send = () => {
    const text = (draft + (interim ? ' ' + interim : '')).trim();
    if (text) onTranscript(text);
    setOpen(false);
  };

  const preview = (draft + (interim ? ' ' + interim : '')).trim();

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className={cn('h-9 w-9', className)}
        onClick={() => setOpen(true)}
        title="Dictate message"
        aria-label="Dictate message"
      >
        <Mic className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Mic className={cn('w-4 h-4', listening && 'text-destructive animate-pulse')} />
              {listening ? 'Listening…' : 'Paused'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">Language</span>
              <Select
                value={activeLang}
                onValueChange={(v) => updatePrefs({ stt_lang: v })}
              >
                <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {STT_LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code} className="text-xs">{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-h-[96px] max-h-48 overflow-auto rounded-xl border border-border bg-muted/40 p-3 text-sm leading-relaxed">
              {preview ? (
                <>
                  <span>{draft}</span>
                  {interim && <span className="text-muted-foreground"> {interim}</span>}
                </>
              ) : (
                <span className="text-muted-foreground text-xs">
                  {listening ? 'Speak now — your words will appear here.' : 'Tap the mic to resume.'}
                </span>
              )}
            </div>

            {error && <p className="text-xs text-destructive">Error: {error}</p>}

            <div className="flex items-center justify-between gap-2 pt-1">
              <Button type="button" size="sm" variant="ghost" onClick={() => setDraft('')} disabled={!preview}>
                <X className="w-3.5 h-3.5 mr-1" /> Clear
              </Button>
              <div className="flex items-center gap-2">
                {listening ? (
                  <Button type="button" size="sm" variant="secondary" onClick={stop}>
                    <Square className="w-3.5 h-3.5 mr-1" /> Stop
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="secondary" onClick={start}>
                    <Mic className="w-3.5 h-3.5 mr-1" /> Resume
                  </Button>
                )}
                <Button type="button" size="sm" onClick={send} disabled={!preview}>
                  <Send className="w-3.5 h-3.5 mr-1" /> Send
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
