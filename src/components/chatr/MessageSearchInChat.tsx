import React, { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface MessageSearchInChatProps {
  conversationId: string;
  onMessageClick: (messageId: string) => void;
}

export function MessageSearchInChat({ conversationId, onMessageClick }: MessageSearchInChatProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const { data } = await supabase
      .from('messages')
      .select('*, profiles!sender_id(username)')
      .eq('conversation_id', conversationId)
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (data) setResults(data);
  };

  return (
    <div className="relative">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Search className="w-5 h-5" />
        </button>
      ) : (
        <div className="absolute top-0 right-0 w-80 bg-card border border-border rounded-lg shadow-lg z-20">
          <div className="p-2 border-b border-border flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search in conversation..."
              className="border-0 focus-visible:ring-0"
              autoFocus
            />
            <button onClick={() => setIsOpen(false)} className="p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {results.length > 0 && (
            <div className="max-h-[400px] overflow-y-auto">
              {results.map(msg => (
                <button
                  key={msg.id}
                  onClick={() => {
                    onMessageClick(msg.id);
                    setIsOpen(false);
                  }}
                  className="w-full text-left p-3 hover:bg-muted/50 border-b border-border/50 transition-colors"
                >
                  <div className="text-xs font-semibold text-primary mb-1">
                    {msg.profiles?.username}
                  </div>
                  <div className="text-sm line-clamp-2">{msg.content}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
