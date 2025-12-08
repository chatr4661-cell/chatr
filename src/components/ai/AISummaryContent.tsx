import React from 'react';
import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Source {
  title?: string;
  url?: string;
  favicon?: string;
}

interface AISummaryContentProps {
  content: string;
  sources?: Source[];
  className?: string;
}

// Parse and clean AI-generated content for beautiful rendering
const parseAIContent = (text: string): React.ReactNode[] => {
  if (!text) return [];
  
  const elements: React.ReactNode[] = [];
  
  // Split by double newlines to get paragraphs
  const sections = text.split(/\n\n+/);
  
  sections.forEach((section, sectionIdx) => {
    const trimmed = section.trim();
    if (!trimmed) return;
    
    // Check if this is a list section (starts with * or - or numbered)
    const lines = trimmed.split('\n');
    const isList = lines.some(line => /^[\*\-•]\s|^\d+\.\s/.test(line.trim()));
    
    if (isList) {
      const listItems: React.ReactNode[] = [];
      let currentParagraph = '';
      
      lines.forEach((line, lineIdx) => {
        const cleanLine = line.trim();
        
        // Check if it's a list item
        const listMatch = cleanLine.match(/^[\*\-•]\s*(.+)|^(\d+)\.\s*(.+)/);
        
        if (listMatch) {
          // Flush any pending paragraph
          if (currentParagraph) {
            elements.push(
              <p key={`p-${sectionIdx}-pre`} className="text-foreground leading-relaxed mb-3">
                {cleanMarkdown(currentParagraph)}
              </p>
            );
            currentParagraph = '';
          }
          
          // Extract the list item content
          const itemContent = listMatch[1] || listMatch[3] || '';
          listItems.push(
            <li key={`li-${sectionIdx}-${lineIdx}`} className="text-foreground leading-relaxed">
              {cleanMarkdown(itemContent)}
            </li>
          );
        } else if (cleanLine) {
          // It's a paragraph line
          currentParagraph += (currentParagraph ? ' ' : '') + cleanLine;
        }
      });
      
      // Flush pending paragraph
      if (currentParagraph) {
        elements.push(
          <p key={`p-${sectionIdx}-post`} className="text-foreground leading-relaxed mb-3">
            {cleanMarkdown(currentParagraph)}
          </p>
        );
      }
      
      // Add the list
      if (listItems.length > 0) {
        elements.push(
          <ul key={`ul-${sectionIdx}`} className="space-y-2 mb-4 ml-1">
            {listItems}
          </ul>
        );
      }
    } else {
      // Check if it looks like a section header
      const isHeader = /^[A-Z][^.!?]*:?$/.test(trimmed) && trimmed.length < 60;
      
      if (isHeader) {
        elements.push(
          <h4 key={`h-${sectionIdx}`} className="font-semibold text-foreground mt-4 mb-2">
            {trimmed.replace(/:$/, '')}
          </h4>
        );
      } else {
        // Regular paragraph - clean up and join lines
        const cleanText = lines.map(l => l.trim()).join(' ');
        elements.push(
          <p key={`p-${sectionIdx}`} className="text-foreground leading-relaxed mb-3">
            {cleanMarkdown(cleanText)}
          </p>
        );
      }
    }
  });
  
  return elements;
};

// Clean markdown artifacts and render inline formatting
const cleanMarkdown = (text: string): React.ReactNode => {
  if (!text) return null;
  
  // Remove ** markers and convert to clean text with emphasis
  // Pattern: **text** or *text*
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;
  
  // Handle bold: **text**
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match;
  
  // First, replace all markdown with clean formatting
  let cleaned = text
    // Remove double asterisks (bold)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    // Remove single asterisks (italic)
    .replace(/\*([^*]+)\*/g, '$1')
    // Remove underscores for emphasis
    .replace(/_([^_]+)_/g, '$1')
    // Remove backticks
    .replace(/`([^`]+)`/g, '$1')
    // Clean up citation markers like [1] [2]
    .replace(/\[(\d+)\]/g, ' ')
    // Remove excess whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  return cleaned;
};

export const AISummaryContent: React.FC<AISummaryContentProps> = ({
  content,
  sources = [],
  className
}) => {
  const parsedContent = parseAIContent(content);
  
  return (
    <div className={cn("space-y-1", className)}>
      {/* Main content */}
      <div className="text-[15px]">
        {parsedContent}
      </div>
      
      {/* Inline source citations */}
      {sources.length > 0 && (
        <div className="pt-4 border-t border-border/30 mt-4">
          <p className="text-xs text-muted-foreground mb-2">Sources:</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {sources.slice(0, 6).map((source, idx) => 
              source.url ? (
                <a
                  key={idx}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <span className="text-primary font-medium">[{idx + 1}]</span>
                  <span className="truncate max-w-[150px]">
                    {source.title?.split(' ').slice(0, 4).join(' ') || 'Source'}
                  </span>
                  <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                </a>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AISummaryContent;
