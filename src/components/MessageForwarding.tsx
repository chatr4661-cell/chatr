import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Forward } from 'lucide-react';

interface MessageForwardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: any;
  conversations: any[];
  userId: string;
}

export const MessageForwarding = ({ 
  open, 
  onOpenChange, 
  message, 
  conversations,
  userId 
}: MessageForwardingProps) => {
  const [selectedConversations, setSelectedConversations] = useState<string[]>([]);
  const [isForwarding, setIsForwarding] = useState(false);
  const { toast } = useToast();

  const handleConversationToggle = (conversationId: string) => {
    setSelectedConversations(prev =>
      prev.includes(conversationId)
        ? prev.filter(id => id !== conversationId)
        : [...prev, conversationId]
    );
  };

  const handleForward = async () => {
    if (selectedConversations.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one conversation",
        variant: "destructive"
      });
      return;
    }

    setIsForwarding(true);

    try {
      // Create forwarded messages
      const forwardedMessages = selectedConversations.map(convId => ({
        conversation_id: convId,
        sender_id: userId,
        content: message.content,
        message_type: message.message_type,
        media_url: message.media_url,
        forwarded_from_id: message.id
      }));

      const { data: newMessages, error: messageError } = await supabase
        .from('messages')
        .insert(forwardedMessages)
        .select();

      if (messageError) throw messageError;

      // Track forwards
      const forwards = newMessages.map(newMsg => ({
        original_message_id: message.id,
        forwarded_message_id: newMsg.id,
        forwarded_by: userId
      }));

      const { error: forwardError } = await supabase
        .from('message_forwards')
        .insert(forwards);

      if (forwardError) throw forwardError;

      toast({
        title: "Success",
        description: `Message forwarded to ${selectedConversations.length} conversation(s)`
      });

      onOpenChange(false);
      setSelectedConversations([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to forward message",
        variant: "destructive"
      });
    } finally {
      setIsForwarding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Forward Message</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-64 border rounded-md p-4">
          <div className="space-y-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="flex items-center space-x-3 p-2 hover:bg-muted rounded-lg cursor-pointer"
                onClick={() => handleConversationToggle(conv.id)}
              >
                <Checkbox
                  checked={selectedConversations.includes(conv.id)}
                  onCheckedChange={() => handleConversationToggle(conv.id)}
                />
                <Avatar className="h-8 w-8">
                  <AvatarImage src={conv.is_group ? conv.group_icon_url : conv.otherUser?.avatar_url} />
                  <AvatarFallback>
                    {(conv.is_group ? conv.group_name : conv.otherUser?.username)?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {conv.is_group ? conv.group_name : conv.otherUser?.username}
                  </p>
                  {conv.lastMessage && (
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.lastMessage.content}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <p className="text-xs text-muted-foreground px-4">
          {selectedConversations.length} conversation(s) selected
        </p>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isForwarding}
          >
            Cancel
          </Button>
          <Button
            onClick={handleForward}
            disabled={isForwarding || selectedConversations.length === 0}
          >
            <Forward className="h-4 w-4 mr-2" />
            {isForwarding ? "Forwarding..." : "Forward"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
