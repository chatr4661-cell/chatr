import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Pin, 
  PinOff, 
  Forward, 
  Reply, 
  Copy, 
  Trash,
  Star,
  StarOff 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  conversation_id: string;
  is_starred?: boolean;
}

interface MessageActionProps {
  message: Message;
  currentUserId: string;
  isPinned?: boolean;
  onReply?: () => void;
  onForward?: () => void;
  onDelete?: () => void;
  onPinToggle?: () => void;
}

const MessageAction = ({ 
  message, 
  currentUserId, 
  isPinned = false,
  onReply,
  onForward,
  onDelete,
  onPinToggle
}: MessageActionProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const isOwnMessage = message.sender_id === currentUserId;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    toast({
      title: 'Copied',
      description: 'Message copied to clipboard',
    });
  };

  const handleStar = async () => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_starred: !message.is_starred })
        .eq('id', message.id);

      if (error) throw error;

      toast({
        title: message.is_starred ? 'Unstarred' : 'Starred',
        description: message.is_starred ? 'Message removed from starred' : 'Message added to starred',
      });
    } catch (error) {
      console.error('Error starring message:', error);
      toast({
        title: 'Error',
        description: 'Failed to star message',
        variant: 'destructive',
      });
    }
  };

  const handlePin = async () => {
    try {
      setLoading(true);
      
      if (isPinned) {
        const { error } = await supabase
          .from('pinned_messages')
          .delete()
          .eq('message_id', message.id);

        if (error) throw error;

        toast({
          title: 'Message unpinned',
          description: 'Message removed from pinned',
        });
      } else {
        const { error } = await supabase
          .from('pinned_messages')
          .insert({
            conversation_id: message.conversation_id,
            message_id: message.id,
            pinned_by: currentUserId,
          });

        if (error) throw error;

        toast({
          title: 'Message pinned',
          description: 'Message pinned to conversation',
        });
      }

      onPinToggle?.();
    } catch (error: any) {
      console.error('Error pinning message:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to pin message',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwnMessage) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', message.id);

      if (error) throw error;

      toast({
        title: 'Message deleted',
        description: 'Message has been deleted',
      });

      onDelete?.();
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive',
      });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onReply}>
          <Reply className="h-4 w-4 mr-2" />
          Reply
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={onForward}>
          <Forward className="h-4 w-4 mr-2" />
          Forward
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-2" />
          Copy
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleStar}>
          {message.is_starred ? (
            <><StarOff className="h-4 w-4 mr-2" /> Unstar</>
          ) : (
            <><Star className="h-4 w-4 mr-2" /> Star</>
          )}
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handlePin} disabled={loading}>
          {isPinned ? (
            <><PinOff className="h-4 w-4 mr-2" /> Unpin</>
          ) : (
            <><Pin className="h-4 w-4 mr-2" /> Pin</>
          )}
        </DropdownMenuItem>
        
        {isOwnMessage && (
          <DropdownMenuItem onClick={handleDelete} className="text-destructive">
            <Trash className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MessageAction;
