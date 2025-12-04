import { useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Archive, ArchiveRestore, Pin, PinOff, BellOff, Bell, Trash2, Timer } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DisappearingMessagesSheet } from './DisappearingMessagesSheet';

interface ConversationContextMenuProps {
  children: React.ReactNode;
  conversationId: string;
  userId: string;
  isArchived?: boolean;
  isMuted?: boolean;
  isPinned?: boolean;
  onUpdate?: () => void;
}

export const ConversationContextMenu = ({
  children,
  conversationId,
  userId,
  isArchived = false,
  isMuted = false,
  isPinned = false,
  onUpdate,
}: ConversationContextMenuProps) => {
  const [showDisappearingSheet, setShowDisappearingSheet] = useState(false);

  const handleArchive = async () => {
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .update({ is_archived: !isArchived })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success(isArchived ? 'Chat unarchived' : 'Chat archived');
      onUpdate?.();
    } catch (error) {
      console.error('Error archiving chat:', error);
      toast.error('Failed to archive chat');
    }
  };

  const handleMute = async () => {
    try {
      const { error } = await supabase
        .from('conversation_participants')
        .update({ is_muted: !isMuted })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success(isMuted ? 'Notifications unmuted' : 'Notifications muted');
      onUpdate?.();
    } catch (error) {
      console.error('Error muting chat:', error);
      toast.error('Failed to mute chat');
    }
  };

  const handlePin = async () => {
    // Pin functionality uses localStorage since pinned_at column doesn't exist
    try {
      const pinnedKey = `chatr-pinned-${userId}`;
      const pinned = JSON.parse(localStorage.getItem(pinnedKey) || '[]');
      
      if (isPinned) {
        const newPinned = pinned.filter((id: string) => id !== conversationId);
        localStorage.setItem(pinnedKey, JSON.stringify(newPinned));
      } else {
        if (!pinned.includes(conversationId)) {
          pinned.unshift(conversationId);
          localStorage.setItem(pinnedKey, JSON.stringify(pinned.slice(0, 5))); // Max 5 pinned
        }
      }
      
      toast.success(isPinned ? 'Chat unpinned' : 'Chat pinned');
      onUpdate?.();
    } catch (error) {
      console.error('Error pinning chat:', error);
      toast.error('Failed to pin chat');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this chat? This cannot be undone.')) return;
    
    try {
      // Remove user from conversation
      const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Chat deleted');
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting chat:', error);
      toast.error('Failed to delete chat');
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={handlePin} className="gap-2">
            {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            {isPinned ? 'Unpin chat' : 'Pin chat'}
          </ContextMenuItem>
          
          <ContextMenuItem onClick={handleMute} className="gap-2">
            {isMuted ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            {isMuted ? 'Unmute notifications' : 'Mute notifications'}
          </ContextMenuItem>
          
          <ContextMenuItem onClick={handleArchive} className="gap-2">
            {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            {isArchived ? 'Unarchive chat' : 'Archive chat'}
          </ContextMenuItem>

          <ContextMenuItem onClick={() => setShowDisappearingSheet(true)} className="gap-2">
            <Timer className="h-4 w-4" />
            Disappearing messages
          </ContextMenuItem>
          
          <ContextMenuSeparator />
          
          <ContextMenuItem onClick={handleDelete} className="gap-2 text-destructive focus:text-destructive">
            <Trash2 className="h-4 w-4" />
            Delete chat
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <DisappearingMessagesSheet
        open={showDisappearingSheet}
        onOpenChange={setShowDisappearingSheet}
        conversationId={conversationId}
      />
    </>
  );
};