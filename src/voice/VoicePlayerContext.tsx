import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { voiceEngine, VoiceEngine } from './VoiceEngine';
import type { VoiceProvider, VoiceQueueItem, VoicePersisted } from './types';
import { DEFAULT_PREFS } from './types';

interface VoiceCtx {
  isPlaying: boolean;
  isPaused: boolean;
  currentMessageId: string | null;
  currentText: string | null;
  queue: VoiceQueueItem[];
  provider: VoiceProvider;
  prefs: VoicePersisted;
  voices: SpeechSynthesisVoice[];
  deviceSupported: boolean;
  play: (text: string, messageId?: string) => void;
  enqueue: (text: string, messageId?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  updatePrefs: (patch: Partial<VoicePersisted>) => void;
  toggleAutoRead: () => void;
  // legacy
  autoReadEnabled: boolean;
}

const STORAGE_KEY = 'chatr.voice.prefs';
const VoiceContext = createContext<VoiceCtx | null>(null);

function loadPrefs(): VoicePersisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_PREFS };
}
function savePrefs(p: VoicePersisted) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

export function VoicePlayerProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<VoicePersisted>(loadPrefs);
  const prefsRef = useRef(prefs);
  useEffect(() => { prefsRef.current = prefs; savePrefs(prefs); }, [prefs]);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => VoiceEngine.listVoices());
  const deviceSupported = VoiceEngine.deviceSupported();

  useEffect(() => {
    if (!deviceSupported) return;
    const handler = () => setVoices(VoiceEngine.listVoices());
    handler();
    window.speechSynthesis.onvoiceschanged = handler;
    return () => { if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = null; };
  }, [deviceSupported]);

  const [provider, setProvider] = useState<VoiceProvider>('device');
  const [queue, setQueue] = useState<VoiceQueueItem[]>([]);
  const [current, setCurrent] = useState<VoiceQueueItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const playedIds = useRef<Set<string>>(new Set());

  const playNext = useCallback((items: VoiceQueueItem[]) => {
    const [head, ...rest] = items;
    if (!head) { setCurrent(null); setIsPlaying(false); return; }
    setCurrent(head); setQueue(rest);
    setIsPlaying(true); setIsPaused(false);
    voiceEngine.speak(head.text, prefsRef.current).then(() => {
      setProvider(voiceEngine.getProvider());
    }).catch(() => {});
  }, []);

  useEffect(() => {
    voiceEngine.onEnd = () => {
      setIsPlaying(false);
      setQueue((q) => {
        if (q.length === 0) { setCurrent(null); return q; }
        queueMicrotask(() => playNext(q));
        return q;
      });
    };
    voiceEngine.onError = () => { setIsPlaying(false); setCurrent(null); };
    return () => { voiceEngine.onEnd = null; voiceEngine.onError = null; };
  }, [playNext]);

  const play = useCallback((text: string, messageId?: string) => {
    if (!prefsRef.current.voice_enabled) return;
    const clean = (text || '').trim();
    if (!clean) return;
    const id = messageId || `manual_${Date.now()}`;
    if (playedIds.current.has(id)) return;
    playedIds.current.add(id);
    playNext([{ id, text: clean }]);
  }, [playNext]);

  const enqueue = useCallback((text: string, messageId?: string) => {
    if (!prefsRef.current.voice_enabled) return;
    const clean = (text || '').trim();
    if (!clean) return;
    const id = messageId || `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    if (playedIds.current.has(id)) return;
    playedIds.current.add(id);
    setQueue((q) => {
      const next = [...q, { id, text: clean }];
      if (!isPlaying && !current) {
        queueMicrotask(() => playNext(next));
        return [];
      }
      return next;
    });
  }, [isPlaying, current, playNext]);

  const pause = useCallback(() => { voiceEngine.pause(); setIsPaused(true); }, []);
  const resume = useCallback(() => { voiceEngine.resume(); setIsPaused(false); }, []);
  const stop = useCallback(() => {
    voiceEngine.stop();
    setQueue([]); setCurrent(null); setIsPlaying(false); setIsPaused(false);
  }, []);

  const updatePrefs = useCallback((patch: Partial<VoicePersisted>) => {
    setPrefs((p) => ({ ...p, ...patch }));
  }, []);
  const toggleAutoRead = useCallback(() => {
    setPrefs((p) => ({ ...p, auto_read: !p.auto_read }));
  }, []);

  const value = useMemo<VoiceCtx>(() => ({
    isPlaying, isPaused,
    currentMessageId: current?.id ?? null,
    currentText: current?.text ?? null,
    queue, provider, prefs, voices, deviceSupported,
    play, enqueue, pause, resume, stop,
    updatePrefs, toggleAutoRead,
    autoReadEnabled: prefs.auto_read,
  }), [isPlaying, isPaused, current, queue, provider, prefs, voices, deviceSupported, play, enqueue, pause, resume, stop, updatePrefs, toggleAutoRead]);

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoiceContext() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoiceContext must be used within VoicePlayerProvider');
  return ctx;
}
