import { memo, useMemo, useState, type ImgHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * SmartImage — drop-in <img> replacement that adds:
 *   • Native lazy loading + async decoding
 *   • Responsive `srcSet` + `sizes` (auto-generated for known CDNs)
 *   • Automatic compression hints for Supabase Storage URLs
 *     (?width=..&quality=..&format=webp via the `render/image` transformer)
 *   • Smooth fade-in on load
 *   • Skeleton placeholder while loading
 *   • Graceful fallback on error
 *
 * Use this everywhere you currently render <img>. It's safe by default:
 * unknown URLs are passed through unchanged.
 */

export interface SmartImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'srcSet' | 'sizes'> {
  src?: string;
  alt: string;
  /** Render width hint in CSS pixels, used to pick a srcSet candidate. */
  width?: number;
  /** Render height hint in CSS pixels. */
  height?: number;
  /** Sizes attribute for responsive images. Default "100vw". */
  sizes?: string;
  /** Image quality 1-100 (default 75). */
  quality?: number;
  /** Force eager loading (above-the-fold hero images). */
  priority?: boolean;
  /** Show skeleton placeholder. Default true. */
  showPlaceholder?: boolean;
  /** Fallback content when src fails or is missing. */
  fallback?: React.ReactNode;
}

const RESPONSIVE_WIDTHS = [320, 480, 640, 768, 1024, 1280, 1600];

const isSupabaseStorage = (url: string): boolean =>
  /\/storage\/v1\/object\/(public|sign)\//.test(url);

/**
 * Convert a Supabase storage URL to its image transformer endpoint:
 *   /storage/v1/object/public/...  ->  /storage/v1/render/image/public/...
 * Then append width/quality/format params.
 */
const supabaseTransform = (
  url: string,
  width: number,
  quality: number
): string => {
  try {
    const transformed = url.replace(
      /\/storage\/v1\/object\/(public|sign)\//,
      '/storage/v1/render/image/$1/'
    );
    const u = new URL(transformed);
    u.searchParams.set('width', String(width));
    u.searchParams.set('quality', String(quality));
    u.searchParams.set('resize', 'contain');
    return u.toString();
  } catch {
    return url;
  }
};

const buildSrcSet = (src: string, quality: number): string | undefined => {
  if (!isSupabaseStorage(src)) return undefined;
  return RESPONSIVE_WIDTHS.map(
    (w) => `${supabaseTransform(src, w, quality)} ${w}w`
  ).join(', ');
};

export const SmartImage = memo(function SmartImage({
  src,
  alt,
  width,
  height,
  sizes = '100vw',
  quality = 75,
  priority = false,
  showPlaceholder = true,
  fallback,
  className,
  style,
  onLoad,
  onError,
  ...rest
}: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const { finalSrc, srcSet } = useMemo(() => {
    if (!src) return { finalSrc: undefined, srcSet: undefined };
    if (isSupabaseStorage(src)) {
      const targetWidth = width ?? 1024;
      return {
        finalSrc: supabaseTransform(src, targetWidth, quality),
        srcSet: buildSrcSet(src, quality),
      };
    }
    return { finalSrc: src, srcSet: undefined };
  }, [src, width, quality]);

  if (!src || errored) {
    return (
      <>
        {fallback ?? (
          <div
            className={cn(
              'flex items-center justify-center bg-muted text-muted-foreground',
              className
            )}
            style={style}
            aria-label={alt}
            role="img"
          >
            <svg
              className="h-1/3 w-1/3 opacity-40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          </div>
        )}
      </>
    );
  }

  return (
    <span className={cn('relative inline-block overflow-hidden', className)} style={style}>
      {showPlaceholder && !loaded && (
        <span
          className="absolute inset-0 animate-pulse bg-muted"
          aria-hidden="true"
        />
      )}
      <img
        {...rest}
        src={finalSrc}
        srcSet={srcSet}
        sizes={srcSet ? sizes : undefined}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        // @ts-expect-error - fetchpriority is a valid HTML attribute, types lag
        fetchpriority={priority ? 'high' : 'auto'}
        className={cn(
          'h-full w-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          setErrored(true);
          onError?.(e);
        }}
      />
    </span>
  );
});
