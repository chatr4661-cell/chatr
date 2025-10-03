import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Phone, Video, ArrowLeft, MessageSquare, Search, MoreVertical, UserPlus, Users, Radio } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import VideoCall from '@/components/VideoCall';
import VoiceCall from '@/components/VoiceCall';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { formatDistanceToNow } from 'date-fns';

export default function ChatEnhanced() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<{ type: 'voice' | 'video'; conversationId: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('chats');
  const [recentChats, setRecentChats] = useState<any[]>([]);
  
  // Enable real-time notifications
  useRealtimeNotifications(user?.id);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadContacts();
      loadRecentChats();
      subscribeToPresence();
    }
  }, [user]);

  const loadUser = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      navigate('/auth');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single();

    setUser(profile);
  };

  const loadContacts = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .order('is_online', { ascending: false })
        .order('last_seen', { ascending: false })
        .limit(100);

      setContacts(profiles || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const loadRecentChats = async () => {
    try {
      // Get conversations with last message
      const { data: myConversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (myConversations) {
        const conversationIds = myConversations.map(c => c.conversation_id);
        
        const { data: conversations } = await supabase
          .from('conversations')
          .select(`
            *,
            conversation_participants!inner(
              user_id,
              profiles(*)
            )
          `)
          .in('id', conversationIds)
          .order('updated_at', { ascending: false });

        if (conversations) {
          // Get last message for each conversation
          const chatsWithMessages = await Promise.all(
            conversations.map(async (conv) => {
              const { data: lastMessage } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', conv.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

              const otherParticipant = conv.conversation_participants.find(
                (p: any) => p.user_id !== user.id
              );

              return {
                ...conv,
                lastMessage,
                otherUser: otherParticipant?.profiles
              };
            })
          );

          setRecentChats(chatsWithMessages);
        }
      }
    } catch (error: any) {
      console.error('Error loading chats:', error);
    }
  };

  const subscribeToPresence = () => {
    // Subscribe to profile updates for online status
    const channel = supabase
      .channel('presence-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          loadContacts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const startVoiceCall = async (contact: any) => {
    try {
      // Create or get conversation
      const conversation = await getOrCreateConversation(contact.id);
      
      // Create call record
      const { error } = await supabase
        .from('calls')
        .insert({
          conversation_id: conversation.id,
          caller_id: user.id,
          call_type: 'voice',
          status: 'ringing'
        });

      if (error) throw error;

      setActiveCall({ type: 'voice', conversationId: conversation.id });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to start call",
        variant: "destructive"
      });
    }
  };

  const startVideoCall = async (contact: any) => {
    try {
      const conversation = await getOrCreateConversation(contact.id);
      
      const { error } = await supabase
        .from('calls')
        .insert({
          conversation_id: conversation.id,
          caller_id: user.id,
          call_type: 'video',
          status: 'ringing'
        });

      if (error) throw error;

      setActiveCall({ type: 'video', conversationId: conversation.id });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to start video call",
        variant: "destructive"
      });
    }
  };

  const getOrCreateConversation = async (contactId: string) => {
    // Check for existing conversation
    const { data: myConversations } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (myConversations) {
      const { data: theirConversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', contactId)
        .in('conversation_id', myConversations.map(c => c.conversation_id));

      if (theirConversations && theirConversations.length > 0) {
        const { data: conversation } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', theirConversations[0].conversation_id)
          .single();
        return conversation;
      }
    }

    // Create new conversation
    const { data: newConversation } = await supabase
      .from('conversations')
      .insert({ created_by: user.id })
      .select()
      .single();

    await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: newConversation.id, user_id: user.id },
        { conversation_id: newConversation.id, user_id: contactId }
      ]);

    return newConversation;
  };

  const openChat = (contact: any) => {
    navigate('/chat', { state: { selectedContact: contact } });
  };

  if (activeCall?.type === 'video') {
    return (
      <VideoCall
        conversationId={activeCall.conversationId}
        isInitiator={true}
        onEnd={() => setActiveCall(null)}
      />
    );
  }

  if (activeCall?.type === 'voice' && selectedContact) {
    return (
      <VoiceCall
        conversationId={activeCall.conversationId}
        contactName={selectedContact.username}
        contactAvatar={selectedContact.avatar_url}
        isInitiator={true}
        onEnd={() => setActiveCall(null)}
      />
    );
  }

  const filteredContacts = contacts.filter(contact =>
    contact.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredChats = recentChats.filter(chat =>
    chat.otherUser?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage?.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-glass bg-gradient-glass border-b border-border shadow-card">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/")}
                className="h-8 w-8 p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-xl font-bold text-foreground">chatr+</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <UserPlus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages or contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card/50 border-border rounded-full"
            />
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-transparent border-b border-border rounded-none h-auto p-0">
            <TabsTrigger 
              value="chats" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
            >
              Chats
            </TabsTrigger>
            <TabsTrigger 
              value="status" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
            >
              Status
            </TabsTrigger>
            <TabsTrigger 
              value="contacts" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-3"
            >
              Contacts
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="overflow-y-auto">
        <Tabs value={activeTab} className="w-full">
          {/* Chats Tab */}
          <TabsContent value="chats" className="m-0 space-y-1">
            {filteredChats.length === 0 && (
              <div className="text-center py-12 px-4">
                <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No chats yet</p>
                <p className="text-sm text-muted-foreground">Start a conversation with your contacts</p>
              </div>
            )}
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => openChat(chat.otherUser)}
                className="flex items-center gap-3 p-4 hover:bg-accent/10 cursor-pointer transition-colors border-b border-border/50"
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={chat.otherUser?.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {chat.otherUser?.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {chat.otherUser?.is_online && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 bg-primary rounded-full border-2 border-background" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-foreground truncate">
                      {chat.otherUser?.username || 'Unknown'}
                    </h3>
                    {chat.lastMessage && (
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(chat.lastMessage.created_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {chat.lastMessage?.content || 'No messages yet'}
                  </p>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Status Tab */}
          <TabsContent value="status" className="m-0">
            <div className="p-4">
              <div className="text-center py-12">
                <Radio className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Status updates coming soon</p>
              </div>
            </div>
          </TabsContent>

          {/* Contacts Tab */}
          <TabsContent value="contacts" className="m-0 space-y-1">
            {filteredContacts.length === 0 && (
              <div className="text-center py-12 px-4">
                <Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No contacts found</p>
              </div>
            )}
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-3 p-4 hover:bg-accent/10 transition-colors border-b border-border/50"
              >
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={contact.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {contact.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {contact.is_online && (
                    <div className="absolute bottom-0 right-0 h-3 w-3 bg-primary rounded-full border-2 border-background" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate mb-1">
                    {contact.username}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {contact.is_online ? (
                      <span className="text-primary">Online</span>
                    ) : contact.last_seen ? (
                      `Last seen ${formatDistanceToNow(new Date(contact.last_seen), { addSuffix: true })}`
                    ) : (
                      'Offline'
                    )}
                  </p>
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openChat(contact)}
                    className="h-9 w-9 p-0 hover:bg-primary/10"
                  >
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedContact(contact);
                      startVoiceCall(contact);
                    }}
                    className="h-9 w-9 p-0 hover:bg-primary/10"
                  >
                    <Phone className="h-4 w-4 text-primary" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedContact(contact);
                      startVideoCall(contact);
                    }}
                    className="h-9 w-9 p-0 hover:bg-primary/10"
                  >
                    <Video className="h-4 w-4 text-primary" />
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}