/**
 * Media Compression Service
 * Reduces file sizes before upload to save bandwidth and storage
 */

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maxSizeMB?: number;
}

const DEFAULT_IMAGE_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  maxSizeMB: 1
};

const DEFAULT_VIDEO_OPTIONS = {
  maxSizeMB: 10
};

/**
 * Compress image file
 */
export const compressImage = async (
  file: File,
  options: CompressionOptions = DEFAULT_IMAGE_OPTIONS
): Promise<File> => {
  const { maxWidth = 1920, maxHeight = 1920, quality = 0.8 } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Compression failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

/**
 * Generate thumbnail for preview
 */
export const generateThumbnail = async (
  file: File,
  maxSize: number = 200
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };

      img.onerror = () => reject(new Error('Failed to load image'));
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

/**
 * Calculate file hash for deduplication
 */
export const calculateFileHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

/**
 * Get file size category for compression strategy
 */
export const getCompressionStrategy = (file: File): CompressionOptions => {
  const sizeMB = file.size / (1024 * 1024);

  if (sizeMB < 0.5) {
    // Small files - minimal compression
    return { quality: 0.9, maxWidth: 2048, maxHeight: 2048 };
  } else if (sizeMB < 2) {
    // Medium files - standard compression
    return DEFAULT_IMAGE_OPTIONS;
  } else {
    // Large files - aggressive compression
    return { quality: 0.7, maxWidth: 1920, maxHeight: 1920 };
  }
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};
