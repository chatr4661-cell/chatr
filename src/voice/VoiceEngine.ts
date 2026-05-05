// Hybrid TTS engine: ElevenLabs (via secure edge proxy) → browser SpeechSynthesis fallback.
import { supabase } from '@/integrations/supabase/client';
import type { VoiceProvider } from './types';

const FALLBACK_LATENCY_MS = 1500; // first byte budget before falling back

export class VoiceEngine {
  private audio: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;
  private utter: SpeechSynthesisUtterance | null = null;
  private lastProvider: VoiceProvider = 'elevenlabs';
  private elevenlabsAvailable = true;

  onEnd: (() => void) | null = null;
  onError: ((e: unknown) => void) | null = null;

  getProvider(): VoiceProvider {
    return this.lastProvider;
  }

  async speak(text: string): Promise<void> {
    const clean = (text || '').trim();
    if (!clean) return this.onEnd?.();

    this.stop();

    if (this.elevenlabsAvailable) {
      try {
        await this.speakElevenLabs(clean);
        this.lastProvider = 'elevenlabs';
        return;
      } catch (err) {
        console.warn('[VoiceEngine] ElevenLabs failed, falling back:', err);
        this.elevenlabsAvailable = false; // disable for this session if proxy errored
      }
    }
    this.speakBrowser(clean);
    this.lastProvider = 'browser';
  }

  private async speakElevenLabs(text: string): Promise<void> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FALLBACK_LATENCY_MS + 8000);

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`;
    const { data: { session } } = await supabase.auth.getSession();

    const resp = await fetch(url, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ text }),
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`tts_http_${resp.status}`);

    const blob = await resp.blob();
    const objectUrl = URL.createObjectURL(blob);
    this.currentUrl = objectUrl;

    const audio = new Audio(objectUrl);
    audio.preload = 'auto';
    this.audio = audio;

    return new Promise<void>((resolve, reject) => {
      audio.onended = () => { this.cleanupAudio(); this.onEnd?.(); resolve(); };
      audio.onerror = (e) => { this.cleanupAudio(); this.onError?.(e); reject(e); };
      audio.play().catch(reject);
    });
  }

  private speakBrowser(text: string): void {
    if (!('speechSynthesis' in window)) { this.onEnd?.(); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.0;
    u.pitch = 1.0;
    u.onend = () => { this.utter = null; this.onEnd?.(); };
    u.onerror = (e) => { this.utter = null; this.onError?.(e); };
    this.utter = u;
    window.speechSynthesis.speak(u);
  }

  pause(): void {
    if (this.audio && !this.audio.paused) this.audio.pause();
    if (this.utter && 'speechSynthesis' in window) window.speechSynthesis.pause();
  }

  resume(): void {
    if (this.audio && this.audio.paused) this.audio.play().catch(() => {});
    if (this.utter && 'speechSynthesis' in window) window.speechSynthesis.resume();
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.src = '';
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    this.cleanupAudio();
    this.utter = null;
  }

  private cleanupAudio() {
    if (this.currentUrl) { URL.revokeObjectURL(this.currentUrl); this.currentUrl = null; }
    this.audio = null;
  }
}

export const voiceEngine = new VoiceEngine();
