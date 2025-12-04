import React from 'react';
import { ExternalLink, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LinkPreviewCardProps {
  url: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  faviconUrl?: string;
  siteName?: string;
  className?: string;
}

export const LinkPreviewCard = ({
  url,
  title,
  description,
  imageUrl,
  faviconUrl,
  siteName,
  className
}: LinkPreviewCardProps) => {
  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      onClick={handleClick}
      className={cn(
        "border border-border rounded-lg overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors max-w-[280px]",
        className
      )}
    >
      {imageUrl && (
        <div className="relative w-full h-32 bg-muted">
          <img 
            src={imageUrl} 
            alt={title || 'Link preview'} 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      )}
      
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1">
          {faviconUrl ? (
            <img src={faviconUrl} alt="" className="w-4 h-4" />
          ) : (
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          )}
          <span className="text-xs text-muted-foreground truncate">
            {siteName || new URL(url).hostname}
          </span>
        </div>
        
        {title && (
          <h4 className="font-medium text-sm line-clamp-2 mb-1">{title}</h4>
        )}
        
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
        )}
      </div>
    </div>
  );
};
