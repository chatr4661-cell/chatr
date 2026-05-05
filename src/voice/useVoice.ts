import { useVoiceContext } from './VoicePlayerContext';

export function useVoice() {
  const c = useVoiceContext();
  return {
    speak: c.play,
    enqueue: c.enqueue,
    toggleAutoRead: c.toggleAutoRead,
    isAutoReadEnabled: c.autoReadEnabled,
    isPlaying: c.isPlaying,
    currentMessageId: c.currentMessageId,
    provider: c.provider,
  };
}
