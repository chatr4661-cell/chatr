/**
 * Message Formatting Hook
 * Supports bold, italic, strikethrough, code, and links
 * WhatsApp/Telegram-style formatting
 */

import { useCallback, useMemo } from 'react';
import React from 'react';

interface FormattedSegment {
  type: 'text' | 'bold' | 'italic' | 'strikethrough' | 'code' | 'link' | 'mention' | 'monospace';
  content: string;
  href?: string;
}

// Formatting patterns (WhatsApp-style)
const FORMATTING_PATTERNS = {
  bold: /\*([^*]+)\*/g,           // *bold*
  italic: /_([^_]+)_/g,           // _italic_
  strikethrough: /~([^~]+)~/g,    // ~strikethrough~
  monospace: /`([^`]+)`/g,        // `monospace`
  code: /```([^`]+)```/g,         // ```code block```
  link: /(https?:\/\/[^\s]+)/g,   // URLs
  mention: /@(\w+)/g,             // @mentions
};

export const useMessageFormatting = () => {
  /**
   * Parse message into formatted segments
   */
  const parseMessage = useCallback((text: string): FormattedSegment[] => {
    if (!text) return [];

    const segments: FormattedSegment[] = [];
    let remaining = text;
    let lastIndex = 0;

    // Combined regex for all patterns
    const combinedPattern = /(\*[^*]+\*)|(_[^_]+_)|(~[^~]+~)|(`[^`]+`)|(```[^`]+```)|(https?:\/\/[^\s]+)|(@\w+)/g;
    
    let match;
    while ((match = combinedPattern.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }

      const matchedText = match[0];

      // Determine type and extract content
      if (matchedText.startsWith('```') && matchedText.endsWith('```')) {
        segments.push({
          type: 'code',
          content: matchedText.slice(3, -3)
        });
      } else if (matchedText.startsWith('`') && matchedText.endsWith('`')) {
        segments.push({
          type: 'monospace',
          content: matchedText.slice(1, -1)
        });
      } else if (matchedText.startsWith('*') && matchedText.endsWith('*')) {
        segments.push({
          type: 'bold',
          content: matchedText.slice(1, -1)
        });
      } else if (matchedText.startsWith('_') && matchedText.endsWith('_')) {
        segments.push({
          type: 'italic',
          content: matchedText.slice(1, -1)
        });
      } else if (matchedText.startsWith('~') && matchedText.endsWith('~')) {
        segments.push({
          type: 'strikethrough',
          content: matchedText.slice(1, -1)
        });
      } else if (matchedText.startsWith('http')) {
        segments.push({
          type: 'link',
          content: matchedText,
          href: matchedText
        });
      } else if (matchedText.startsWith('@')) {
        segments.push({
          type: 'mention',
          content: matchedText
        });
      }

      lastIndex = match.index + matchedText.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    return segments.length > 0 ? segments : [{ type: 'text', content: text }];
  }, []);

  /**
   * Render formatted message as React elements
   */
  const renderFormattedMessage = useCallback((text: string, className?: string) => {
    const segments = parseMessage(text);

    return segments.map((segment, index) => {
      const key = `${segment.type}-${index}`;

      switch (segment.type) {
        case 'bold':
          return React.createElement('strong', { key, className: 'font-bold' }, segment.content);
        
        case 'italic':
          return React.createElement('em', { key, className: 'italic' }, segment.content);
        
        case 'strikethrough':
          return React.createElement('s', { key, className: 'line-through' }, segment.content);
        
        case 'monospace':
          return React.createElement('code', { 
            key, 
            className: 'bg-muted px-1 py-0.5 rounded text-sm font-mono' 
          }, segment.content);
        
        case 'code':
          return React.createElement('pre', { 
            key, 
            className: 'bg-muted p-2 rounded text-sm font-mono whitespace-pre-wrap overflow-x-auto my-1' 
          }, React.createElement('code', {}, segment.content));
        
        case 'link':
          return React.createElement('a', {
            key,
            href: segment.href,
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'text-primary underline hover:opacity-80'
          }, segment.content);
        
        case 'mention':
          return React.createElement('span', {
            key,
            className: 'text-primary font-medium cursor-pointer hover:underline'
          }, segment.content);
        
        default:
          return React.createElement('span', { key }, segment.content);
      }
    });
  }, [parseMessage]);

  /**
   * Apply formatting to selected text
   */
  const applyFormatting = useCallback((
    text: string,
    selectionStart: number,
    selectionEnd: number,
    formatType: 'bold' | 'italic' | 'strikethrough' | 'monospace'
  ): { text: string; newCursorPos: number } => {
    const selectedText = text.slice(selectionStart, selectionEnd);
    
    if (!selectedText) {
      return { text, newCursorPos: selectionEnd };
    }

    const formatChars = {
      bold: '*',
      italic: '_',
      strikethrough: '~',
      monospace: '`'
    };

    const char = formatChars[formatType];
    const formattedText = `${char}${selectedText}${char}`;
    
    const newText = text.slice(0, selectionStart) + formattedText + text.slice(selectionEnd);
    const newCursorPos = selectionStart + formattedText.length;

    return { text: newText, newCursorPos };
  }, []);

  /**
   * Strip formatting from text
   */
  const stripFormatting = useCallback((text: string): string => {
    return text
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      .replace(/~([^~]+)~/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/```([^`]+)```/g, '$1');
  }, []);

  /**
   * Check if text has formatting
   */
  const hasFormatting = useCallback((text: string): boolean => {
    return /(\*[^*]+\*)|(_[^_]+_)|(~[^~]+~)|(`[^`]+`)/.test(text);
  }, []);

  /**
   * Get formatting toolbar items
   */
  const formattingOptions = useMemo(() => [
    { type: 'bold' as const, label: 'Bold', icon: 'B', shortcut: 'Ctrl+B' },
    { type: 'italic' as const, label: 'Italic', icon: 'I', shortcut: 'Ctrl+I' },
    { type: 'strikethrough' as const, label: 'Strikethrough', icon: 'S', shortcut: 'Ctrl+S' },
    { type: 'monospace' as const, label: 'Monospace', icon: '<>', shortcut: 'Ctrl+M' }
  ], []);

  return {
    parseMessage,
    renderFormattedMessage,
    applyFormatting,
    stripFormatting,
    hasFormatting,
    formattingOptions
  };
};

/**
 * FormattedText component for easy use
 */
export const FormattedText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  const { renderFormattedMessage } = useMessageFormatting();
  return React.createElement('span', { className }, renderFormattedMessage(text));
};
