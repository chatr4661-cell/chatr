import { useCallback } from 'react';
import { CapacitorVideoPlayer } from 'capacitor-video-player';
import { toast } from 'sonner';

export interface VideoOptions {
  url: string;
  title?: string;
  subtitle?: string;
  playerId?: string;
  mode?: 'fullscreen' | 'embedded';
  componentTag?: string;
}

/**
 * Native video player hook
 * Provides hardware-accelerated video playback
 */
export const useVideoPlayer = () => {
  /**
   * Play video in fullscreen native player
   */
  const playVideo = useCallback(async (options: VideoOptions) => {
    try {
      await CapacitorVideoPlayer.initPlayer({
        mode: options.mode || 'fullscreen',
        url: options.url,
        playerId: options.playerId || 'chatr-video-player',
        componentTag: options.componentTag || 'div'
      });

      return true;
    } catch (error) {
      console.error('Video playback failed:', error);
      toast.error('Could not play video');
      return false;
    }
  }, []);

  /**
   * Play video from URL
   */
  const playFromUrl = useCallback(async (url: string, title?: string) => {
    return playVideo({
      url,
      title,
      mode: 'fullscreen'
    });
  }, [playVideo]);

  /**
   * Play embedded video
   */
  const playEmbedded = useCallback(async (
    url: string,
    containerId: string,
    options?: Partial<VideoOptions>
  ) => {
    return playVideo({
      url,
      mode: 'embedded',
      componentTag: containerId,
      ...options
    });
  }, [playVideo]);

  /**
   * Stop all players
   */
  const stopAllPlayers = useCallback(async () => {
    try {
      await CapacitorVideoPlayer.stopAllPlayers();
      return true;
    } catch (error) {
      console.error('Stop players failed:', error);
      return false;
    }
  }, []);

  return {
    playVideo,
    playFromUrl,
    playEmbedded,
    stopAllPlayers
  };
};
