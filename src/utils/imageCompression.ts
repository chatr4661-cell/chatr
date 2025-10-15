/**
 * Image compression utility for 2G optimization
 * Compresses images before upload to reduce data usage
 */

export interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker?: boolean;
  quality?: number;
}

/**
 * Compress an image file
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {
    maxSizeMB: 0.2, // 200KB for chat thumbnails
    maxWidthOrHeight: 1024,
    quality: 0.8
  }
): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        // Calculate new dimensions
        if (width > height) {
          if (width > options.maxWidthOrHeight) {
            height = (height * options.maxWidthOrHeight) / width;
            width = options.maxWidthOrHeight;
          }
        } else {
          if (height > options.maxWidthOrHeight) {
            width = (width * options.maxWidthOrHeight) / height;
            height = options.maxWidthOrHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Try different quality levels to meet size requirement
        let quality = options.quality || 0.8;
        const tryCompress = (q: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Compression failed'));
                return;
              }
              
              const sizeMB = blob.size / 1024 / 1024;
              
              // If still too large and quality can be reduced, try again
              if (sizeMB > options.maxSizeMB && q > 0.3) {
                tryCompress(q - 0.1);
                return;
              }
              
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              
              resolve(compressedFile);
            },
            'image/jpeg',
            q
          );
        };
        
        tryCompress(quality);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Generate thumbnail for preview
 */
export async function generateThumbnail(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 200; // Small thumbnail
        
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Check if image needs compression based on network quality
 */
export function shouldCompressImage(
  fileSize: number,
  networkQuality: 'fast' | 'slow' | 'offline'
): boolean {
  const sizeMB = fileSize / 1024 / 1024;
  
  // Always compress on slow networks if > 200KB
  if (networkQuality === 'slow' && sizeMB > 0.2) {
    return true;
  }
  
  // On fast networks, compress if > 2MB
  if (networkQuality === 'fast' && sizeMB > 2) {
    return true;
  }
  
  return false;
}
