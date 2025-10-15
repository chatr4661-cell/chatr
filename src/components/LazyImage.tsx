import { memo, useState, useEffect } from 'react';
import { useNetworkQuality } from '@/hooks/useNetworkQuality';

interface LazyImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallback?: string;
  autoDownload?: boolean;
}

export const LazyImage = memo(({ src, alt, className, fallback, autoDownload = true }: LazyImageProps) => {
  const networkQuality = useNetworkQuality();
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [userWantsDownload, setUserWantsDownload] = useState(false);
  
  // Auto-download control based on network quality
  const shouldAutoDownload = autoDownload && (networkQuality !== 'slow' || userWantsDownload);

  useEffect(() => {
    if (!src || !shouldAutoDownload) {
      setIsLoading(false);
      return;
    }

    // Use Intersection Observer for lazy loading
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
    };

    img.onerror = () => {
      setError(true);
      setIsLoading(false);
    };

    // Start loading
    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, shouldAutoDownload]);
  
  // Show click-to-download on 2G
  if (networkQuality === 'slow' && !userWantsDownload && src && !imageSrc) {
    return (
      <div 
        className={`bg-muted flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors ${className}`}
        onClick={() => setUserWantsDownload(true)}
      >
        <svg className="w-8 h-8 text-muted-foreground mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-xs text-muted-foreground">Tap to load image</span>
        <span className="text-[10px] text-muted-foreground mt-1">Slow network detected</span>
      </div>
    );
  }

  if (error || !src) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        {fallback ? (
          <img src={fallback} alt={alt} className="w-full h-full object-cover" />
        ) : (
          <svg
            className="w-1/2 h-1/2 text-muted-foreground"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className={`bg-muted animate-pulse ${className}`} />
      )}
      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={`${className} ${isLoading ? 'hidden' : 'block'}`}
          loading="lazy"
          decoding="async"
        />
      )}
    </>
  );
});

LazyImage.displayName = 'LazyImage';
