// ─────────────────────────────────────────────────────────────────────────────
// useCallVoiceAI — in-call AI voice layer (zero-cost, on-device first)
//
// Runs on BOTH peers during an active call and powers two real features over a
// shared Supabase Realtime channel (`call-voice-{callId}`):
//
//   1. LIVE TRANSLATION  — each device transcribes its OWN mic (STT) in the
//      speaker's language, translates to the listener's language, and sends the
//      translated text. The listener speaks it aloud (TTS) + shows a caption.
//      Result: A speaks Punjabi, B hears Hindi, and vice-versa — naturally.
//
//   2. AI AUTO-ANSWER    — when the busy callee taps "AI Answer", the AI talks
//      to the caller on their behalf. The caller's device transcribes the
//      caller's speech and relays the text; the callee's device runs the AI
//      brain (voice-ai-stream) and relays replies, which the caller's device
//      speaks aloud. The busy user sees a live transcript and can take over.
//
// Audio capture (STT) uses each device's own microphone, and playback (TTS)
// uses each device's own speaker — so the whole loop is $0 per turn.
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition as NativeSpeechRecognition } from '@capacitor-community/speech-recognition';

export type CallVoiceMode = 'normal' | 'translate' | 'ai';
export type CallVoiceStatus = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface CallCaption {
  id: string;
  role: 'me' | 'them' | 'ai';
  original: string;
  translated?: string;
  lang: string;
}

interface VoiceMsg {
  kind: 'hello' | 'lang' | 'translate-mode' | 'translated' | 'ai-mode' | 'transcript' | 'ai-reply';
  from: string;
  lang?: string;
  enabled?: boolean;
  text?: string;       // payload (translated text / transcript / ai reply)
  srcText?: string;    // original text before translation
  srcLang?: string;
}

export interface UseCallVoiceAIParams {
  callId: string;
  userId: string;
  isInitiator: boolean;        // true = caller, false = callee
  connected: boolean;          // start only once the call is connected
  myLang: string;              // this user's spoken language (BCP-47)
  initialAiAnswer?: boolean;   // callee answered the call with AI
  /** Mute / unmute this device's outgoing WebRTC audio track. */
  setOutgoingMuted?: (muted: boolean) => void;
}

const getSR = (): any | null => {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
};

const sttSupported = !!getSR();
const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
const nativePlatform = typeof window !== 'undefined' && Capacitor.isNativePlatform();

let captionSeq = 0;
const nextId = () => `${Date.now()}-${captionSeq++}`;

// Pick a SpeechSynthesis voice that matches a BCP-47 locale (prefix match).
function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  if (!ttsSupported) return undefined;
  const voices = window.speechSynthesis.getVoices();
  const base = lang.split('-')[0].toLowerCase();
  return (
    voices.find((v) => v.lang?.toLowerCase() === lang.toLowerCase()) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(base))
  );
}

// Split streamed text into speakable sentence chunks.
function drainSentences(buffer: string): { sentences: string[]; rest: string } {
  const sentences: string[] = [];
  const regex = /[^.!?。！？\n]+[.!?。！？\n]+/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(buffer)) !== null) {
    sentences.push(m[0].trim());
    lastIndex = regex.lastIndex;
  }
  return { sentences: sentences.filter(Boolean), rest: buffer.slice(lastIndex) };
}

export function useCallVoiceAI(params: UseCallVoiceAIParams) {
  const { callId, userId, isInitiator, connected, myLang, initialAiAnswer, setOutgoingMuted } = params;

  const [mode, setMode] = useState<CallVoiceMode>(initialAiAnswer ? 'ai' : 'normal');
  const [status, setStatus] = useState<CallVoiceStatus>('idle');
  const [captions, setCaptions] = useState<CallCaption[]>([]);
  const [peerLang, setPeerLang] = useState<string>('');
  const [nativeSttReady, setNativeSttReady] = useState(nativePlatform);

  const modeRef = useRef(mode);
  const myLangRef = useRef(myLang);
  const peerLangRef = useRef('');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const recRef = useRef<any>(null);
  const listeningRef = useRef(false);
  const ttsQueueRef = useRef<Promise<void>>(Promise.resolve());
  const aiHistoryRef = useRef<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const aiBusyRef = useRef(false);
  const aiGreetingSentRef = useRef(false);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { myLangRef.current = myLang; }, [myLang]);

  useEffect(() => {
    if (!nativePlatform || sttSupported) return;
    NativeSpeechRecognition.available()
      .then(({ available }) => setNativeSttReady(!!available))
      .catch(() => setNativeSttReady(false));
  }, []);

  const pushCaption = useCallback((c: CallCaption) => {
    setCaptions((prev) => [...prev.slice(-40), c]);
  }, []);

  // ── localized TTS (sequential queue) ───────────────────────────────────────
  const speak = useCallback((text: string, lang: string): Promise<void> => {
    const clean = (text || '').trim();
    if (!clean || !ttsSupported) return Promise.resolve();
    const run = () =>
      new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
          if (settled) return;
          settled = true;
          clearTimeout(safety);
          setStatus(modeRef.current === 'normal' ? 'idle' : 'listening');
          resolve();
        };
        const safety = window.setTimeout(finish, Math.max(4500, clean.length * 95));
        try {
          window.speechSynthesis.resume();
          const u = new SpeechSynthesisUtterance(clean);
          u.lang = lang;
          const v = pickVoice(lang);
          if (v) u.voice = v;
          u.rate = 1;
          setStatus('speaking');
          u.onend = finish;
          u.onerror = finish;
          window.speechSynthesis.speak(u);
          window.setTimeout(() => window.speechSynthesis.resume(), 250);
        } catch {
          finish();
        }
      });
    ttsQueueRef.current = ttsQueueRef.current.then(run, run);
    return ttsQueueRef.current;
  }, []);

  // ── realtime send ──────────────────────────────────────────────────────────
  const send = useCallback((msg: Omit<VoiceMsg, 'from'>) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'voice',
      payload: { ...msg, from: userId } as VoiceMsg,
    });
  }, [userId]);

  // ── translation ────────────────────────────────────────────────────────────
  const translate = useCallback(
    async (text: string, sourceLang: string, targetLang: string): Promise<string> => {
      try {
        const { data, error } = await supabase.functions.invoke('voice-translate', {
          body: { text, sourceLang, targetLang },
        });
        if (error) return text;
        return (data?.translated as string)?.trim() || text;
      } catch {
        return text;
      }
    },
    [],
  );

  const processFinalSpeech = useCallback(
    async (text: string, lang = myLangRef.current) => {
      const clean = text.trim();
      if (!clean) return;
      const curMode = modeRef.current;
      if (curMode === 'translate') {
        // My speech -> translate to the peer's language -> send. WebRTC mic is
        // muted while this mode is on, so the other side hears only translated voice.
        pushCaption({ id: nextId(), role: 'me', original: clean, lang });
        const target = peerLangRef.current || 'en-IN';
        const translated = await translate(clean, lang, target);
        send({ kind: 'translated', text: translated, srcText: clean, srcLang: lang, lang: target });
      } else if (curMode === 'ai' && isInitiator) {
        // Caller talking to AI: send transcript to busy callee device, which runs the AI brain.
        pushCaption({ id: nextId(), role: 'me', original: clean, lang });
        send({ kind: 'transcript', text: clean, lang });
      }
    },
    [isInitiator, pushCaption, send, translate],
  );

  // ── AI brain (streams reply sentences from the gateway) ─────────────────────
  const streamAiReply = useCallback(
    async (userText: string, replyLang: string, onSentence: (s: string) => void) => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-ai-stream`;
      const { data: { session } } = await supabase.auth.getSession();
      const langName = replyLang.split('-')[0];
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          message: userText,
          history: aiHistoryRef.current.map((h) => ({ role: h.role, content: h.text })),
          systemPrompt:
            `You are answering a phone call on behalf of a busy person. Be warm, polite and concise. ` +
            `Speak naturally in the caller's language (locale: ${replyLang}/${langName}). ` +
            `Find out who is calling and why, take a short message, and let them know the person will call back. ` +
            `Keep each reply to 1-2 short spoken sentences. No markdown, no emojis — your reply is read aloud.`,
        }),
      });
      if (!resp.ok || !resp.body) throw new Error(`ai_${resp.status}`);

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
          const t = line.trim();
          if (!t.startsWith('data:')) continue;
          const payload = t.slice(5).trim();
          if (payload === '[DONE]') continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content || '';
            if (!delta) continue;
            full += delta;
            pending += delta;
            const { sentences, rest } = drainSentences(pending);
            pending = rest;
            for (const s of sentences) onSentence(s);
          } catch { /* keepalive */ }
        }
      }
      const tail = pending.trim();
      if (tail) onSentence(tail);
      return full.trim();
    },
    [],
  );

  // Callee: process a caller transcript through the AI and relay the reply.
  const handleCallerTranscript = useCallback(
    async (text: string, callerLang: string) => {
      if (aiBusyRef.current) return;
      aiBusyRef.current = true;
      setStatus('thinking');
      aiHistoryRef.current.push({ role: 'user', text });
      let full = '';
      try {
        full = await streamAiReply(text, callerLang || 'en-IN', (sentence) => {
          // Relay each sentence to the caller's device to speak immediately.
          send({ kind: 'ai-reply', text: sentence });
          pushCaption({ id: nextId(), role: 'ai', original: sentence, lang: callerLang });
        });
        if (full) aiHistoryRef.current.push({ role: 'assistant', text: full });
      } catch {
        const fallback = 'Sorry, they are busy right now. Please try again later.';
        send({ kind: 'ai-reply', text: fallback });
        pushCaption({ id: nextId(), role: 'ai', original: fallback, lang: callerLang });
      } finally {
        aiBusyRef.current = false;
        setStatus('idle');
      }
    },
    [send, streamAiReply, pushCaption],
  );

  // ── STT (own mic) ──────────────────────────────────────────────────────────
  const stopListening = useCallback(() => {
    listeningRef.current = false;
    try { recRef.current?.abort?.(); } catch {}
    try { NativeSpeechRecognition.stop(); } catch {}
    recRef.current = null;
  }, []);

  const startListening = useCallback(() => {
    const SR = getSR();
    listeningRef.current = true;
    if (!SR && nativePlatform) {
      setStatus('listening');
      NativeSpeechRecognition.requestPermissions()
        .then(() => NativeSpeechRecognition.start({
          language: myLangRef.current,
          maxResults: 1,
          partialResults: false,
          popup: false,
        }))
        .then((result: any) => processFinalSpeech(result?.matches?.[0] || '', myLangRef.current))
        .catch(() => setStatus('idle'))
        .finally(() => {
          if (listeningRef.current) {
            setTimeout(() => { if (listeningRef.current) startListening(); }, 200);
          }
        });
      return;
    }
    if (!SR) return;
    const rec = new SR();
    rec.lang = myLangRef.current;
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    let finalText = '';
    setStatus('listening');

    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      }
    };
    rec.onerror = (e: any) => {
      if (e?.error === 'not-allowed' || e?.error === 'service-not-allowed') {
        listeningRef.current = false;
      }
    };
    rec.onend = async () => {
      recRef.current = null;
      await processFinalSpeech(finalText, myLangRef.current);
      if (listeningRef.current) {
        // keep the ear open
        setTimeout(() => { if (listeningRef.current) startListening(); }, 150);
      } else {
        setStatus('idle');
      }
    };
    recRef.current = rec;
    try { rec.start(); } catch { /* already started */ }
  }, [processFinalSpeech]);

  // ── incoming realtime messages ─────────────────────────────────────────────
  const handleMessage = useCallback(
    (msg: VoiceMsg) => {
      if (!msg || msg.from === userId) return;
      switch (msg.kind) {
        case 'lang':
          if (msg.lang) { peerLangRef.current = msg.lang; setPeerLang(msg.lang); }
          break;
        case 'translate-mode':
          if (msg.enabled) {
            // Peer turned on translation — mirror it locally.
            if (modeRef.current !== 'translate') {
              setMode('translate');
              setOutgoingMuted?.(true);
              send({ kind: 'lang', lang: myLangRef.current });
              if (!listeningRef.current) startListening();
            }
          } else if (modeRef.current === 'translate') {
            setMode('normal');
            setOutgoingMuted?.(false);
            stopListening();
          }
          break;
        case 'translated':
          // Peer's speech, already translated into my language — speak it.
          if (msg.text) {
            pushCaption({ id: nextId(), role: 'them', original: msg.srcText || '', translated: msg.text, lang: msg.lang || myLangRef.current });
            speak(msg.text, msg.lang || myLangRef.current);
          }
          break;
        case 'ai-mode':
          // Callee enabled AI auto-answer. Caller starts relaying its speech.
          if (isInitiator) {
            if (msg.enabled) {
              setMode('ai');
              if (!listeningRef.current) startListening();
            } else {
              setMode('normal');
              setOutgoingMuted?.(false);
              stopListening();
            }
          }
          break;
        case 'transcript':
          // Caller's speech (callee side) — feed the AI.
          if (!isInitiator && modeRef.current === 'ai' && msg.text) {
            pushCaption({ id: nextId(), role: 'them', original: msg.text, lang: msg.lang || 'en-IN' });
            handleCallerTranscript(msg.text, msg.lang || peerLangRef.current || 'en-IN');
          }
          break;
        case 'ai-reply':
          // AI reply (caller side) — speak it to the caller.
          if (isInitiator && msg.text) {
            pushCaption({ id: nextId(), role: 'ai', original: msg.text, lang: myLangRef.current });
            speak(msg.text, myLangRef.current);
          }
          break;
      }
    },
    [userId, isInitiator, setOutgoingMuted, send, startListening, stopListening, pushCaption, speak, handleCallerTranscript],
  );

  // ── channel lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!connected || !callId || !userId) return;
    const channel = supabase.channel(`call-voice-${callId}`, {
      config: { broadcast: { self: false } },
    });
    channel.on('broadcast', { event: 'voice' }, (p) => handleMessage(p.payload as VoiceMsg));
    channel.subscribe((st) => {
      if (st === 'SUBSCRIBED') {
        // Announce my language so the peer can translate to me.
        send({ kind: 'lang', lang: myLangRef.current });
        // If callee answered with AI, kick it off now.
        if (initialAiAnswer && !isInitiator) {
          setMode('ai');
          setOutgoingMuted?.(true);
          send({ kind: 'ai-mode', enabled: true });
          send({ kind: 'lang', lang: myLangRef.current });
        }
      }
    });
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      stopListening();
      try { window.speechSynthesis?.cancel(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, callId, userId]);

  // ── public controls ────────────────────────────────────────────────────────
  const toggleTranslate = useCallback(() => {
    if (modeRef.current === 'ai') return; // AI mode owns the loop
    const enabling = modeRef.current !== 'translate';
    setMode(enabling ? 'translate' : 'normal');
    setOutgoingMuted?.(enabling);
    send({ kind: 'translate-mode', enabled: enabling });
    if (enabling) {
      send({ kind: 'lang', lang: myLangRef.current });
      startListening();
    } else {
      stopListening();
      try { window.speechSynthesis?.cancel(); } catch {}
    }
  }, [send, setOutgoingMuted, startListening, stopListening]);

  // Busy user takes over from the AI (callee side).
  const takeOverAI = useCallback(() => {
    if (modeRef.current !== 'ai') return;
    setMode('normal');
    setOutgoingMuted?.(false);
    send({ kind: 'ai-mode', enabled: false });
    aiBusyRef.current = false;
    try { window.speechSynthesis?.cancel(); } catch {}
    setStatus('idle');
  }, [send, setOutgoingMuted]);

  // Update announced language if the user changes it mid-call.
  useEffect(() => {
    if (channelRef.current && connected) send({ kind: 'lang', lang: myLang });
  }, [myLang, connected, send]);

  return useMemo(
    () => ({
      mode,
      status,
      captions,
      peerLang,
      sttSupported,
      ttsSupported,
      translateActive: mode === 'translate',
      aiActive: mode === 'ai',
      toggleTranslate,
      takeOverAI,
    }),
    [mode, status, captions, peerLang, toggleTranslate, takeOverAI],
  );
}
