import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Source {
  title?: string;
  url?: string;
  domain?: string;
  favicon?: string;
}

interface ImageSource {
  url: string;
  fullUrl?: string;
  source: string;
  title?: string;
  thumbnail?: string;
}

interface AISummaryContentProps {
  content: string;
  sources?: Source[];
  images?: ImageSource[];
  className?: string;
}

// Parse Perplexity-style AI content with sections and formatting
const parseAIContent = (text: string): React.ReactNode[] => {
  if (!text) return [];
  
  const elements: React.ReactNode[] = [];
  
  // Split by section headers (## Header)
  const sectionRegex = /^##\s*(.+)$/gm;
  const parts = text.split(sectionRegex);
  
  let keyIdx = 0;
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    if (!part) continue;
    
    // Check if this is a header (odd index after split)
    const isAfterHeader = i > 0 && i % 2 === 1;
    
    if (isAfterHeader && parts[i - 1] === '') {
      // This is a section header
      elements.push(
        <h3 key={`h-${keyIdx++}`} className="font-semibold text-foreground text-base mt-5 mb-2">
          {part}
        </h3>
      );
      continue;
    }
    
    // Check for section header pattern
    if (/^[A-Z][a-zA-Z\s]+$/.test(part) && part.length < 50) {
      elements.push(
        <h3 key={`h-${keyIdx++}`} className="font-semibold text-foreground text-base mt-5 mb-2">
          {part}
        </h3>
      );
      continue;
    }
    
    // Split content by paragraphs
    const paragraphs = part.split(/\n\n+/);
    
    paragraphs.forEach((para) => {
      const trimmed = para.trim();
      if (!trimmed) return;
      
      // Check if it's a section header on its own line
      if (/^##\s*/.test(trimmed)) {
        const headerText = trimmed.replace(/^##\s*/, '');
        elements.push(
          <h3 key={`h-${keyIdx++}`} className="font-semibold text-foreground text-base mt-5 mb-2">
            {headerText}
          </h3>
        );
        return;
      }
      
      // Regular paragraph with inline formatting
      elements.push(
        <p key={`p-${keyIdx++}`} className="text-foreground leading-[1.7] mb-4">
          {renderInlineFormatting(trimmed)}
        </p>
      );
    });
  }
  
  return elements;
};

// Render inline formatting (bold, italics, links)
const renderInlineFormatting = (text: string): React.ReactNode => {
  if (!text) return null;
  
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let idx = 0;
  
  // Process bold text: **text**
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;
  
  const processedText = text.replace(boldRegex, (_, content) => `<b>${content}</b>`);
  
  // Now split by bold markers and render
  const segments = processedText.split(/(<b>.*?<\/b>)/g);
  
  return segments.map((segment, i) => {
    if (segment.startsWith('<b>') && segment.endsWith('</b>')) {
      const content = segment.slice(3, -4);
      return <strong key={i} className="font-semibold">{content}</strong>;
    }
    // Clean remaining markdown
    const cleaned = segment
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[(\d+)\]/g, '');
    return cleaned;
  });
};

export const AISummaryContent: React.FC<AISummaryContentProps> = ({
  content,
  sources = [],
  images = [],
  className
}) => {
  const parsedContent = parseAIContent(content);
  
  return (
    <div className={cn("space-y-1", className)}>
      {/* Images gallery - Perplexity style horizontal scroll */}
      {images && images.length > 0 && (
        <div className="mb-4">
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
            {images.slice(0, 6).map((img, idx) => (
              <a 
                key={idx}
                href={img.fullUrl || img.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex-shrink-0 rounded-lg overflow-hidden bg-muted hover:opacity-90 transition-opacity cursor-pointer"
                style={{ width: '120px', height: '90px' }}
              >
                <img 
                  src={img.thumbnail || img.url} 
                  alt={img.title || ''}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                {img.source && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">
                    {img.source}
                  </div>
                )}
              </a>
            ))}
          </div>
        </div>
      )}
      
      {/* Main content - Perplexity-style flowing prose */}
      <div className="text-[15px] text-foreground">
        {parsedContent}
      </div>
      
      {/* Inline source citations - compact like Perplexity */}
      {sources.length > 0 && (
        <div className="pt-3 mt-4 border-t border-border/20">
          <div className="flex flex-wrap items-center gap-2">
            {sources.slice(0, 5).map((source, idx) => {
              if (!source.url) return null;
              
              let domain = source.domain || 'source';
              try {
                if (!source.domain && source.url) {
                  domain = new URL(source.url).hostname.replace('www.', '');
                }
              } catch {}
              
              // Get short domain name for display
              const shortDomain = domain.split('.')[0];
              
              return (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-muted/50 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>{shortDomain}</span>
                  {sources.length > 1 && idx < sources.length - 1 && (
                    <span className="text-muted-foreground/50">+{sources.length - idx - 1}</span>
                  )}
                </a>
              );
            }).filter(Boolean).slice(0, 3)}
          </div>
        </div>
      )}
    </div>
  );
};

export default AISummaryContent;
