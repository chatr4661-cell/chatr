import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProfileMusic {
  trackName: string;
  artistName?: string;
  previewUrl?: string;
  spotifyUri?: string;
  albumArtUrl?: string;
}

export const useProfileMusic = () => {
  const [music, setMusic] = useState<ProfileMusic | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const fetchProfileMusic = useCallback(async (userId: string): Promise<ProfileMusic | null> => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profile_music')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) return null;

      const profileMusic: ProfileMusic = {
        trackName: data.track_name,
        artistName: data.artist_name || undefined,
        previewUrl: data.preview_url || undefined,
        spotifyUri: data.spotify_uri || undefined,
        albumArtUrl: data.album_art_url || undefined
      };

      setMusic(profileMusic);
      return profileMusic;
    } catch (error) {
      console.error('Failed to fetch profile music:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const setProfileMusic = useCallback(async (
    trackData: ProfileMusic
  ): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profile_music')
        .upsert({
          user_id: user.id,
          track_name: trackData.trackName,
          artist_name: trackData.artistName,
          preview_url: trackData.previewUrl,
          spotify_uri: trackData.spotifyUri,
          album_art_url: trackData.albumArtUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

      if (error) throw error;

      setMusic(trackData);
      toast.success('Profile anthem updated');
      return true;
    } catch (error) {
      console.error('Failed to set profile music:', error);
      toast.error('Failed to update anthem');
      return false;
    }
  }, []);

  const removeProfileMusic = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profile_music')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setMusic(null);
      toast.success('Profile anthem removed');
      return true;
    } catch {
      toast.error('Failed to remove anthem');
      return false;
    }
  }, []);

  const playPreview = useCallback(() => {
    if (!music?.previewUrl) return;

    if (audioRef) {
      audioRef.pause();
      audioRef.currentTime = 0;
    }

    const audio = new Audio(music.previewUrl);
    audio.volume = 0.5;
    audio.play();
    setAudioRef(audio);
    setIsPlaying(true);

    audio.onended = () => {
      setIsPlaying(false);
    };
  }, [music, audioRef]);

  const stopPreview = useCallback(() => {
    if (audioRef) {
      audioRef.pause();
      audioRef.currentTime = 0;
      setIsPlaying(false);
    }
  }, [audioRef]);

  return {
    music,
    loading,
    isPlaying,
    fetchProfileMusic,
    setProfileMusic,
    removeProfileMusic,
    playPreview,
    stopPreview
  };
};
