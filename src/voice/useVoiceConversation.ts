// Bidirectional voice AI orchestrator (zero-cost path).
//
//   ear   -> device STT (Web Speech API / Android SpeechRecognizer)
//   brain -> on-device Gemini Nano if available, else streamed cloud fallback
//   mouth -> device TTS (SpeechSynthesis) via VoiceEngine, sentence-chunked
//
// The loop is half-duplex (mic pauses while the assistant speaks) for the
// lowest, most reliable latency; `interrupt()` provides instant barge-in.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { deviceAI } from '@/services/chatrUltra/deviceAI';
import { voiceEngine } from './VoiceEngine';
import { DEFAULT_PREFS, type VoicePersisted } from './types';

export type ConversationStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface ConversationTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface VoiceConversationOptions {
  systemPrompt?: string;
  lang?: string;
  prefs?: Partial<VoicePersisted>;
  onError?: (code: string) => void;
}

type SR = any;
const getSR = (): SR | null => {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

// Split streamed text into speakable sentence chunks as soon as one completes.
function drainSentences(buffer: string): { sentences: string[]; rest: string } {
  const sentences: string[] = [];
  const regex = /[^.!?。！？\n]+[.!?。！？\n]+/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(buffer)) !== null) {
    sentences.push(match[0].trim());
    lastIndex = regex.lastIndex;
  }
  return { sentences: sentences.filter(Boolean), rest: buffer.slice(lastIndex) };
}

export function useVoiceConversation(options: VoiceConversationOptions = {}) {
  const { systemPrompt, lang = 'en-US', onError } = options;

  const prefs = useMemo<VoicePersisted>(
    () => ({ ...DEFAULT_PREFS, ...(options.prefs || {}) }),
    [options.prefs],
  );

  const [status, setStatus] = useState<ConversationStatus>('idle');
  const [active, setActive] = useState(false);
  const [supported] = useState<boolean>(() => !!getSR() && typeof window !== 'undefined' && 'speechSynthesis' in window);
  const [interim, setInterim] = useState('');
  const [turns, setTurns] = useState<ConversationTurn[]>([]);

  const recRef = useRef<any>(null);
  const activeRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const nativeRef = useRef(false);
  const historyRef = useRef<ConversationTurn[]>([]);

  useEffect(() => {
    deviceAI.initialize().then(() => {
      nativeRef.current = deviceAI
        .getAvailableModels()
        .some((m) => m.modelType === 'gemini-nano' && m.available);
    }).catch(() => {});
  }, []);

  const pushTurn = useCallback((turn: ConversationTurn) => {
    historyRef.current = [...historyRef.current, turn].slice(-20);
    setTurns((t) => [...t, turn]);
  }, []);

  // ---- speaking (sentence queue) -------------------------------------------
  const speakSentence = useCallback(
    (text: string) => voiceEngine.speakAwait(text, prefs),
    [prefs],
  );

  // ---- cloud streaming brain -----------------------------------------------
  const streamCloudReply = useCallback(
    async (text: string, onSentence: (s: string) => Promise<void>): Promise<string> => {
      const controller = new AbortController();
      abortRef.current = controller;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-ai-stream`;
      const { data: { session } } = await supabase.auth.getSession();

      const resp = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          history: historyRef.current,
          systemPrompt,
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) throw new Error('rate_limit');
        if (resp.status === 402) throw new Error('credits');
        throw new Error(`http_${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let sse = '';
      let pending = '';
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        sse += decoder.decode(value, { stream: true });
        const lines = sse.split('\n');
        sse = lines.pop() || '';
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const payload = trimmed.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content || '';
            if (!delta) continue;
            full += delta;
            pending += delta;
            const { sentences, rest } = drainSentences(pending);
            pending = rest;
            for (const s of sentences) {
              if (controller.signal.aborted) return full;
              await onSentence(s);
            }
          } catch {
            // ignore partial / non-JSON keepalive lines
          }
        }
      }
      const tail = pending.trim();
      if (tail && !controller.signal.aborted) await onSentence(tail);
      return full;
    },
    [systemPrompt],
  );

  // ---- run one turn: STT text -> brain -> mouth ----------------------------
  const runTurn = useCallback(
    async (userText: string) => {
      const clean = userText.trim();
      if (!clean) return;
      pushTurn({ role: 'user', text: clean });
      setStatus('thinking');
      setInterim('');

      try {
        let spokeAnything = false;
        let assistantText = '';
        const speak = async (s: string) => {
          if (!activeRef.current) return;
          if (!spokeAnything) { spokeAnything = true; setStatus('speaking'); }
          await speakSentence(s);
        };

        if (nativeRef.current) {
          // On-device Gemini Nano — zero cost, fully private.
          const r = await deviceAI.runInference(clean, 'gemini-nano', { systemPrompt });
          assistantText = r.text || '';
          const { sentences, rest } = drainSentences(assistantText + '\n');
          for (const s of [...sentences, rest].filter(Boolean)) await speak(s);
        } else {
          // Streamed cloud fallback (Lovable AI Gateway via edge function).
          assistantText = await streamCloudReply(clean, speak);
        }

        if (assistantText.trim()) pushTurn({ role: 'assistant', text: assistantText.trim() });
      } catch (e: any) {
        const code = e?.message === 'rate_limit' ? 'rate_limit'
          : e?.message === 'credits' ? 'credits'
          : 'ai_error';
        if (e?.name !== 'AbortError') onError?.(code);
      } finally {
        abortRef.current = null;
      }
    },
    [pushTurn, speakSentence, streamCloudReply, systemPrompt, onError],
  );

  // ---- listening -----------------------------------------------------------
  const startListening = useCallback(() => {
    const SR = getSR();
    if (!SR || !activeRef.current) return;
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    let finalText = '';
    setStatus('listening');

    rec.onresult = (e: any) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim(interimText);
    };
    rec.onerror = (e: any) => {
      const code = e?.error || 'unknown';
      if (code === 'no-speech') return; // restart handled in onend
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        activeRef.current = false;
        setActive(false);
        onError?.('permission_denied');
      }
    };
    rec.onend = async () => {
      recRef.current = null;
      if (!activeRef.current) { setStatus('idle'); return; }
      const text = finalText.trim();
      if (text) {
        await runTurn(text);
        if (activeRef.current) startListening();
      } else {
        startListening(); // keep the ear open
      }
    };

    recRef.current = rec;
    try { rec.start(); } catch { /* already started */ }
  }, [lang, runTurn, onError]);

  // ---- public controls -----------------------------------------------------
  const stopListeningInternal = useCallback(() => {
    try { recRef.current?.abort?.(); } catch {}
    recRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!supported) { onError?.('not_supported'); return; }
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        const s = await navigator.mediaDevices.getUserMedia({ audio: true });
        s.getTracks().forEach((t) => t.stop());
      }
    } catch (err: any) {
      const name = err?.name || '';
      onError?.(name === 'NotAllowedError' ? 'permission_denied' : 'mic_error');
      return;
    }
    activeRef.current = true;
    setActive(true);
    startListening();
  }, [supported, startListening, onError]);

  // Barge-in / stop the assistant immediately and return to listening.
  const interrupt = useCallback(() => {
    voiceEngine.stop();
    abortRef.current?.abort();
    abortRef.current = null;
    if (activeRef.current) { stopListeningInternal(); startListening(); }
  }, [stopListeningInternal, startListening]);

  const stop = useCallback(() => {
    activeRef.current = false;
    setActive(false);
    voiceEngine.stop();
    abortRef.current?.abort();
    abortRef.current = null;
    stopListeningInternal();
    setStatus('idle');
    setInterim('');
  }, [stopListeningInternal]);

  useEffect(() => () => { stop(); }, [stop]);

  return { status, active, supported, interim, turns, start, stop, interrupt };
}
