import { memo, useState, useEffect } from 'react';

interface LazyImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallback?: string;
}

export const LazyImage = memo(({ src, alt, className, fallback }: LazyImageProps) => {
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!src) {
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
  }, [src]);

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
