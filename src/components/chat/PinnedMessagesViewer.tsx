import React, { useState, useEffect } from 'react';
import { Pin, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface PinnedMessage {
  id: string;
  message_id: string;
  pinned_at: string;
  pinned_by: string;
  message: {
    id: string;
    content: string;
    sender_id: string;
    created_at: string;
    message_type?: string;
    media_url?: string;
  };
  sender?: {
    username: string;
    avatar_url?: string;
  };
}

interface PinnedMessagesViewerProps {
  conversationId: string;
  userId: string;
  onMessageClick?: (messageId: string) => void;
  onUnpin?: (messageId: string) => void;
}

export const PinnedMessagesViewer = ({ 
  conversationId, 
  userId,
  onMessageClick,
  onUnpin
}: PinnedMessagesViewerProps) => {
  const [pinnedMessages, setPinnedMessages] = useState<PinnedMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadPinnedMessages();
    
    // Subscribe to changes
    const channel = supabase
      .channel(`pinned:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pinned_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          loadPinnedMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const loadPinnedMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('pinned_messages')
        .select(`
          *,
          message:messages(
            id,
            content,
            sender_id,
            created_at,
            message_type,
            media_url
          )
        `)
        .eq('conversation_id', conversationId)
        .order('pinned_at', { ascending: false })
        .limit(3);

      if (error) throw error;

      // Fetch sender details
      const enriched = await Promise.all(
        (data || []).map(async (pinned) => {
          const { data: sender } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', (pinned.message as any).sender_id)
            .single();

          return { ...pinned, sender } as PinnedMessage;
        })
      );

      setPinnedMessages(enriched);
    } catch (error) {
      console.error('Error loading pinned messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnpin = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('pinned_messages')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('message_id', messageId);

      if (error) throw error;
      
      toast.success('Message unpinned');
      onUnpin?.(messageId);
      await loadPinnedMessages();
    } catch (error) {
      console.error('Error unpinning message:', error);
      toast.error('Failed to unpin message');
    }
  };

  if (loading || pinnedMessages.length === 0) return null;

  return (
    <div className="border-b bg-primary/5 backdrop-blur-sm">
      <div className="px-3 py-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 text-sm text-primary font-medium hover:opacity-80 transition-opacity"
        >
          <Pin className="h-4 w-4 fill-primary" />
          <span>{pinnedMessages.length} Pinned Message{pinnedMessages.length !== 1 ? 's' : ''}</span>
          <span className="ml-auto text-xs">
            {expanded ? 'Hide' : 'Show'}
          </span>
        </button>

        {expanded && (
          <ScrollArea className="mt-2 max-h-60">
            <div className="space-y-2">
              {pinnedMessages.map((pinned) => (
                <div
                  key={pinned.id}
                  onClick={() => onMessageClick?.(pinned.message_id)}
                  className="bg-card rounded-lg p-3 border hover:bg-accent/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start gap-2">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={pinned.sender?.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/20 text-primary text-xs">
                        {pinned.sender?.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium mb-0.5">
                        {pinned.sender?.username || 'Unknown'}
                      </p>
                      <p className="text-sm line-clamp-2">
                        {pinned.message.content}
                      </p>
                    </div>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnpin(pinned.message_id);
                      }}
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};
