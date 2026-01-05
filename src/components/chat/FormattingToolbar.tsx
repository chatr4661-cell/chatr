/**
 * Message Formatting Toolbar
 * Inline formatting options for rich text
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Bold, Italic, Strikethrough, Code, Link2, AtSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMessageFormatting } from '@/hooks/useMessageFormatting';

interface FormattingToolbarProps {
  text: string;
  selectionStart: number;
  selectionEnd: number;
  onTextChange: (text: string, cursorPos: number) => void;
  visible?: boolean;
  className?: string;
}

export const FormattingToolbar: React.FC<FormattingToolbarProps> = ({
  text,
  selectionStart,
  selectionEnd,
  onTextChange,
  visible = true,
  className
}) => {
  const { applyFormatting } = useMessageFormatting();

  const handleFormat = (type: 'bold' | 'italic' | 'strikethrough' | 'monospace') => {
    const result = applyFormatting(text, selectionStart, selectionEnd, type);
    onTextChange(result.text, result.newCursorPos);
  };

  const hasSelection = selectionStart !== selectionEnd;

  if (!visible) return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn(
        "flex items-center gap-0.5 p-1 bg-background border rounded-lg shadow-lg",
        className
      )}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "h-7 w-7 p-0",
                !hasSelection && "opacity-50"
              )}
              onClick={() => handleFormat('bold')}
              disabled={!hasSelection}
            >
              <Bold className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Bold (Ctrl+B)
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "h-7 w-7 p-0",
                !hasSelection && "opacity-50"
              )}
              onClick={() => handleFormat('italic')}
              disabled={!hasSelection}
            >
              <Italic className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Italic (Ctrl+I)
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "h-7 w-7 p-0",
                !hasSelection && "opacity-50"
              )}
              onClick={() => handleFormat('strikethrough')}
              disabled={!hasSelection}
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Strikethrough
          </TooltipContent>
        </Tooltip>

        <div className="w-px h-4 bg-border mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className={cn(
                "h-7 w-7 p-0",
                !hasSelection && "opacity-50"
              )}
              onClick={() => handleFormat('monospace')}
              disabled={!hasSelection}
            >
              <Code className="w-3.5 h-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Monospace
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

/**
 * Floating Formatting Toolbar
 * Appears on text selection
 */
export const FloatingFormattingToolbar: React.FC<{
  inputRef: React.RefObject<HTMLTextAreaElement | HTMLInputElement>;
  text: string;
  onTextChange: (text: string, cursorPos: number) => void;
}> = ({ inputRef, text, onTextChange }) => {
  const [selection, setSelection] = React.useState({ start: 0, end: 0 });
  const [position, setPosition] = React.useState({ top: 0, left: 0 });
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleSelectionChange = () => {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      
      setSelection({ start, end });
      
      if (start !== end) {
        // Calculate position relative to input
        const rect = input.getBoundingClientRect();
        setPosition({
          top: rect.top - 40,
          left: rect.left + (rect.width / 2) - 75
        });
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    input.addEventListener('select', handleSelectionChange);
    input.addEventListener('mouseup', handleSelectionChange);
    input.addEventListener('keyup', handleSelectionChange);

    return () => {
      input.removeEventListener('select', handleSelectionChange);
      input.removeEventListener('mouseup', handleSelectionChange);
      input.removeEventListener('keyup', handleSelectionChange);
    };
  }, [inputRef]);

  if (!visible) return null;

  return (
    <div 
      className="fixed z-50 animate-in fade-in slide-in-from-bottom-2"
      style={{ top: position.top, left: position.left }}
    >
      <FormattingToolbar
        text={text}
        selectionStart={selection.start}
        selectionEnd={selection.end}
        onTextChange={onTextChange}
        visible={visible}
      />
    </div>
  );
};
