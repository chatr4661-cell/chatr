import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle } from 'lucide-react';

interface Conversation {
  id: string;
  is_group: boolean;
  group_name?: string;
  group_icon_url?: string;
  updated_at: string;
  other_user?: {
    id: string;
    username: string;
    avatar_url?: string;
    is_online: boolean;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
}

interface ConversationListProps {
  userId: string;
  onConversationSelect: (conversationId: string, otherUser?: any) => void;
}

export const ConversationList = ({ userId, onConversationSelect }: ConversationListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversations();

    // Subscribe to new conversations and messages
    const channel = supabase
      .channel('conversations-list')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => loadConversations()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => loadConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadConversations = async () => {
    try {
      // Get all conversations user is part of
      const { data: participations } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations (
            id,
            is_group,
            group_name,
            group_icon_url,
            updated_at
          )
        `)
        .eq('user_id', userId);

      if (!participations) return;

      const conversationData = await Promise.all(
        participations.map(async (p: any) => {
          const conv = p.conversations;
          
          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, created_at, sender_id')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          // If not a group, get the other user's info
          let otherUser = null;
          if (!conv.is_group) {
            const { data: participants } = await supabase
              .from('conversation_participants')
              .select('user_id')
              .eq('conversation_id', conv.id)
              .neq('user_id', userId);

            if (participants && participants.length > 0) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('id, username, avatar_url, is_online')
                .eq('id', participants[0].user_id)
                .maybeSingle();

              otherUser = profile;
            }
          }

          return {
            ...conv,
            last_message: lastMessage,
            other_user: otherUser
          };
        })
      );

      // Sort by last activity
      conversationData.sort((a, b) => {
        const aTime = a.last_message?.created_at || a.updated_at;
        const bTime = b.last_message?.created_at || b.updated_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(conversationData);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading conversations...</div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 p-8">
        <MessageCircle className="w-16 h-16 text-muted-foreground/30" />
        <div className="text-center">
          <p className="font-semibold text-foreground">No conversations yet</p>
          <p className="text-sm text-muted-foreground">Start chatting with your contacts</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="divide-y">
        {conversations.map((conv) => {
          const displayName = conv.is_group 
            ? conv.group_name 
            : conv.other_user?.username || 'Unknown';
          const displayAvatar = conv.is_group 
            ? conv.group_icon_url 
            : conv.other_user?.avatar_url;
          const isOnline = conv.other_user?.is_online || false;

          return (
            <div
              key={conv.id}
              onClick={() => onConversationSelect(conv.id, conv.other_user)}
              className="flex items-center gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <div className="relative">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={displayAvatar} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {displayName[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                {!conv.is_group && isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold truncate">{displayName}</p>
                  {conv.last_message && (
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.last_message.created_at), { addSuffix: true })}
                    </span>
                  )}
                </div>
                {conv.last_message && (
                  <p className="text-sm text-muted-foreground truncate">
                    {conv.last_message.sender_id === userId ? 'You: ' : ''}
                    {conv.last_message.content}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
