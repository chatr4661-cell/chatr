export type VoiceProvider = 'device' | 'elevenlabs' | 'browser';
export type VoiceMode = 'device' | 'cloud';

export interface VoiceQueueItem {
  id: string;
  text: string;
}

export interface VoicePersisted {
  voice_enabled: boolean;
  auto_read: boolean;
  voice_input_enabled: boolean;
  preferred_voice: string | null; // SpeechSynthesisVoice.voiceURI
  speech_rate: number;            // 0.75–2
  speech_pitch: number;           // 0–2
  mode: VoiceMode;                // device-first or cloud
}

export const DEFAULT_PREFS: VoicePersisted = {
  voice_enabled: true,
  auto_read: false,
  voice_input_enabled: true,
  preferred_voice: null,
  speech_rate: 1,
  speech_pitch: 1,
  mode: 'device',
};
