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
  stt_lang: string;               // BCP-47 locale, e.g., en-US
}

export const STT_LANGUAGES: { code: string; label: string }[] = [
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'en-IN', label: 'English (India)' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'bn-IN', label: 'Bengali' },
  { code: 'ta-IN', label: 'Tamil' },
  { code: 'te-IN', label: 'Telugu' },
  { code: 'mr-IN', label: 'Marathi' },
  { code: 'gu-IN', label: 'Gujarati' },
  { code: 'kn-IN', label: 'Kannada' },
  { code: 'ml-IN', label: 'Malayalam' },
  { code: 'pa-IN', label: 'Punjabi' },
  { code: 'ur-IN', label: 'Urdu' },
  { code: 'es-ES', label: 'Spanish (Spain)' },
  { code: 'es-MX', label: 'Spanish (Mexico)' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
  { code: 'it-IT', label: 'Italian' },
  { code: 'pt-BR', label: 'Portuguese (Brazil)' },
  { code: 'ru-RU', label: 'Russian' },
  { code: 'ja-JP', label: 'Japanese' },
  { code: 'ko-KR', label: 'Korean' },
  { code: 'zh-CN', label: 'Chinese (Mandarin)' },
  { code: 'ar-SA', label: 'Arabic' },
];

export const DEFAULT_PREFS: VoicePersisted = {
  voice_enabled: true,
  auto_read: false,
  voice_input_enabled: true,
  preferred_voice: null,
  speech_rate: 1,
  speech_pitch: 1,
  mode: 'device',
};
