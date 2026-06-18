// ─────────────────────────────────────────────────────────────────────────────
// useCallVoiceAI — in-call AI voice layer (cloud STT + translate, device TTS)
//
// Runs on BOTH peers during an active call over a shared Supabase Realtime
// channel (`call-voice-{callId}`) and powers two features:
//
//   1. LIVE TRANSLATION — each device captures its OWN mic, transcribes it in the
//      cloud (Lovable AI STT), translates to the listener's language, and sends
//      the translated text. The listener speaks it aloud (device TTS) + caption.
//      A speaks Punjabi → B hears Hindi, and vice-versa.
//
//   2. AI AUTO-ANSWER — when the busy callee taps "AI Answer", the AI talks to
//      the caller. The caller's device captures + transcribes the caller's speech
//      and relays the text; the callee runs the AI brain (voice-ai-stream) and
//      relays replies, which the caller's device speaks aloud.
//
// CAPTURE: instead of webkitSpeechRecognition (absent in the Android WebView and
// in conflict with the live call mic), we clone the call's existing mic track and
// run MediaRecorder + a simple energy VAD to cut utterances, then upload each
// utterance to the `voice-stt` edge function. Cloning the track means we keep
// hearing the user even while the outgoing WebRTC audio is muted (translate mode).
// ─────────────────────────────────────────────────────────────────────────────
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
  /** The local WebRTC mic/camera stream (we clone its audio track to capture). */
  localStream?: MediaStream | null;
  /** Mute / unmute this device's outgoing WebRTC audio track. */
  setOutgoingMuted?: (muted: boolean) => void;
}

const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
const recorderSupported = typeof window !== 'undefined' && typeof (window as any).MediaRecorder !== 'undefined';

// VAD / capture tuning
const VAD_RMS_THRESHOLD = 0.04;   // speech energy floor
const VAD_SILENCE_MS = 850;       // trailing silence that ends an utterance
const VAD_MAX_UTTERANCE_MS = 12000;
const VAD_POLL_MS = 100;

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

function pickRecorderMime(): string {
  if (typeof (window as any).MediaRecorder === 'undefined') return '';
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
  for (const m of candidates) {
    try { if ((window as any).MediaRecorder.isTypeSupported?.(m)) return m; } catch { /* ignore */ }
  }
  return '';
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const u8 = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    binary += String.fromCharCode(...u8.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function useCallVoiceAI(params: UseCallVoiceAIParams) {
  const { callId, userId, isInitiator, connected, myLang, initialAiAnswer, localStream, setOutgoingMuted } = params;

  const [mode, setMode] = useState<CallVoiceMode>(initialAiAnswer ? 'ai' : 'normal');
  const [status, setStatus] = useState<CallVoiceStatus>('idle');
  const [captions, setCaptions] = useState<CallCaption[]>([]);
  const [peerLang, setPeerLang] = useState<string>('');

  const modeRef = useRef(mode);
  const myLangRef = useRef(myLang);
  const peerLangRef = useRef('');
  const channelRef = useRef<RealtimeChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(localStream || null);

  // capture engine refs
  const listeningRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const captureStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStartRef = useRef(0);
  const vadTimerRef = useRef<number | null>(null);
  const pendingHasSpeechRef = useRef(false);

  // ai/tts refs
  const ttsQueueRef = useRef<Promise<void>>(Promise.resolve());
  const aiHistoryRef = useRef<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const aiBusyRef = useRef(false);
  const aiGreetingSentRef = useRef(false);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { myLangRef.current = myLang; }, [myLang]);
  useEffect(() => { localStreamRef.current = localStream || null; }, [localStream]);

  const pushCaption = useCallback((c: CallCaption) => {
    setCaptions((prev) => [...prev.slice(-40), c]);
  }, []);

  // ── localized TTS (sequential queue, device voice) ──────────────────────────
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

  // ── what to do with a finished transcript from my own mic ───────────────────
  const processFinalSpeech = useCallback(
    async (text: string, lang = myLangRef.current) => {
      const clean = text.trim();
      if (!clean) return;
      const curMode = modeRef.current;
      if (curMode === 'translate') {
        pushCaption({ id: nextId(), role: 'me', original: clean, lang });
        const target = peerLangRef.current || 'en-IN';
        const translated = await translate(clean, lang, target);
        send({ kind: 'translated', text: translated, srcText: clean, srcLang: lang, lang: target });
      } else if (curMode === 'ai' && isInitiator) {
        // Caller talking to AI: send transcript to busy callee, which runs the brain.
        pushCaption({ id: nextId(), role: 'me', original: clean, lang });
        send({ kind: 'transcript', text: clean, lang });
      }
    },
    [isInitiator, pushCaption, send, translate],
  );

  // ── cloud STT for one captured utterance ────────────────────────────────────
  const handleUtterance = useCallback(
    async (blob: Blob, mime: string) => {
      const isActive = () => modeRef.current !== 'normal';
      try {
        if (!isActive()) return;
        setStatus('thinking');
        const audioBase64 = await blobToBase64(blob);
        const { data, error } = await supabase.functions.invoke('voice-stt', {
          body: { audioBase64, mimeType: mime.split(';')[0], lang: myLangRef.current },
        });
        const text = !error ? (data?.text || '').toString().trim() : '';
        if (text) {
          await processFinalSpeech(text, myLangRef.current);
        } else if (isActive()) {
          setStatus('listening');
        }
      } catch {
        if (isActive()) setStatus('listening');
      }
    },
    [processFinalSpeech],
  );

  // ── capture engine (MediaRecorder + VAD on a clone of the call mic) ──────────
  const beginRecorder = useCallback(() => {
    const stream = captureStreamRef.current;
    if (!stream || !listeningRef.current) return;
    const mime = pickRecorderMime();
    let rec: MediaRecorder;
    try {
      rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch {
      return;
    }
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const had = pendingHasSpeechRef.current;
      pendingHasSpeechRef.current = false;
      if (had && chunks.length) {
        const outMime = rec.mimeType || mime || 'audio/webm';
        void handleUtterance(new Blob(chunks, { type: outMime }), outMime);
      }
      if (listeningRef.current) beginRecorder();
    };
    recorderRef.current = rec;
    recorderStartRef.current = Date.now();
    try { rec.start(); } catch { /* already started */ }
  }, [handleUtterance]);

  const startCapture = useCallback(() => {
    if (!recorderSupported) return false;
    if (captureStreamRef.current) return true; // already running
    const src = localStreamRef.current;
    const track = src?.getAudioTracks?.()[0];
    if (!track) return false;
    let captureStream: MediaStream;
    try {
      captureStream = new MediaStream([track.clone()]);
    } catch {
      captureStream = new MediaStream([track]);
    }
    captureStreamRef.current = captureStream;

    let speech = false;
    let lastVoice = Date.now();

    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      const ctx: AudioContext = new AC();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(captureStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize);

      const tick = () => {
        if (!listeningRef.current) return;
        analyser.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / data.length);
        const now = Date.now();
        if (rms > VAD_RMS_THRESHOLD) {
          speech = true;
          lastVoice = now;
          if (modeRef.current !== 'normal' && status !== 'speaking') setStatus('listening');
        }
        const rec = recorderRef.current;
        const elapsed = rec ? now - recorderStartRef.current : 0;
        if (rec && rec.state === 'recording') {
          if ((speech && now - lastVoice > VAD_SILENCE_MS) || elapsed > VAD_MAX_UTTERANCE_MS) {
            pendingHasSpeechRef.current = speech;
            speech = false;
            try { rec.stop(); } catch { /* ignore */ }
          }
        }
        vadTimerRef.current = window.setTimeout(tick, VAD_POLL_MS);
      };

      void ctx.resume?.();
      beginRecorder();
      tick();
      return true;
    } catch {
      // Fallback: no WebAudio VAD — record in fixed 4s windows.
      beginRecorder();
      const loop = () => {
        if (!listeningRef.current) return;
        const rec = recorderRef.current;
        if (rec && rec.state === 'recording') {
          pendingHasSpeechRef.current = true;
          try { rec.stop(); } catch { /* ignore */ }
        }
        vadTimerRef.current = window.setTimeout(loop, 4000);
      };
      vadTimerRef.current = window.setTimeout(loop, 4000);
      return true;
    }
  }, [beginRecorder, status]);

  const startListening = useCallback(() => {
    if (listeningRef.current) return;
    listeningRef.current = true;
    if (!startCapture()) {
      // localStream not ready yet — the [localStream] effect will retry.
      setStatus('listening');
    }
  }, [startCapture]);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    if (vadTimerRef.current) { clearTimeout(vadTimerRef.current); vadTimerRef.current = null; }
    try { recorderRef.current?.stop(); } catch { /* ignore */ }
    recorderRef.current = null;
    try { captureStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    captureStreamRef.current = null;
    try { audioCtxRef.current?.close(); } catch { /* ignore */ }
    audioCtxRef.current = null;
    pendingHasSpeechRef.current = false;
  }, []);

  // Retry starting capture once the local stream becomes available.
  useEffect(() => {
    if (listeningRef.current && !captureStreamRef.current && localStream) {
      startCapture();
    }
  }, [localStream, startCapture]);

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

  const sendAiGreeting = useCallback(async () => {
    if (aiGreetingSentRef.current) return;
    aiGreetingSentRef.current = true;
    const greeting = 'Hello, this is Chatr AI. They are busy right now, but I can take your message.';
    const callerLang = peerLangRef.current || 'en-IN';
    const spokenGreeting = await translate(greeting, 'en-IN', callerLang);
    send({ kind: 'ai-reply', text: spokenGreeting, lang: callerLang });
    pushCaption({ id: nextId(), role: 'ai', original: spokenGreeting, lang: callerLang });
  }, [pushCaption, send, translate]);

  // ── incoming realtime messages ─────────────────────────────────────────────
  const handleMessage = useCallback(
    (msg: VoiceMsg) => {
      if (!msg || msg.from === userId) return;
      switch (msg.kind) {
        case 'hello':
          if (!isInitiator && modeRef.current === 'ai') {
            send({ kind: 'ai-mode', enabled: true });
            send({ kind: 'lang', lang: myLangRef.current });
            window.setTimeout(sendAiGreeting, 700);
          }
          break;
        case 'lang':
          if (msg.lang) {
            peerLangRef.current = msg.lang;
            setPeerLang(msg.lang);
            if (!isInitiator && modeRef.current === 'ai') window.setTimeout(sendAiGreeting, 150);
          }
          break;
        case 'translate-mode':
          if (msg.enabled) {
            if (modeRef.current !== 'translate') {
              setMode('translate');
              setOutgoingMuted?.(true);
              send({ kind: 'lang', lang: myLangRef.current });
              startListening();
            }
          } else if (modeRef.current === 'translate') {
            setMode('normal');
            setOutgoingMuted?.(false);
            stopListening();
          }
          break;
        case 'translated':
          if (msg.text) {
            pushCaption({ id: nextId(), role: 'them', original: msg.srcText || '', translated: msg.text, lang: msg.lang || myLangRef.current });
            speak(msg.text, msg.lang || myLangRef.current);
          }
          break;
        case 'ai-mode':
          if (isInitiator) {
            if (msg.enabled) {
              setMode('ai');
              setOutgoingMuted?.(false);
              startListening();
            } else {
              setMode('normal');
              setOutgoingMuted?.(false);
              stopListening();
            }
          }
          break;
        case 'transcript':
          if (!isInitiator && modeRef.current === 'ai' && msg.text) {
            pushCaption({ id: nextId(), role: 'them', original: msg.text, lang: msg.lang || 'en-IN' });
            handleCallerTranscript(msg.text, msg.lang || peerLangRef.current || 'en-IN');
          }
          break;
        case 'ai-reply':
          if (isInitiator && msg.text) {
            pushCaption({ id: nextId(), role: 'ai', original: msg.text, lang: myLangRef.current });
            speak(msg.text, myLangRef.current);
          }
          break;
      }
    },
    [userId, isInitiator, setOutgoingMuted, send, startListening, stopListening, pushCaption, speak, handleCallerTranscript, sendAiGreeting],
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
        send({ kind: 'hello' });
        send({ kind: 'lang', lang: myLangRef.current });
        if (initialAiAnswer && !isInitiator) {
          setMode('ai');
          setOutgoingMuted?.(true);
          send({ kind: 'ai-mode', enabled: true });
          send({ kind: 'lang', lang: myLangRef.current });
          window.setTimeout(sendAiGreeting, 900);
        }
      }
    });
    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
      stopListening();
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
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
      try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
    }
  }, [send, setOutgoingMuted, startListening, stopListening]);

  // Busy user takes over from the AI (callee side).
  const takeOverAI = useCallback(() => {
    if (modeRef.current !== 'ai') return;
    setMode('normal');
    setOutgoingMuted?.(false);
    send({ kind: 'ai-mode', enabled: false });
    aiBusyRef.current = false;
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
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
      sttSupported: recorderSupported,
      ttsSupported,
      translateActive: mode === 'translate',
      aiActive: mode === 'ai',
      toggleTranslate,
      takeOverAI,
    }),
    [mode, status, captions, peerLang, toggleTranslate, takeOverAI],
  );
}
