import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  faviconUrl?: string;
  siteName?: string;
}

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

export const useLinkPreview = () => {
  const [loading, setLoading] = useState(false);
  const [previews, setPreviews] = useState<Map<string, LinkPreview>>(new Map());

  const extractUrls = useCallback((text: string): string[] => {
    const matches = text.match(URL_REGEX);
    return matches || [];
  }, []);

  const fetchPreview = useCallback(async (url: string): Promise<LinkPreview | null> => {
    // Check cache first
    const cached = previews.get(url);
    if (cached) return cached;

    setLoading(true);
    try {
      // Check database cache
      const { data: dbCache } = await supabase
        .from('link_previews')
        .select('*')
        .eq('url', url)
        .single();

      if (dbCache && new Date(dbCache.expires_at) > new Date()) {
        const preview: LinkPreview = {
          url: dbCache.url,
          title: dbCache.title || undefined,
          description: dbCache.description || undefined,
          imageUrl: dbCache.image_url || undefined,
          faviconUrl: dbCache.favicon_url || undefined,
          siteName: dbCache.site_name || undefined
        };
        setPreviews(prev => new Map(prev).set(url, preview));
        return preview;
      }

      // Fetch from edge function
      const { data, error } = await supabase.functions.invoke('fetch-link-preview', {
        body: { url }
      });

      if (error) throw error;

      const preview: LinkPreview = {
        url,
        title: data?.title,
        description: data?.description,
        imageUrl: data?.image,
        faviconUrl: data?.favicon,
        siteName: data?.siteName
      };

      // Cache in state
      setPreviews(prev => new Map(prev).set(url, preview));

      // Cache in database
      await supabase.from('link_previews').upsert({
        url,
        title: preview.title,
        description: preview.description,
        image_url: preview.imageUrl,
        favicon_url: preview.faviconUrl,
        site_name: preview.siteName
      }, { onConflict: 'url' });

      return preview;
    } catch (error) {
      console.error('Failed to fetch link preview:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [previews]);

  const getPreviewsForText = useCallback(async (text: string): Promise<LinkPreview[]> => {
    const urls = extractUrls(text);
    const results = await Promise.all(urls.map(fetchPreview));
    return results.filter((p): p is LinkPreview => p !== null);
  }, [extractUrls, fetchPreview]);

  return {
    loading,
    extractUrls,
    fetchPreview,
    getPreviewsForText,
    previews
  };
};
