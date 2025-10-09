import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, FileText, Image, Video, File, User, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SearchResult {
  id: string;
  type: 'message' | 'contact' | 'file';
  content: string;
  sender?: { username: string; avatar_url: string };
  conversation_id?: string;
  message_type?: string;
  created_at?: string;
  contact_name?: string;
  contact_avatar?: string;
  contact_id?: string;
}

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (path: string) => void;
  currentUserId?: string;
}

const GlobalSearch = ({ open, onClose, onNavigate, currentUserId }: GlobalSearchProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTimer = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(searchTimer);
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      // Search all messages across all users
      const { data: messages } = await supabase
        .from('messages')
        .select('id, content, message_type, conversation_id, created_at, sender_id')
        .ilike('content', `%${searchQuery}%`)
        .limit(30);

      // Search all users by username
      const { data: allUsers } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${searchQuery}%`)
        .limit(20);

      // Get sender profiles for messages
      const messageResults: SearchResult[] = await Promise.all((messages || []).map(async (m) => {
        const { data: sender } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', m.sender_id)
          .single();

        return {
          id: m.id,
          type: 'message' as const,
          content: m.content,
          sender: sender || undefined,
          conversation_id: m.conversation_id,
          message_type: m.message_type,
          created_at: m.created_at,
        };
      }));

      // Format user results
      const userResults: SearchResult[] = (allUsers || []).map((user) => ({
        id: user.id,
        type: 'contact' as const,
        content: user.username || 'Unknown User',
        contact_name: user.username,
        contact_avatar: user.avatar_url,
        contact_id: user.id,
      }));

      setResults([...userResults, ...messageResults]);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMessageIcon = (messageType?: string) => {
    switch (messageType) {
      case 'image': return <Image className="h-4 w-4" />;
      case 'video': return <Video className="h-4 w-4" />;
      case 'file': return <File className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'contact' && result.contact_id) {
      // Don't navigate, let connection button handle it
      return;
    } else if (result.type === 'message' && result.conversation_id) {
      onNavigate(`/chat?conversation=${result.conversation_id}`);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Search Everything</DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages, contacts, files..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
            autoFocus
          />
        </div>

        <div className="overflow-y-auto max-h-[400px] space-y-2">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Searching...</div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {query ? 'No results found' : 'Start typing to search'}
            </div>
          ) : (
            results.map((result) => (
              <div
                key={`${result.type}-${result.id}`}
                onClick={() => handleResultClick(result)}
                className="p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
              >
                {result.type === 'contact' ? (
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={result.contact_avatar} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.content}</p>
                      <Badge variant="secondary" className="text-xs">Contact</Badge>
                    </div>
                    {currentUserId && result.contact_id && result.contact_id !== currentUserId && (
                      <Button
                        size="sm"
                        onClick={() => {
                          onNavigate(`/chat?contact=${result.contact_id}`);
                          onClose();
                        }}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Message
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={result.sender?.avatar_url} />
                      <AvatarFallback>{result.sender?.username?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium">{result.sender?.username}</p>
                        {getMessageIcon(result.message_type)}
                        {result.created_at && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {result.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalSearch;
