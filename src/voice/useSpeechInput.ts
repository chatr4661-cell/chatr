// Device Speech-to-Text via Web Speech API (privacy-first; audio never leaves device).
import { useCallback, useEffect, useRef, useState } from 'react';

type SR = any;
const getSR = (): SR | null => {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

export type MicPermission = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface SpeechInputOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onFinal?: (text: string) => void;
  onInterim?: (text: string) => void;
  onError?: (err: string) => void;
  onPermissionChange?: (p: MicPermission) => void;
}

async function queryMicPermission(): Promise<MicPermission> {
  try {
    const anyNav: any = navigator;
    if (anyNav?.permissions?.query) {
      const res = await anyNav.permissions.query({ name: 'microphone' as PermissionName });
      return (res.state as MicPermission) || 'unknown';
    }
  } catch {}
  return 'unknown';
}

export function useSpeechInput(opts: SpeechInputOptions = {}) {
  const SR = getSR();
  const supported = !!SR;
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [permission, setPermission] = useState<MicPermission>(supported ? 'unknown' : 'unsupported');
  const recRef = useRef<any>(null);
  const permRef = useRef<any>(null);

  const updatePerm = useCallback((p: MicPermission) => {
    setPermission(p);
    opts.onPermissionChange?.(p);
  }, [opts]);

  // Probe + subscribe to permission changes
  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    (async () => {
      const p = await queryMicPermission();
      if (cancelled) return;
      updatePerm(p);
      try {
        const anyNav: any = navigator;
        if (anyNav?.permissions?.query) {
          const status: any = await anyNav.permissions.query({ name: 'microphone' as PermissionName });
          permRef.current = status;
          status.onchange = () => updatePerm(status.state as MicPermission);
        }
      } catch {}
    })();
    return () => {
      cancelled = true;
      if (permRef.current) try { permRef.current.onchange = null; } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  const checkPermission = useCallback(async () => {
    const p = await queryMicPermission();
    updatePerm(p);
    return p;
  }, [updatePerm]);

  const stop = useCallback(() => {
    try { recRef.current?.stop(); } catch {}
    setListening(false);
  }, []);

  const start = useCallback(async () => {
    if (!SR) { updatePerm('unsupported'); opts.onError?.('not_supported'); return; }
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
        updatePerm('granted');
      }
    } catch (err: any) {
      const name = err?.name || '';
      if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'PermissionDeniedError') {
        updatePerm('denied');
        opts.onError?.('permission_denied');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        opts.onError?.('no_microphone');
      } else {
        opts.onError?.(name || 'permission_error');
      }
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
    rec.onerror = (e: any) => {
      const code = e?.error || 'unknown';
      if (code === 'not-allowed' || code === 'service-not-allowed') updatePerm('denied');
      opts.onError?.(code);
      setListening(false);
    };
    rec.onend = () => setListening(false);

    recRef.current = rec;
    setTranscript(''); setInterim('');
    try { rec.start(); setListening(true); } catch (err) { opts.onError?.(String(err)); }
  }, [SR, opts, updatePerm]);

  useEffect(() => () => { try { recRef.current?.abort?.(); } catch {} }, []);

  return { supported, listening, transcript, interim, permission, checkPermission, start, stop };
}
