import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { voiceEngine } from './VoiceEngine';
import type { VoiceProvider, VoiceQueueItem, VoicePersisted } from './types';

interface VoiceCtx {
  isPlaying: boolean;
  isPaused: boolean;
  currentMessageId: string | null;
  currentText: string | null;
  queue: VoiceQueueItem[];
  provider: VoiceProvider;
  autoReadEnabled: boolean;
  play: (text: string, messageId?: string) => void;
  enqueue: (text: string, messageId?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  toggleAutoRead: () => void;
}

const STORAGE_KEY = 'chatr.voice.prefs';
const VoiceContext = createContext<VoiceCtx | null>(null);

function loadPrefs(): VoicePersisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { auto_read: false, provider: 'elevenlabs', ...JSON.parse(raw) };
  } catch {}
  return { auto_read: false, provider: 'elevenlabs' };
}

function savePrefs(p: VoicePersisted) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {}
}

export function VoicePlayerProvider({ children }: { children: React.ReactNode }) {
  const initial = loadPrefs();
  const [autoReadEnabled, setAutoReadEnabled] = useState(initial.auto_read);
  const [provider, setProvider] = useState<VoiceProvider>(initial.provider);
  const [queue, setQueue] = useState<VoiceQueueItem[]>([]);
  const [current, setCurrent] = useState<VoiceQueueItem | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const playedIds = useRef<Set<string>>(new Set());

  const playNext = useCallback((items: VoiceQueueItem[]) => {
    const [head, ...rest] = items;
    if (!head) { setCurrent(null); setIsPlaying(false); return; }
    setCurrent(head);
    setQueue(rest);
    setIsPlaying(true);
    setIsPaused(false);
    voiceEngine.speak(head.text).then(() => {
      setProvider(voiceEngine.getProvider());
    }).catch(() => {});
  }, []);

  // Wire engine events
  useEffect(() => {
    voiceEngine.onEnd = () => {
      setIsPlaying(false);
      setQueue((q) => {
        if (q.length === 0) { setCurrent(null); return q; }
        // play next from queue
        queueMicrotask(() => playNext(q));
        return q;
      });
    };
    voiceEngine.onError = () => { setIsPlaying(false); setCurrent(null); };
    return () => { voiceEngine.onEnd = null; voiceEngine.onError = null; };
  }, [playNext]);

  // Persist prefs
  useEffect(() => { savePrefs({ auto_read: autoReadEnabled, provider }); }, [autoReadEnabled, provider]);

  const play = useCallback((text: string, messageId?: string) => {
    const clean = (text || '').trim();
    if (!clean) return;
    const id = messageId || `manual_${Date.now()}`;
    if (playedIds.current.has(id)) return; // dedupe
    playedIds.current.add(id);
    playNext([{ id, text: clean }]);
  }, [playNext]);

  const enqueue = useCallback((text: string, messageId?: string) => {
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
  const toggleAutoRead = useCallback(() => setAutoReadEnabled((v) => !v), []);

  const value = useMemo<VoiceCtx>(() => ({
    isPlaying,
    isPaused,
    currentMessageId: current?.id ?? null,
    currentText: current?.text ?? null,
    queue,
    provider,
    autoReadEnabled,
    play, enqueue, pause, resume, stop, toggleAutoRead,
  }), [isPlaying, isPaused, current, queue, provider, autoReadEnabled, play, enqueue, pause, resume, stop, toggleAutoRead]);

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoiceContext() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error('useVoiceContext must be used within VoicePlayerProvider');
  return ctx;
}
