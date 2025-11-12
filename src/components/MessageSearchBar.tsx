import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  message_type?: string;
}

interface MessageSearchBarProps {
  messages: Message[];
  onResultSelect: (messageId: string) => void;
  onClose: () => void;
}

export const MessageSearchBar = ({ messages, onResultSelect, onClose }: MessageSearchBarProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Message[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setCurrentIndex(0);
      return;
    }

    // Search through messages
    const searchResults = messages.filter((msg) => {
      // Only search text messages
      if (msg.message_type !== 'text') return false;
      
      return msg.content.toLowerCase().includes(searchTerm.toLowerCase());
    });

    setResults(searchResults);
    setCurrentIndex(0);
  }, [searchTerm, messages]);

  const handleNext = () => {
    if (results.length === 0) return;
    const nextIndex = (currentIndex + 1) % results.length;
    setCurrentIndex(nextIndex);
    onResultSelect(results[nextIndex].id);
  };

  const handlePrevious = () => {
    if (results.length === 0) return;
    const prevIndex = currentIndex === 0 ? results.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    onResultSelect(results[prevIndex].id);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        handlePrevious();
      } else {
        handleNext();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 border-b bg-card/50 backdrop-blur-sm">
      <Search className="h-4 w-4 text-muted-foreground" />
      <Input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search in conversation..."
        className="flex-1 h-8 text-sm"
        autoFocus
      />
      
      {results.length > 0 && (
        <>
          <Badge variant="secondary" className="text-xs">
            {currentIndex + 1} / {results.length}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            className="h-8 w-8"
            disabled={results.length === 0}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNext}
            className="h-8 w-8"
            disabled={results.length === 0}
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </>
      )}
      
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="h-8 w-8"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
