import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Loader2, Phone, Video, Check, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';

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
    phone_number?: string;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
    read_at?: string;
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
    if (!userId) {
      setLoading(false);
      return;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('❌ Invalid userId format:', userId);
      setLoading(false);
      return;
    }
    
    loadConversations();

    const channel = supabase
      .channel('conversations-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => loadConversations())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => loadConversations())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadConversations = async () => {
    if (!userId) return;

    try {
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
          
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('content, created_at, sender_id, read_at')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

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
                .select('id, username, avatar_url, is_online, phone_number')
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

  const startCall = async (conversation: any, callType: 'voice' | 'video', e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('calls')
        .insert({
          conversation_id: conversation.id,
          caller_id: userId,
          receiver_id: conversation.other_user?.id,
          call_type: callType,
          status: 'ringing'
        });

      if (error) throw error;
      toast.success(`${callType === 'voice' ? 'Voice' : 'Video'} call started`);
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <MessageCircle className="h-12 w-12 text-primary/50" />
        </div>
        <p className="text-lg font-semibold mb-1">No conversations yet</p>
        <p className="text-sm text-muted-foreground text-center">Start chatting with friends and colleagues</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2 space-y-1">
        {conversations.map((conv) => {
          const displayName = conv.is_group ? conv.group_name : (conv.other_user?.username || conv.other_user?.phone_number || 'Unknown');
          const displayAvatar = conv.is_group ? conv.group_icon_url : conv.other_user?.avatar_url;
          const lastMessage = conv.last_message;
          const messagePreview = lastMessage?.content || 'No messages yet';
          const timestamp = lastMessage?.created_at 
            ? formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true })
            : '';
          const isRead = lastMessage?.read_at != null;
          const isSent = lastMessage?.sender_id === userId;

          return (
            <div
              key={conv.id}
              onClick={() => onConversationSelect(conv.id, conv.other_user)}
              className="group flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 cursor-pointer transition-all"
            >
              <div className="relative">
                <Avatar className="w-14 h-14 border-2 border-primary/10">
                  <AvatarImage src={displayAvatar} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-lg font-semibold">
                    {displayName?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                {!conv.is_group && conv.other_user?.is_online && (
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className={`font-semibold truncate ${!isRead && !isSent ? 'text-foreground' : ''}`}>
                    {displayName}
                  </p>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">{timestamp}</span>
                </div>
                <div className="flex items-center gap-1">
                  {isSent && lastMessage && (
                    <div className="shrink-0">
                      {isRead ? (
                        <CheckCheck className="h-3 w-3 text-primary" />
                      ) : (
                        <Check className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                  )}
                  <p className={`text-sm truncate ${!isRead && !isSent ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                    {messagePreview}
                  </p>
                </div>
                {!conv.is_group && conv.other_user?.is_online && (
                  <Badge variant="outline" className="text-xs mt-1 border-green-500/50 text-green-600 w-fit">
                    Online
                  </Badge>
                )}
              </div>

              {!conv.is_group && conv.other_user && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => startCall(conv, 'voice', e)}
                    className="rounded-full h-8 w-8 hover:bg-primary/10 hover:text-primary"
                    title="Voice Call"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => startCall(conv, 'video', e)}
                    className="rounded-full h-8 w-8 hover:bg-primary/10 hover:text-primary"
                    title="Video Call"
                  >
                    <Video className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
