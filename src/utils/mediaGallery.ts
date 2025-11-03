/**
 * Media Gallery Utilities
 * Save images/videos to device gallery (for web/PWA)
 */

/**
 * Save media to device gallery/downloads
 * Works on mobile browsers and PWA
 */
export const saveMediaToGallery = async (
  url: string,
  filename: string,
  type: 'image' | 'video' | 'document'
): Promise<void> => {
  try {
    // Fetch the media file
    const response = await fetch(url);
    const blob = await response.blob();

    // Determine file extension and MIME type
    let extension = '';
    let mimeType = blob.type;

    if (type === 'image') {
      extension = mimeType.includes('png') ? '.png' : '.jpg';
    } else if (type === 'video') {
      extension = mimeType.includes('mp4') ? '.mp4' : '.webm';
    } else {
      extension = '.bin';
    }

    const finalFilename = filename.includes('.') ? filename : `${filename}${extension}`;

    // Try File System Access API first (PWA on Android/Desktop)
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: finalFilename,
          types: [{
            description: type === 'image' ? 'Images' : type === 'video' ? 'Videos' : 'Files',
            accept: {
              [mimeType]: [extension]
            }
          }]
        });

        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (error) {
        // User cancelled or API not supported, fall through to download method
        console.log('File System API cancelled or not supported');
      }
    }

    // Fallback: Use traditional download method (works on all browsers)
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = finalFilename;
    
    // For iOS Safari, we need to open in new tab
    if (/(iPhone|iPad|iPod)/i.test(navigator.userAgent)) {
      link.target = '_blank';
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up blob URL after a delay
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  } catch (error) {
    console.error('Save to gallery failed:', error);
    throw error;
  }
};

/**
 * Check if auto-save is enabled in user preferences
 */
export const isAutoSaveEnabled = (): boolean => {
  return localStorage.getItem('autoSaveMedia') === 'true';
};

/**
 * Enable/disable auto-save for received media
 */
export const setAutoSaveEnabled = (enabled: boolean): void => {
  localStorage.setItem('autoSaveMedia', enabled ? 'true' : 'false');
};

/**
 * Auto-save received media (if enabled)
 */
export const autoSaveReceivedMedia = async (
  url: string,
  filename: string,
  type: 'image' | 'video'
): Promise<void> => {
  if (!isAutoSaveEnabled()) {
    return;
  }

  try {
    await saveMediaToGallery(url, filename, type);
  } catch (error) {
    console.error('Auto-save failed:', error);
    // Don't throw - auto-save is optional
  }
};
