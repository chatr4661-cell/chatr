// Device Speech-to-Text via Web Speech API (privacy-first; audio never leaves device).
import { useCallback, useEffect, useRef, useState } from 'react';

type SR = any;
const getSR = (): SR | null => {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

export interface SpeechInputOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onFinal?: (text: string) => void;
  onInterim?: (text: string) => void;
  onError?: (err: string) => void;
}

export function useSpeechInput(opts: SpeechInputOptions = {}) {
  const SR = getSR();
  const supported = !!SR;
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const recRef = useRef<any>(null);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch {}
    setListening(false);
  }, []);

  const start = useCallback(async () => {
    if (!SR) { opts.onError?.('not_supported'); return; }
    try {
      // Request mic permission upfront for clear consent UX
      if (navigator.mediaDevices?.getUserMedia) {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
      }
    } catch {
      opts.onError?.('permission_denied');
      return;
    }
    const rec = new SR();
    rec.lang = opts.lang || 'en-US';
    rec.continuous = !!opts.continuous;
    rec.interimResults = opts.interimResults !== false;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      let finalText = '';
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (interimText) { setInterim(interimText); opts.onInterim?.(interimText); }
      if (finalText) {
        setTranscript((t) => (t + ' ' + finalText).trim());
        setInterim('');
        opts.onFinal?.(finalText.trim());
      }
    };
    rec.onerror = (e: any) => { opts.onError?.(e?.error || 'unknown'); setListening(false); };
    rec.onend = () => setListening(false);

    recRef.current = rec;
    setTranscript(''); setInterim('');
    try { rec.start(); setListening(true); } catch (err) { opts.onError?.(String(err)); }
  }, [SR, opts]);

  useEffect(() => () => { try { recRef.current?.abort?.(); } catch {} }, []);

  return { supported, listening, transcript, interim, start, stop };
}
