import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Star, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface StarredMessagesProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  userId: string;
  onMessageClick: (messageId: string) => void;
}

export const StarredMessages: React.FC<StarredMessagesProps> = ({
  open,
  onClose,
  conversationId,
  userId,
  onMessageClick
}) => {
  const [starredMessages, setStarredMessages] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (open) {
      loadStarredMessages();
    }
  }, [open, conversationId]);

  const loadStarredMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, content, created_at, message_type, media_url')
        .eq('conversation_id', conversationId)
        .eq('is_starred', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStarredMessages(data || []);
    } catch (error) {
      console.error('Error loading starred messages:', error);
      toast.error('Failed to load starred messages');
    } finally {
      setLoading(false);
    }
  };

  const handleUnstar = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_starred: false })
        .eq('id', messageId);

      if (error) throw error;
      
      setStarredMessages(prev => prev.filter(m => m.id !== messageId));
      toast.success('Message unstarred');
    } catch (error) {
      console.error('Error unstarring message:', error);
      toast.error('Failed to unstar message');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            Starred Messages
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : starredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Star className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No starred messages yet</p>
              <p className="text-sm text-muted-foreground/70 mt-2">
                Star important messages to find them easily later
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {starredMessages.map((message) => (
                <div
                  key={message.id}
                  className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer group"
                  onClick={() => {
                    onMessageClick(message.id);
                    onClose();
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {message.message_type === 'image' && message.media_url && (
                        <img
                          src={message.media_url}
                          alt="Shared"
                          className="w-32 h-32 object-cover rounded-lg mb-2"
                        />
                      )}
                      <p className="text-sm break-words">{message.content}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnstar(message.id);
                      }}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
