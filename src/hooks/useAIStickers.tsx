import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AISticker {
  id: string;
  sourcePhotoUrl: string;
  stickerUrl: string;
  style: string;
  createdAt: string;
}

type StickerStyle = 'cartoon' | 'emoji' | 'anime' | 'chibi' | 'pixel' | 'sketch';

export const useAIStickers = () => {
  const [stickers, setStickers] = useState<AISticker[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchStickers = useCallback(async (): Promise<AISticker[]> => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('ai_stickers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map(s => ({
        id: s.id,
        sourcePhotoUrl: s.source_photo_url,
        stickerUrl: s.sticker_url,
        style: s.style || 'cartoon',
        createdAt: s.created_at
      }));

      setStickers(mapped);
      return mapped;
    } catch (error) {
      console.error('Failed to fetch stickers:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const generateSticker = useCallback(async (
    photoUrl: string,
    style: StickerStyle = 'cartoon'
  ): Promise<AISticker | null> => {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      toast.loading('Generating sticker...');

      const { data, error } = await supabase.functions.invoke('generate-sticker', {
        body: { photoUrl, style }
      });

      if (error) throw error;

      const stickerUrl = data?.stickerUrl;
      if (!stickerUrl) throw new Error('No sticker generated');

      // Save to database
      const { data: saved, error: saveError } = await supabase
        .from('ai_stickers')
        .insert({
          user_id: user.id,
          source_photo_url: photoUrl,
          sticker_url: stickerUrl,
          style
        })
        .select()
        .single();

      if (saveError) throw saveError;

      const sticker: AISticker = {
        id: saved.id,
        sourcePhotoUrl: saved.source_photo_url,
        stickerUrl: saved.sticker_url,
        style: saved.style || 'cartoon',
        createdAt: saved.created_at
      };

      setStickers(prev => [sticker, ...prev]);
      toast.dismiss();
      toast.success('Sticker generated!');
      return sticker;
    } catch (error) {
      console.error('Failed to generate sticker:', error);
      toast.dismiss();
      toast.error('Failed to generate sticker');
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const deleteSticker = useCallback(async (stickerId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('ai_stickers')
        .delete()
        .eq('id', stickerId);

      if (error) throw error;

      setStickers(prev => prev.filter(s => s.id !== stickerId));
      toast.success('Sticker deleted');
      return true;
    } catch {
      toast.error('Failed to delete sticker');
      return false;
    }
  }, []);

  return {
    stickers,
    loading,
    generating,
    fetchStickers,
    generateSticker,
    deleteSticker
  };
};
