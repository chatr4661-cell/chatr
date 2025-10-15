import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MessageForwardDialogProps {
  open: boolean;
  onClose: () => void;
  messageId: string;
  messageContent: string;
  userId: string;
}

export const MessageForwardDialog: React.FC<MessageForwardDialogProps> = ({
  open,
  onClose,
  messageId,
  messageContent,
  userId
}) => {
  const [conversations, setConversations] = React.useState<any[]>([]);
  const [selectedConvs, setSelectedConvs] = React.useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      loadConversations();
    }
  }, [open]);

  const loadConversations = async () => {
    const { data: participations } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations!inner (
          id,
          is_group,
          group_name,
          group_icon_url
        )
      `)
      .eq('user_id', userId);

    if (!participations) return;

    const convIds = participations.map(p => (p.conversations as any).id);
    
    // Get other participants
    const { data: otherParticipants } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id, profiles!inner(username, avatar_url)')
      .in('conversation_id', convIds)
      .neq('user_id', userId);

    const convData = participations.map((p: any) => {
      const conv = p.conversations;
      const otherUser = otherParticipants?.find(op => op.conversation_id === conv.id);
      return {
        ...conv,
        other_user: otherUser?.profiles
      };
    });

    setConversations(convData);
  };

  const toggleSelection = (convId: string) => {
    const newSelection = new Set(selectedConvs);
    if (newSelection.has(convId)) {
      newSelection.delete(convId);
    } else {
      newSelection.add(convId);
    }
    setSelectedConvs(newSelection);
  };

  const handleForward = async () => {
    if (selectedConvs.size === 0) return;

    setSending(true);
    try {
      const messages = Array.from(selectedConvs).map(convId => ({
        conversation_id: convId,
        sender_id: userId,
        content: messageContent,
        message_type: 'text',
        reply_to_id: null
      }));

      const { error } = await supabase
        .from('messages')
        .insert(messages);

      if (error) throw error;

      toast.success(`Forwarded to ${selectedConvs.size} chat${selectedConvs.size > 1 ? 's' : ''}`);
      onClose();
    } catch (error) {
      console.error('Forward error:', error);
      toast.error('Failed to forward message');
    } finally {
      setSending(false);
    }
  };

  const filteredConvs = conversations.filter(conv => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const name = conv.is_group ? conv.group_name : conv.other_user?.username;
    return name?.toLowerCase().includes(query);
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Forward Message</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Conversation List */}
          <ScrollArea className="h-[300px]">
            <div className="space-y-1">
              {filteredConvs.map((conv) => {
                const displayName = conv.is_group ? conv.group_name : conv.other_user?.username;
                const displayAvatar = conv.is_group ? conv.group_icon_url : conv.other_user?.avatar_url;
                const isSelected = selectedConvs.has(conv.id);

                return (
                  <div
                    key={conv.id}
                    onClick={() => toggleSelection(conv.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/10' : 'hover:bg-accent/50'
                    }`}
                  >
                    <Checkbox checked={isSelected} />
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={displayAvatar} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {displayName?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{displayName}</span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-sm text-muted-foreground">
              {selectedConvs.size} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleForward}
                disabled={selectedConvs.size === 0 || sending}
              >
                <Send className="w-4 h-4 mr-2" />
                Forward
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
