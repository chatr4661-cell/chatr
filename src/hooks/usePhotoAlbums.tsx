import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Photo {
  id: string;
  photoUrl: string;
  caption?: string;
  displayOrder: number;
}

interface Album {
  id: string;
  name: string;
  description?: string;
  coverPhotoUrl?: string;
  isPublic: boolean;
  photos: Photo[];
  createdAt: string;
}

export const usePhotoAlbums = () => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAlbums = useCallback(async (userId?: string): Promise<Album[]> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const targetUserId = userId || user?.id;
      if (!targetUserId) return [];

      const { data, error } = await supabase
        .from('photo_albums')
        .select(`
          *,
          photos:album_photos(*)
        `)
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map(a => ({
        id: a.id,
        name: a.name,
        description: a.description || undefined,
        coverPhotoUrl: a.cover_photo_url || undefined,
        isPublic: a.is_public,
        photos: (a.photos || []).map((p: any) => ({
          id: p.id,
          photoUrl: p.photo_url,
          caption: p.caption || undefined,
          displayOrder: p.display_order
        })).sort((x: Photo, y: Photo) => x.displayOrder - y.displayOrder),
        createdAt: a.created_at
      }));

      setAlbums(mapped);
      return mapped;
    } catch (error) {
      console.error('Failed to fetch albums:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const createAlbum = useCallback(async (
    name: string,
    description?: string,
    isPublic: boolean = false
  ): Promise<Album | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('photo_albums')
        .insert({
          user_id: user.id,
          name,
          description,
          is_public: isPublic
        })
        .select()
        .single();

      if (error) throw error;

      const album: Album = {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        isPublic: data.is_public,
        photos: [],
        createdAt: data.created_at
      };

      setAlbums(prev => [album, ...prev]);
      toast.success('Album created');
      return album;
    } catch (error) {
      console.error('Failed to create album:', error);
      toast.error('Failed to create album');
      return null;
    }
  }, []);

  const addPhotosToAlbum = useCallback(async (
    albumId: string,
    photos: { url: string; caption?: string }[]
  ): Promise<boolean> => {
    try {
      const insertData = photos.map((p, i) => ({
        album_id: albumId,
        photo_url: p.url,
        caption: p.caption,
        display_order: i
      }));

      const { error } = await supabase
        .from('album_photos')
        .insert(insertData);

      if (error) throw error;

      // Update cover photo if first photos
      const album = albums.find(a => a.id === albumId);
      if (album && !album.coverPhotoUrl && photos.length > 0) {
        await supabase
          .from('photo_albums')
          .update({ cover_photo_url: photos[0].url })
          .eq('id', albumId);
      }

      await fetchAlbums();
      toast.success('Photos added');
      return true;
    } catch (error) {
      console.error('Failed to add photos:', error);
      toast.error('Failed to add photos');
      return false;
    }
  }, [albums, fetchAlbums]);

  const deleteAlbum = useCallback(async (albumId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('photo_albums')
        .delete()
        .eq('id', albumId);

      if (error) throw error;

      setAlbums(prev => prev.filter(a => a.id !== albumId));
      toast.success('Album deleted');
      return true;
    } catch {
      toast.error('Failed to delete album');
      return false;
    }
  }, []);

  const deletePhoto = useCallback(async (photoId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('album_photos')
        .delete()
        .eq('id', photoId);

      if (error) throw error;

      await fetchAlbums();
      toast.success('Photo deleted');
      return true;
    } catch {
      toast.error('Failed to delete photo');
      return false;
    }
  }, [fetchAlbums]);

  return {
    albums,
    loading,
    fetchAlbums,
    createAlbum,
    addPhotosToAlbum,
    deleteAlbum,
    deletePhoto
  };
};
