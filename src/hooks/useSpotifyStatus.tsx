import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  duration: number;
  progress: number;
  isPlaying: boolean;
  previewUrl?: string;
}

interface SpotifyStatus {
  isConnected: boolean;
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  showOnProfile: boolean;
}

export const useSpotifyStatus = (userId?: string) => {
  const [status, setStatus] = useState<SpotifyStatus>({
    isConnected: false,
    currentTrack: null,
    isPlaying: false,
    showOnProfile: true,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setCurrentUserId(data.user.id);
      }
    };
    getUser();
  }, []);

  // Load user's Spotify status preference
  useEffect(() => {
    const targetUserId = userId || currentUserId;
    if (!targetUserId) return;

    const loadStatus = async () => {
      const { data } = await supabase
        .from('profile_music')
        .select('*')
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (data) {
        setStatus(prev => ({
          ...prev,
          isConnected: !!data.spotify_uri,
          currentTrack: data.track_name ? {
            id: data.id || '',
            name: data.track_name || '',
            artist: data.artist_name || '',
            album: '',
            albumArt: data.album_art_url || '',
            duration: 0,
            progress: 0,
            isPlaying: true,
            previewUrl: data.preview_url || undefined,
          } : null,
        }));
      }
    };

    loadStatus();
  }, [userId, currentUserId]);

  // Manual track setting
  const setManualTrack = useCallback(async (track: Omit<SpotifyTrack, 'progress' | 'isPlaying'>) => {
    if (!currentUserId) return;

    const fullTrack: SpotifyTrack = {
      ...track,
      progress: 0,
      isPlaying: true,
    };

    setStatus(prev => ({
      ...prev,
      currentTrack: fullTrack,
      isPlaying: true,
    }));

    await supabase
      .from('profile_music')
      .upsert({
        user_id: currentUserId,
        track_name: track.name,
        artist_name: track.artist,
        album_art_url: track.albumArt,
        preview_url: track.previewUrl || null,
        spotify_uri: track.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  }, [currentUserId]);

  const clearTrack = useCallback(async () => {
    if (!currentUserId) return;

    setStatus(prev => ({
      ...prev,
      currentTrack: null,
      isPlaying: false,
    }));

    await supabase
      .from('profile_music')
      .delete()
      .eq('user_id', currentUserId);
  }, [currentUserId]);

  // Get another user's music status
  const getUserMusicStatus = useCallback(async (targetUserId: string): Promise<SpotifyTrack | null> => {
    const { data } = await supabase
      .from('profile_music')
      .select('*')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (data?.track_name) {
      return {
        id: data.id || '',
        name: data.track_name || '',
        artist: data.artist_name || '',
        album: '',
        albumArt: data.album_art_url || '',
        duration: 0,
        progress: 0,
        isPlaying: true,
        previewUrl: data.preview_url || undefined,
      };
    }

    return null;
  }, []);

  // Popular tracks for manual selection
  const popularTracks = [
    { id: '1', name: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', albumArt: 'https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36', duration: 200 },
    { id: '2', name: 'Shape of You', artist: 'Ed Sheeran', album: '÷ (Divide)', albumArt: 'https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96', duration: 234 },
    { id: '3', name: 'Starboy', artist: 'The Weeknd', album: 'Starboy', albumArt: 'https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452', duration: 230 },
    { id: '4', name: 'Levitating', artist: 'Dua Lipa', album: 'Future Nostalgia', albumArt: 'https://i.scdn.co/image/ab67616d0000b273bd26ede1ae69327010d49946', duration: 203 },
    { id: '5', name: 'Peaches', artist: 'Justin Bieber', album: 'Justice', albumArt: 'https://i.scdn.co/image/ab67616d0000b2735ce7b44a3f98c6f7e8393c92', duration: 198 },
  ];

  return {
    status,
    isLoading,
    setManualTrack,
    clearTrack,
    getUserMusicStatus,
    popularTracks,
  };
};
