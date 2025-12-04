import * as React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow } from 'date-fns';
import { MessageCircle, Loader2, Phone, Video, Check, CheckCheck, Search, Pin, BellOff, Archive, UserPlus, Users, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useConversationCache } from '@/hooks/useConversationCache';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversationListSkeleton } from './ConversationListSkeleton';
import { ConversationContextMenu } from './ConversationContextMenu';

interface Contact {
  id: string;
  contact_name: string;
  contact_phone?: string;
  contact_user_id?: string;
  is_registered: boolean;
  avatar_url?: string;
  username?: string;
  email?: string;
}

interface Conversation {
  id: string;
  is_group: boolean;
  group_name?: string;
  group_icon_url?: string;
  updated_at: string;
  is_archived?: boolean;
  is_muted?: boolean;
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
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [startingChat, setStartingChat] = React.useState<string | null>(null);
  const { getCachedConversations, setCachedConversations } = useConversationCache();

  // Helper to format message content for display
  const formatMessageContent = (content: string) => {
    // Parse Contact messages
    if (content.startsWith('[Contact]')) {
      const match = content.match(/\[Contact\]\s*(.+?)\s*-/);
      return match ? `Contact: ${match[1]}` : 'Contact shared';
    }
    
    // Parse Poll messages
    if (content.startsWith('[Poll]')) {
      try {
        const jsonMatch = content.match(/\[Poll\]\s*({.+})/);
        if (jsonMatch) {
          const pollData = JSON.parse(jsonMatch[1]);
          return `📊 Poll: ${pollData.question}`;
        }
      } catch (e) {
        return '📊 Poll';
      }
    }
    
    // Parse location messages
    if (content === '📍' || content.startsWith('📍')) {
      return '📍 Location';
    }
    
    return content;
  };

  // Helper to format display names (remove technical details)
  const formatDisplayName = (name: string | undefined) => {
    if (!name) return 'Unknown';
    // Remove @chatr.local and phone numbers
    return name.split('@')[0].replace(/^\d+/, '').trim() || name;
  };

  const loadConversations = React.useCallback(async () => {
    if (!userId) return;

    try {
      // Try cache first
      const cached = await getCachedConversations();
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
        await setCachedConversations(conversationData);
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
      await setCachedConversations(conversationData);
      setLoading(false);
    } catch (error) {
      console.error('Error loading conversations:', error);
      setLoading(false);
    }
  }, [userId, getCachedConversations, setCachedConversations]);

  // Load platform users and contacts (simplified for performance)
  const loadContacts = React.useCallback(async () => {
    if (!userId) return;
    
    try {
      // Load user's existing contacts
      const { data: phoneContacts } = await supabase
        .from('contacts')
        .select('id, contact_name, contact_phone, contact_user_id, is_registered')
        .eq('user_id', userId)
        .limit(50);

      // Also get other platform users (people user can chat with)
      const { data: platformUsers } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, phone_number')
        .neq('id', userId)
        .not('username', 'is', null)
        .limit(20);

      const allContacts: Contact[] = [];
      const seenIds = new Set<string>();

      // Add phone contacts with profile info
      if (phoneContacts?.length) {
        const registeredIds = phoneContacts
          .filter(c => c.contact_user_id)
          .map(c => c.contact_user_id) as string[];

        let profileMap = new Map();
        if (registeredIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', registeredIds);
          profiles?.forEach(p => profileMap.set(p.id, p));
        }

        phoneContacts.forEach(c => {
          const profile = c.contact_user_id ? profileMap.get(c.contact_user_id) : null;
          if (c.contact_user_id && !seenIds.has(c.contact_user_id)) {
            seenIds.add(c.contact_user_id);
            allContacts.push({
              id: c.id,
              contact_name: c.contact_name,
              contact_phone: c.contact_phone,
              contact_user_id: c.contact_user_id,
              is_registered: c.is_registered,
              avatar_url: profile?.avatar_url,
              username: profile?.username
            });
          }
        });
      }

      // Add platform users (people on Chatr)
      platformUsers?.forEach(u => {
        if (!seenIds.has(u.id)) {
          seenIds.add(u.id);
          allContacts.push({
            id: u.id,
            contact_name: u.username || 'Chatr User',
            contact_phone: u.phone_number,
            contact_user_id: u.id,
            is_registered: true,
            avatar_url: u.avatar_url,
            username: u.username
          });
        }
      });

      setContacts(allContacts);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  }, [userId]);

  // Start chat with a contact
  const handleStartChat = async (contact: Contact) => {
    if (!contact.contact_user_id || !contact.is_registered) {
      // Open invite dialog or share link
      const inviteText = `Hey! Join me on Chatr - India's super app for messaging, jobs, healthcare & more. Download now: https://chatr.chat/join`;
      if (contact.contact_phone) {
        window.open(`https://wa.me/${contact.contact_phone.replace(/\D/g, '')}?text=${encodeURIComponent(inviteText)}`, '_blank');
      } else if (contact.email) {
        window.open(`mailto:${contact.email}?subject=Join me on Chatr&body=${encodeURIComponent(inviteText)}`, '_blank');
      }
      return;
    }

    setStartingChat(contact.id);
    try {
      const { data, error } = await supabase.rpc('create_direct_conversation', {
        other_user_id: contact.contact_user_id
      });

      if (error) throw error;

      onConversationSelect(data, {
        id: contact.contact_user_id,
        username: contact.username || contact.contact_name,
        avatar_url: contact.avatar_url
      });
    } catch (error) {
      console.error('Error starting chat:', error);
      toast.error('Failed to start conversation');
    } finally {
      setStartingChat(null);
    }
  };

  React.useEffect(() => {
    if (!userId) return;
    loadConversations();
    loadContacts();

    let timeout: NodeJS.Timeout;
    const instantReload = () => {
      clearTimeout(timeout);
      timeout = setTimeout(loadConversations, 100);
    };

    const channel = supabase
      .channel('conv-updates-realtime', {
        config: { broadcast: { self: true } }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, instantReload)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, instantReload)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'conversations' }, instantReload)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations' }, instantReload)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, instantReload)
      .subscribe();

    const refreshInterval = setInterval(loadConversations, 5000);

    return () => {
      clearInterval(refreshInterval);
      clearTimeout(timeout);
      supabase.removeChannel(channel);
    };
  }, [userId, loadConversations, loadContacts]);

  // Get pinned conversations from localStorage
  const pinnedConversations = React.useMemo(() => {
    const pinnedKey = `chatr-pinned-${userId}`;
    return JSON.parse(localStorage.getItem(pinnedKey) || '[]') as string[];
  }, [userId]);

  const [showArchived, setShowArchived] = React.useState(false);

  const filteredConversations = React.useMemo(() => {
    let filtered = conversations.filter(conv => {
      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const name = conv.is_group ? conv.group_name : conv.other_user?.username;
        if (!name?.toLowerCase().includes(query)) return false;
      }
      // Filter archived unless showing archived
      if (conv.is_archived && !showArchived) return false;
      return true;
    });
    
    // Sort: pinned first, then by last message time
    return filtered.sort((a, b) => {
      const aIsPinned = pinnedConversations.includes(a.id);
      const bIsPinned = pinnedConversations.includes(b.id);
      if (aIsPinned && !bIsPinned) return -1;
      if (!aIsPinned && bIsPinned) return 1;
      return 0; // Keep original order for same pin status
    });
  }, [conversations, searchQuery, showArchived, pinnedConversations]);

  // Filter contacts by search query
  const filteredContacts = React.useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const query = searchQuery.toLowerCase();
    return contacts.filter(c => 
      c.contact_name?.toLowerCase().includes(query) ||
      c.username?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.contact_phone?.includes(query)
    );
  }, [contacts, searchQuery]);

  if (loading) {
    return <ConversationListSkeleton />;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 bg-background border-b p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/30"
          />
        </div>
      </div>

      {filteredConversations.length === 0 ? (
        <ScrollArea className="flex-1">
          {filteredContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8">
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">No conversations yet</p>
              <p className="text-sm text-muted-foreground">Start chatting with people below!</p>
            </div>
          ) : (
            <div className="pb-4">
              {/* People on Chatr */}
              <div className="px-4 py-2 bg-muted/30 border-b">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase">
                    People on Chatr ({filteredContacts.length})
                  </span>
                </div>
              </div>
              {filteredContacts.map(contact => (
                <div
                  key={contact.id}
                  onClick={() => handleStartChat(contact)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 cursor-pointer transition-colors border-b"
                >
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={contact.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {(contact.username || contact.contact_name)?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{contact.username || contact.contact_name}</p>
                    <p className="text-sm text-muted-foreground truncate">Tap to chat</p>
                  </div>
                  {startingChat === contact.id ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <MessageCircle className="h-5 w-5 text-primary" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      ) : (
        <ScrollArea className="flex-1">
          {filteredConversations.map(conv => {
            const rawDisplayName = conv.is_group ? conv.group_name : (conv.other_user?.username || 'User');
            const displayName = formatDisplayName(rawDisplayName);
            const lastMessage = conv.last_message;
            const isRead = lastMessage?.read_at != null;
            const isSent = lastMessage?.sender_id === userId;
            const messagePreview = lastMessage?.content ? formatMessageContent(lastMessage.content) : 'Start chatting';
            const isOnline = conv.other_user?.is_online;
            const isPinned = pinnedConversations.includes(conv.id);

            return (
              <ConversationContextMenu
                key={conv.id}
                conversationId={conv.id}
                userId={userId}
                isArchived={conv.is_archived}
                isMuted={conv.is_muted}
                isPinned={isPinned}
                onUpdate={loadConversations}
              >
                <div
                  onClick={() => onConversationSelect(conv.id, conv.other_user)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 cursor-pointer transition-colors border-b"
                >
                  <div className="relative">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={conv.is_group ? conv.group_icon_url : conv.other_user?.avatar_url} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {displayName?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    {!conv.is_group && isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="font-semibold truncate">{displayName}</p>
                        {isPinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                        {conv.is_muted && <BellOff className="h-3 w-3 text-muted-foreground shrink-0" />}
                      </div>
                      <span className="text-xs text-muted-foreground ml-2 shrink-0">
                        {lastMessage?.created_at && formatDistanceToNow(new Date(lastMessage.created_at), { addSuffix: true }).replace('about ', '').replace(' ago', '')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isSent && lastMessage && (
                        isRead ? <CheckCheck className="h-3 w-3 text-primary shrink-0" /> : <Check className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                      <p className={`text-sm truncate ${!isRead && !isSent ? 'font-semibold' : 'text-muted-foreground'}`}>
                        {messagePreview}
                      </p>
                    </div>
                  </div>
                </div>
              </ConversationContextMenu>
            );
          })}
        </ScrollArea>
      )}
    </div>
  );
};
