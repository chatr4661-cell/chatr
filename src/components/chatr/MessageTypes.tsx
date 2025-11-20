import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function MessageMediaShimmer() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-64 w-full rounded-lg" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}

interface MessageImageProps {
  src: string;
  alt?: string;
}

export function MessageImage({ src, alt = 'Image' }: MessageImageProps) {
  const [loading, setLoading] = React.useState(true);

  return (
    <div className="relative max-w-sm">
      {loading && <MessageMediaShimmer />}
      <img
        src={src}
        alt={alt}
        className={`rounded-lg max-w-full ${loading ? 'hidden' : 'block'}`}
        onLoad={() => setLoading(false)}
      />
    </div>
  );
}

interface MessageFileProps {
  fileName: string;
  fileSize?: number;
  onDownload?: () => void;
}

export function MessageFile({ fileName, fileSize, onDownload }: MessageFileProps) {
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <button
      onClick={onDownload}
      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border hover:bg-muted transition-colors max-w-sm"
    >
      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
        <span className="text-primary text-xs font-bold">
          {fileName.split('.').pop()?.toUpperCase()}
        </span>
      </div>
      <div className="flex-1 text-left">
        <div className="text-sm font-medium truncate">{fileName}</div>
        {fileSize && (
          <div className="text-xs text-muted-foreground">{formatBytes(fileSize)}</div>
        )}
      </div>
    </button>
  );
}

export function MessageVoiceNote({ duration = 0 }: { duration?: number }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg max-w-xs">
      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
        <span className="text-primary">🎤</span>
      </div>
      <div className="flex-1">
        <div className="h-8 bg-muted rounded-full" />
      </div>
      <div className="text-xs text-muted-foreground">
        {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
      </div>
    </div>
  );
}

export function MessageVideoPlaceholder() {
  return (
    <div className="relative w-full max-w-sm h-64 bg-muted/50 rounded-lg flex items-center justify-center border border-border">
      <div className="text-center">
        <div className="text-4xl mb-2">🎥</div>
        <div className="text-sm text-muted-foreground">Video Message</div>
      </div>
    </div>
  );
}
