import { useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';

interface MediaMetadata {
  title: string;
  artist?: string;
  album?: string;
  artwork?: string;
}

/**
 * Background audio service with media session controls
 * Allows audio playback to continue in background with lock screen controls
 */
export const useBackgroundAudio = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize background audio session
  const initializeSession = useCallback(async (metadata: MediaMetadata) => {
    if (!Capacitor.isNativePlatform()) {
      // Web: Use Media Session API
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: metadata.title,
          artist: metadata.artist || 'Chatr',
          album: metadata.album,
          artwork: metadata.artwork ? [
            { src: metadata.artwork, sizes: '512x512', type: 'image/png' }
          ] : undefined,
        });

        // Set up media session action handlers
        navigator.mediaSession.setActionHandler('play', () => {
          audioRef.current?.play();
        });

        navigator.mediaSession.setActionHandler('pause', () => {
          audioRef.current?.pause();
        });

        navigator.mediaSession.setActionHandler('seekbackward', () => {
          if (audioRef.current) {
            audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10);
          }
        });

        navigator.mediaSession.setActionHandler('seekforward', () => {
          if (audioRef.current) {
            audioRef.current.currentTime = Math.min(
              audioRef.current.duration,
              audioRef.current.currentTime + 10
            );
          }
        });
      }
    } else {
      // Native: Use Capacitor media session
      const MediaSession = (window as any).MediaSession;
      if (MediaSession?.setMetadata) {
        await MediaSession.setMetadata(metadata);
      }
    }
  }, []);

  // Play audio in background
  const play = useCallback(async (url: string, metadata: MediaMetadata) => {
    try {
      // Create or reuse audio element
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      audioRef.current.src = url;
      await initializeSession(metadata);
      await audioRef.current.play();

      console.log('🎵 Playing in background:', metadata.title);
    } catch (error) {
      console.error('Background audio playback failed:', error);
    }
  }, [initializeSession]);

  // Pause audio
  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  // Stop and cleanup
  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, []);

  return {
    play,
    pause,
    stop,
    audioElement: audioRef.current,
  };
};
