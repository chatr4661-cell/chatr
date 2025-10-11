import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Loader2, Phone, Video, Check, CheckCheck, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useConversationCache } from '@/hooks/useConversationCache';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationListSkeleton } from './ConversationListSkeleton';

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

interface VirtualizedConversationListProps {
  userId: string;
  onConversationSelect: (conversationId: string, otherUser?: any) => void;
}

export const VirtualizedConversationList = ({ userId, onConversationSelect }: VirtualizedConversationListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { getCached, setCache } = useConversationCache();

  const loadConversations = useCallback(async () => {
    if (!userId) return;

    try {
      // Try cache first
      const cached = await getCached(`conversations-${userId}`);
      if (cached) {
        setConversations(cached);
        setLoading(false);
      }

      // Try optimized database function first
      const { data: optimizedData, error: rpcError } = await supabase
        .rpc('get_user_conversations_optimized', { p_user_id: userId });

      if (!rpcError && optimizedData) {
        // Transform to match expected format
        const conversationData = optimizedData.map((conv: any) => ({
          id: conv.id,
          is_group: conv.is_group,
          group_name: conv.group_name,
          group_icon_url: conv.group_icon_url,
          is_community: conv.is_community,
          community_description: conv.community_description,
          updated_at: conv.lastmessagetime || new Date().toISOString(),
          last_message: conv.lastmessage ? {
            content: conv.lastmessage,
            created_at: conv.lastmessagetime,
            sender_id: '', // Not needed for display
            read_at: undefined
          } : undefined,
          other_user: conv.otheruser || undefined
        }));

        setConversations(conversationData);
        await setCache(`conversations-${userId}`, conversationData);
        setLoading(false);
        return;
      }

      // Fallback to original method if RPC fails
      const { data: participations } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          conversations!inner (id, is_group, group_name, group_icon_url, updated_at)
        `)
        .eq('user_id', userId)
        .limit(50);

      if (!participations?.length) {
        setConversations([]);
        setLoading(false);
        return;
      }

      const convIds = participations.map(p => (p.conversations as any).id);

      // Optimized parallel fetches
      const [messagesResult, participantsResult] = await Promise.all([
        supabase
          .from('messages')
          .select('conversation_id, content, created_at')
          .in('conversation_id', convIds)
          .order('created_at', { ascending: false })
          .limit(convIds.length), // Only get one per conversation
        supabase
          .from('conversation_participants')
          .select('conversation_id, user_id, profiles!inner(id, username, avatar_url, is_online)')
          .in('conversation_id', convIds)
          .neq('user_id', userId)
      ]);

      // Build lookup maps efficiently
      const lastMessageMap = new Map();
      messagesResult.data?.forEach(msg => {
        if (!lastMessageMap.has(msg.conversation_id)) {
          lastMessageMap.set(msg.conversation_id, msg);
        }
      });

      const otherUserMap = new Map();
      participantsResult.data?.forEach((p: any) => {
        if (!otherUserMap.has(p.conversation_id)) {
          otherUserMap.set(p.conversation_id, p.profiles);
        }
      });

      const conversationData = participations
        .map((p: any) => {
          const conv = p.conversations;
          return {
            ...conv,
            last_message: lastMessageMap.get(conv.id) || null,
            other_user: otherUserMap.get(conv.id) || null
          };
        })
        .sort((a, b) => {
          const aTime = a.last_message?.created_at || a.updated_at;
          const bTime = b.last_message?.created_at || b.updated_at;
          return new Date(bTime).getTime() - new Date(aTime).getTime();
        });

      setConversations(conversationData);
      await setCache(`conversations-${userId}`, conversationData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setLoading(false);
    }
  }, [userId, getCached, setCache]);

  useEffect(() => {
    if (!userId) return;
    loadConversations();

    // Debounced realtime
    let timeout: NodeJS.Timeout;
    const debouncedReload = () => {
      clearTimeout(timeout);
      timeout = setTimeout(loadConversations, 500);
    };

    const channel = supabase
      .channel('conv-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, debouncedReload)
      .subscribe();

    return () => {
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [userId, loadConversations]);

  const filteredConversations = useMemo(() => 
    conversations.filter(conv => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const name = conv.is_group ? conv.group_name : conv.other_user?.username;
      return name?.toLowerCase().includes(query);
    }), [conversations, searchQuery]
  );


  if (loading) {
    return <ConversationListSkeleton />;
  }

  return (
    <div className="flex flex-col h-full rounded-t-3xl overflow-hidden">
      <div className="sticky top-0 z-10 glass-card border-b p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 glass border-border/50"
          />
        </div>
      </div>

      {filteredConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 p-8">
          <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold">No conversations yet</p>
          <p className="text-sm text-muted-foreground">Start chatting!</p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          {filteredConversations.map(conv => {
            const displayName = conv.is_group ? conv.group_name : (conv.other_user?.username || 'User');
            const lastMessage = conv.last_message;
            const isRead = lastMessage?.read_at != null;
            const isSent = lastMessage?.sender_id === userId;

            return (
              <div
                key={conv.id}
                onClick={() => onConversationSelect(conv.id, conv.other_user)}
                className="flex items-center gap-3 px-4 py-3 hover:bg-primary/5 cursor-pointer transition-all duration-200 border-b border-border/30 hover:shadow-sm"
              >
                <Avatar className="w-12 h-12">
                  <AvatarImage src={conv.is_group ? conv.group_icon_url : conv.other_user?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {displayName?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <p className="font-semibold truncate">{displayName}</p>
                    <span className="text-xs text-muted-foreground ml-2">
                      {lastMessage?.created_at && formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true }).replace('about ', '').replace(' ago', '')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {isSent && lastMessage && (
                      isRead ? <CheckCheck className="h-3 w-3 text-primary" /> : <Check className="h-3 w-3 text-muted-foreground" />
                    )}
                    <p className={`text-sm truncate ${!isRead && !isSent ? 'font-semibold' : 'text-muted-foreground'}`}>
                      {lastMessage?.content || 'Start chatting'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </ScrollArea>
      )}
    </div>
  );
};
