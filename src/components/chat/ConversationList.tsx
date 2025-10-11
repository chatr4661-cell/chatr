import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Loader2, Phone, Video, Check, CheckCheck, Search } from 'lucide-react';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  is_group: boolean;
  group_name?: string;
  group_icon_url?: string;
  updated_at: string;
  created_at: string;
  other_user?: {
    id: string;
    username: string;
    avatar_url?: string;
    is_online: boolean;
    phone_number?: string;
    email?: string;
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
  const [searchQuery, setSearchQuery] = useState('');

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

    // Debounced realtime to prevent excessive reloads
    let reloadTimeout: NodeJS.Timeout;
    const debouncedReload = () => {
      clearTimeout(reloadTimeout);
      reloadTimeout = setTimeout(loadConversations, 300);
    };

    const channel = supabase
      .channel('conversations-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, debouncedReload)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, debouncedReload)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const loadConversations = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      
      // Optimized single query approach
      const { data: participations, error: partError } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner (
            id,
            is_group,
            group_name,
            group_icon_url,
            updated_at,
            created_at
          )
        `)
        .eq('user_id', userId);

      if (partError || !participations?.length) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convIds = participations.map(p => (p.conversations as any).id);
      
      // Batch fetch last messages for all conversations
      const { data: lastMessages } = await supabase
        .from('messages')
        .select('id, conversation_id, content, created_at, sender_id, read_at')
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false });

      // Batch fetch all other participants
      const { data: allParticipants } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', convIds)
        .neq('user_id', userId);

      // Get unique user IDs
      const userIds = [...new Set(allParticipants?.map(p => p.user_id) || [])];
      
      // Batch fetch all user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, is_online, phone_number, email')
        .in('id', userIds);

      // Create lookup maps for performance
      const lastMessageMap = new Map();
      lastMessages?.forEach(msg => {
        if (!lastMessageMap.has(msg.conversation_id)) {
          lastMessageMap.set(msg.conversation_id, msg);
        }
      });

      const participantMap = new Map();
      allParticipants?.forEach(p => {
        if (!participantMap.has(p.conversation_id)) {
          participantMap.set(p.conversation_id, p.user_id);
        }
      });

      const profileMap = new Map();
      profiles?.forEach(p => profileMap.set(p.id, p));

      // Build conversation data efficiently
      const conversationData = participations.map((p: any) => {
        const conv = p.conversations;
        const lastMessage = lastMessageMap.get(conv.id);
        const otherUserId = participantMap.get(conv.id);
        const otherUser = otherUserId ? profileMap.get(otherUserId) : null;

        return {
          ...conv,
          last_message: lastMessage || null,
          other_user: otherUser || null
        };
      });

      // Sort by latest activity
      conversationData.sort((a, b) => {
        const aTime = a.last_message?.created_at || a.updated_at;
        const bTime = b.last_message?.created_at || b.updated_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
      
      setConversations(conversationData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setLoading(false);
    }
  };

  const startCall = async (conversation: any, callType: 'voice' | 'video', e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      console.log('🎥 Starting call from conversation list:', { callType, to: conversation.other_user?.username });
      
      // Get current user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', userId)
        .single();

      const { error } = await supabase
        .from('calls')
        .insert({
          conversation_id: conversation.id,
          caller_id: userId,
          caller_name: profile?.username || 'Unknown',
          caller_avatar: profile?.avatar_url,
          receiver_id: conversation.other_user?.id,
          receiver_name: conversation.other_user?.username || conversation.other_user?.email || 'Unknown',
          receiver_avatar: conversation.other_user?.avatar_url,
          call_type: callType,
          status: 'ringing'
        });

      if (error) {
        console.error('❌ Failed to create call:', error);
        throw error;
      }
      
      console.log('✅ Call created successfully');
      toast.success(`${callType === 'voice' ? 'Voice' : 'Video'} call started`);
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const displayName = conv.is_group 
      ? conv.group_name 
      : (conv.other_user?.username || conv.other_user?.phone_number || conv.other_user?.email || '');
    return (
      displayName?.toLowerCase().includes(query) ||
      conv.other_user?.phone_number?.toLowerCase().includes(query) ||
      conv.other_user?.email?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-background border-b p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/30 border-muted-foreground/20 rounded-xl h-11"
          />
        </div>
      </div>

      {filteredConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 p-8">
          <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <MessageCircle className="h-12 w-12 text-primary/50" />
          </div>
          <p className="text-lg font-semibold mb-1">
            {searchQuery ? 'No conversations found' : 'No conversations yet'}
          </p>
          <p className="text-sm text-muted-foreground text-center">
            {searchQuery ? 'Try a different search term' : 'Start chatting with friends and colleagues'}
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-0.5">
            {filteredConversations.map((conv) => {
          const displayName = conv.is_group 
            ? conv.group_name 
            : (conv.other_user?.username && conv.other_user.username.trim() !== '' 
                ? conv.other_user.username 
                : conv.other_user?.phone_number?.replace(/^\+/, '') || 
                  conv.other_user?.email?.split('@')[0] || 
                  'User');
          const displayAvatar = conv.is_group ? conv.group_icon_url : conv.other_user?.avatar_url;
          const lastMessage = conv.last_message;
          const messagePreview = lastMessage?.content || 'Hey there! I am using Chatr';
          
          // Safe timestamp formatting with validation
          let timestamp = '';
          try {
            if (lastMessage?.created_at) {
              const date = new Date(lastMessage.created_at);
              if (!isNaN(date.getTime())) {
                timestamp = formatDistanceToNow(date, { addSuffix: true });
              }
            } else if (conv.created_at) {
              const date = new Date(conv.created_at);
              if (!isNaN(date.getTime())) {
                timestamp = formatDistanceToNow(date, { addSuffix: true });
              }
            }
          } catch (error) {
            console.error('Error formatting timestamp:', error);
          }
          
          const isRead = lastMessage?.read_at != null;
          const isSent = lastMessage?.sender_id === userId;

          return (
            <div
              key={conv.id}
              onClick={() => onConversationSelect(conv.id, conv.other_user)}
              className="group flex items-center gap-3.5 p-3.5 rounded-2xl hover:bg-accent/40 cursor-pointer transition-all duration-200 active:bg-accent/60 touch-manipulation min-h-[76px]"
            >
              <div className="relative shrink-0">
                <Avatar className="w-14 h-14 ring-2 ring-background shadow-sm">
                  <AvatarImage src={displayAvatar} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-lg font-bold">
                    {displayName?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                {!conv.is_group && conv.other_user?.is_online && (
                  <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background shadow-sm" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <p className={`font-bold text-base truncate ${!isRead && !isSent ? 'text-foreground' : 'text-foreground'}`}>
                    {displayName}
                  </p>
                  <span className="text-xs text-muted-foreground shrink-0 ml-3 font-medium">
                    {timestamp.replace('about ', '').replace(' ago', '')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isSent && lastMessage && (
                    <div className="shrink-0">
                      {isRead ? (
                        <CheckCheck className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Check className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  )}
                   <p className={`text-sm truncate ${!isRead && !isSent ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                     {messagePreview}
                   </p>
                </div>
              </div>

              {!conv.is_group && conv.other_user && (
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => startCall(conv, 'voice', e)}
                    className="rounded-full h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors"
                    title="Voice Call"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => startCall(conv, 'video', e)}
                    className="rounded-full h-9 w-9 hover:bg-primary/10 hover:text-primary transition-colors"
                    title="Video Call"
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
