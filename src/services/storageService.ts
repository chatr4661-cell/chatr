/**
 * Storage Service
 * Efficient media uploads with deduplication and CDN delivery
 */

import { supabase } from '@/integrations/supabase/client';
import { calculateFileHash, compressImage, generateThumbnail } from './mediaCompression';

interface UploadResult {
  url: string;
  thumbnailUrl?: string;
  hash: string;
  size: number;
  isDuplicate: boolean;
}

/**
 * Check if file already exists (deduplication)
 */
const checkExistingFile = async (hash: string, userId: string): Promise<string | null> => {
  const { data, error } = await supabase
    .from('media_files')
    .select('url')
    .eq('hash', hash)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error checking existing file:', error);
    return null;
  }

  return data?.url || null;
};

/**
 * Save media metadata to database
 */
const saveMediaMetadata = async (
  userId: string,
  hash: string,
  url: string,
  size: number,
  type: string
) => {
  const { error } = await supabase
    .from('media_files')
    .upsert({
      user_id: userId,
      hash,
      url,
      size,
      type,
      created_at: new Date().toISOString()
    }, {
      onConflict: 'hash,user_id'
    });

  if (error) {
    console.error('Error saving media metadata:', error);
  }
};

/**
 * Upload media file with compression and deduplication
 */
export const uploadMedia = async (
  file: File,
  userId: string,
  conversationId: string,
  compress: boolean = true
): Promise<UploadResult> => {
  try {
    // Calculate hash for deduplication
    const hash = await calculateFileHash(file);

    // Check if file already exists
    const existingUrl = await checkExistingFile(hash, userId);
    if (existingUrl) {
      console.log('File already exists, reusing:', existingUrl);
      return {
        url: existingUrl,
        hash,
        size: file.size,
        isDuplicate: true
      };
    }

    // Compress if image and compression enabled
    let uploadFile = file;
    let thumbnail: string | undefined;

    if (file.type.startsWith('image/') && compress) {
      uploadFile = await compressImage(file);
      thumbnail = await generateThumbnail(uploadFile);
    }

    // Upload to Supabase Storage
    const fileName = `${conversationId}/${hash}-${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('chat-media')
      .upload(fileName, uploadFile, {
        cacheControl: '31536000', // Cache for 1 year
        upsert: false
      });

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('chat-media')
      .getPublicUrl(data.path);

    // Save metadata for deduplication
    await saveMediaMetadata(userId, hash, publicUrl, uploadFile.size, file.type);

    // Upload thumbnail if exists
    let thumbnailUrl: string | undefined;
    if (thumbnail) {
      const thumbnailBlob = await fetch(thumbnail).then(r => r.blob());
      const thumbFileName = `${conversationId}/thumb-${hash}-${Date.now()}.jpg`;
      const { data: thumbData } = await supabase.storage
        .from('chat-media')
        .upload(thumbFileName, thumbnailBlob);

      if (thumbData) {
        const { data: { publicUrl: thumbUrl } } = supabase.storage
          .from('chat-media')
          .getPublicUrl(thumbData.path);
        thumbnailUrl = thumbUrl;
      }
    }

    return {
      url: publicUrl,
      thumbnailUrl,
      hash,
      size: uploadFile.size,
      isDuplicate: false
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

/**
 * Get signed URL for private media
 */
export const getSignedUrl = async (path: string): Promise<string> => {
  // Check cache first (5 min expiry)
  const cacheKey = `signed_url_${path}`;
  const cached = localStorage.getItem(cacheKey);
  
  if (cached) {
    const { url, expiry } = JSON.parse(cached);
    if (Date.now() < expiry) {
      return url;
    }
  }

  // Generate new signed URL
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke('generate-media-url', {
    body: { path }
  });

  if (error) throw error;

  // Cache for 4 minutes (before 5 min expiry)
  const expiry = Date.now() + (4 * 60 * 1000);
  localStorage.setItem(cacheKey, JSON.stringify({ 
    url: data.signedUrl, 
    expiry 
  }));

  return data.signedUrl;
};

/**
 * Download and cache media
 */
export const downloadMedia = async (url: string): Promise<Blob> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Download failed');
  return response.blob();
};

/**
 * Delete media file
 */
export const deleteMedia = async (url: string): Promise<void> => {
  try {
    const path = url.split('/').slice(-2).join('/');
    const { error } = await supabase.storage
      .from('chat-media')
      .remove([path]);

    if (error) throw error;
  } catch (error) {
    console.error('Delete error:', error);
    throw error;
  }
};
