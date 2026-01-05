/**
 * Message Search Sheet
 * Full-text search with filters
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useFullTextSearch } from '@/hooks/useFullTextSearch';
import { format } from 'date-fns';
import { 
  Search, 
  X, 
  Image, 
  FileText, 
  MapPin, 
  Mic,
  Video,
  Link2,
  Calendar,
  Filter,
  ArrowRight,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageSearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: string;
  onMessageSelect?: (messageId: string, conversationId: string) => void;
}

export const MessageSearchSheet: React.FC<MessageSearchSheetProps> = ({
  open,
  onOpenChange,
  conversationId,
  onMessageSelect
}) => {
  const {
    results,
    loading,
    totalCount,
    searchQuery,
    search,
    searchDebounced,
    searchByType,
    getSearchSuggestions,
    saveSearchHistory,
    clearSearch
  } = useFullTextSearch();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Load suggestions on open
  useEffect(() => {
    if (open) {
      getSearchSuggestions().then(setSuggestions);
    }
  }, [open, getSearchSuggestions]);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    setActiveFilter(null);
    if (value.trim()) {
      searchDebounced(value, conversationId ? { conversationId } : undefined);
    } else {
      clearSearch();
    }
  }, [searchDebounced, conversationId, clearSearch]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      search(query, conversationId ? { conversationId } : undefined);
      saveSearchHistory(query);
    }
  }, [query, search, conversationId, saveSearchHistory]);

  const handleFilterClick = useCallback((type: string) => {
    setActiveFilter(type);
    setQuery('');
    searchByType(type as any, conversationId);
  }, [searchByType, conversationId]);

  const handleResultClick = useCallback((result: any) => {
    if (onMessageSelect) {
      onMessageSelect(result.id, result.conversation_id);
      onOpenChange(false);
    }
  }, [onMessageSelect, onOpenChange]);

  const filters = [
    { type: 'image', label: 'Photos', icon: Image },
    { type: 'video', label: 'Videos', icon: Video },
    { type: 'document', label: 'Files', icon: FileText },
    { type: 'voice', label: 'Voice', icon: Mic },
    { type: 'location', label: 'Location', icon: MapPin },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="top" className="h-[90vh] rounded-b-3xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Search Messages
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <form onSubmit={handleSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search messages..."
              className="pl-10 pr-10"
              autoFocus
            />
            {query && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => {
                  setQuery('');
                  clearSearch();
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </form>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2">
            {filters.map(filter => {
              const Icon = filter.icon;
              return (
                <Button
                  key={filter.type}
                  size="sm"
                  variant={activeFilter === filter.type ? "default" : "outline"}
                  className="shrink-0 gap-1.5"
                  onClick={() => handleFilterClick(filter.type)}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {filter.label}
                </Button>
              );
            })}
          </div>

          {/* Recent Searches */}
          {!query && !activeFilter && suggestions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Recent Searches
              </h3>
              <div className="flex flex-wrap gap-2">
                {suggestions.slice(0, 5).map((suggestion, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="cursor-pointer hover:bg-secondary/80"
                    onClick={() => handleSearch(suggestion)}
                  >
                    {suggestion}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Results Count */}
          {(query || activeFilter) && !loading && (
            <p className="text-sm text-muted-foreground">
              {totalCount} result{totalCount !== 1 ? 's' : ''} found
              {activeFilter && ` in ${activeFilter}`}
            </p>
          )}

          {/* Search Results */}
          <ScrollArea className="h-[calc(90vh-240px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-2 pr-4">
                {results.map(result => (
                  <div
                    key={result.id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="flex-1 min-w-0">
                      <div 
                        className="text-sm line-clamp-2"
                        dangerouslySetInnerHTML={{ 
                          __html: result.headline || result.content 
                        }}
                      />
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(result.created_at), 'MMM dd, yyyy HH:mm')}
                        {result.message_type !== 'text' && (
                          <Badge variant="outline" className="text-[10px] py-0">
                            {result.message_type}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            ) : (query || activeFilter) ? (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages found</p>
                <p className="text-xs">Try a different search term</p>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Search your messages</p>
                <p className="text-xs">Find photos, links, and more</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
};
