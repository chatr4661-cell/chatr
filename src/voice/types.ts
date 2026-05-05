export type VoiceProvider = 'elevenlabs' | 'browser';

export interface VoiceQueueItem {
  id: string;
  text: string;
}

export interface VoicePersisted {
  auto_read: boolean;
  provider: VoiceProvider;
}
