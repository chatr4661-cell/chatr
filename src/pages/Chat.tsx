import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NetworkStatus } from '@/components/NetworkStatus';
import { useChatContext, ChatProvider } from '@/contexts/ChatContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Phone, Video, MoreVertical, User, Users, Search, QrCode, UserX, Radio, Sparkles, Heart, Menu } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VirtualizedConversationList } from '@/components/chat/VirtualizedConversationList';
import { VirtualMessageList } from '@/components/chat/VirtualMessageList';
import { EnhancedMessageInput } from '@/components/chat/EnhancedMessageInput';
import { useOptimizedMessages } from '@/hooks/useOptimizedMessages';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ClusterCreator } from '@/components/chat/ClusterCreator';
import { PulseCreator } from '@/components/chat/PulseCreator';
import { VoiceInterface } from '@/components/voice/VoiceInterface';
import { EmotionCircleMatch } from '@/components/EmotionCircleMatch';
import { LiveRooms } from '@/components/LiveRooms';
import { AIMoments } from '@/components/AIMoments';
import { useMoodTracking } from '@/hooks/useMoodTracking';
import { useStreakTracking } from '@/hooks/useStreakTracking';

const ChatEnhancedContent = () => {
  const { user, session } = useChatContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showClusterCreator, setShowClusterCreator] = useState(false);
  const [showPulseCreator, setShowPulseCreator] = useState(false);
  const [showAIFeatures, setShowAIFeatures] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const { streak } = useStreakTracking('ai_chat');
  
  // Optimized message handling with batching and pagination
  const { messages, sendMessage, loadMessages, isLoading: messagesLoading, hasMore } = useOptimizedMessages(
    activeConversationId,
    user?.id || ''
  );
  
  // Enable push notifications only if user ID exists
  usePushNotifications(user?.id || undefined);

  // Clear active conversation on mount to always show conversation list
  useEffect(() => {
    setActiveConversationId(null);
    setOtherUser(null);
  }, []);

  // Optimized contact loading
  useEffect(() => {
    if (!user?.id) return;

    const loadContacts = async () => {
      const { data } = await supabase
        .from('contacts')
        .select('contact_user_id, contact_name, contact_phone')
        .eq('user_id', user.id)
        .eq('is_registered', true)
        .not('contact_user_id', 'is', null);

      if (!data?.length) {
        setContacts([]);
        return;
      }

      // Batch fetch all profiles at once
      const userIds = data.map(c => c.contact_user_id).filter(Boolean);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, phone_number')
        .in('id', userIds);

      if (!profiles) {
        setContacts([]);
        return;
      }

      // Map profiles efficiently
      const profileMap = new Map(profiles.map(p => [p.id, p]));
      const contactProfiles = data
        .map(contact => {
          const profile = profileMap.get(contact.contact_user_id!);
          return profile ? {
            id: profile.id,
            username: profile.username || contact.contact_name,
            avatar_url: profile.avatar_url,
            phone_number: profile.phone_number || contact.contact_phone
          } : null;
        })
        .filter(Boolean);

      setContacts(contactProfiles);
    };

    loadContacts();
  }, [user?.id]);

  // Check authentication and verify user data
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }
      
      setLoading(false);
    };
    
    checkAuth();
  }, [navigate]);

  // Redirect if not authenticated - wait for context to initialize
  useEffect(() => {
    if (!session && user === null) {
      // Only redirect if we're sure there's no session (not just loading)
      const timer = setTimeout(() => {
        if (!session) {
          navigate('/auth');
        }
      }, 1000); // Give ChatProvider time to initialize
      return () => clearTimeout(timer);
    }
  }, [session, user, navigate]);

  const handleStartConversation = async (contact: any) => {
    try {
      const contactUserId = contact.contact_user_id || contact.id;
      
      // First, ensure they're in our contacts
      await supabase
        .from('contacts')
        .upsert({
          user_id: user!.id,
          contact_name: contact.contact_name || contact.username,
          contact_phone: contact.email || contact.phone_number || '',
          contact_user_id: contactUserId,
          is_registered: true
        }, {
          onConflict: 'user_id,contact_phone'
        });

      // Call the create_direct_conversation function
      const { data, error } = await supabase.rpc('create_direct_conversation', {
        other_user_id: contactUserId
      });

      if (error) throw error;

      setActiveConversationId(data);
      setOtherUser({
        id: contactUserId,
        username: contact.contact_name || contact.username,
        avatar_url: contact.avatar_url
      });
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to start conversation');
    }
  };

  // Handle contact selected from location state
  useEffect(() => {
    const selectedContact = (location.state as any)?.selectedContact;
    if (selectedContact && user) {
      handleStartConversation(selectedContact);
    }
  }, [location.state, user]);

  const handleConversationSelect = (conversationId: string, user?: any) => {
    setActiveConversationId(conversationId);
    setOtherUser(user);
  };

  const handleSendMessage = async (content: string, type?: string, mediaUrl?: string) => {
    if (!activeConversationId) return;
    try {
      await sendMessage(content, type, mediaUrl);
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  // Load messages when conversation changes - limit initial load
  useEffect(() => {
    if (activeConversationId) {
      loadMessages(30, 0); // Load only last 30 messages initially
    }
  }, [activeConversationId, loadMessages]);

  const handleStartCall = async (callType: 'voice' | 'video') => {
    if (!activeConversationId || !otherUser) {
      toast.error('Please select a conversation first');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('calls')
        .insert({
          conversation_id: activeConversationId,
          caller_id: user!.id,
          receiver_id: otherUser.id,
          call_type: callType,
          status: 'ringing'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(`${callType === 'voice' ? 'Voice' : 'Video'} call started`);
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
    }
  };

  if (loading || !user?.id) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <NetworkStatus />
      
      {activeConversationId ? (
        // Conversation View
        <>
          {/* Header */}
          <div className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-lg p-3 md:p-4 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setActiveConversationId(null);
                  setOtherUser(null);
                }}
                className="rounded-full shrink-0 h-10 w-10"
              >
                <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              
              {otherUser && (
                <>
                  <Avatar className="w-9 h-9 md:w-10 md:h-10 shrink-0">
                    <AvatarImage src={otherUser.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {otherUser.username?.[0]?.toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-base md:text-base truncate">{otherUser.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {otherUser.is_online ? 'Online' : 'Offline'}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-1 md:gap-2 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleStartCall('voice')}
                className="rounded-full h-9 w-9 md:h-10 md:w-10"
              >
                <Phone className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleStartCall('video')}
                className="rounded-full h-9 w-9 md:h-10 md:w-10"
              >
                <Video className="h-4 w-4 md:h-5 md:w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-9 w-9 md:h-10 md:w-10"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <VirtualMessageList
              messages={messages}
              userId={user.id}
              otherUser={otherUser}
              onLoadMore={() => loadMessages(20, messages.length)}
              hasMore={hasMore}
              isLoading={messagesLoading}
            />
          </div>

          {/* Input */}
          <EnhancedMessageInput
            onSendMessage={handleSendMessage}
            disabled={messagesLoading}
            lastMessage={messages.length > 0 && messages[messages.length - 1].sender_id !== user.id 
              ? messages[messages.length - 1].content 
              : undefined}
          />
        </>
      ) : (
        // Conversation List View
        <>
          {/* Header */}
          <div className="border-b bg-card/95 backdrop-blur-xl p-3 transition-all duration-300">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              {/* Left: Logo */}
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  chatr
                </h1>
              </div>
              
              {/* Right: Action Icons - Streamlined */}
              <div className="flex items-center gap-1.5">
                {/* AI Features */}
                <Sheet open={showAIFeatures} onOpenChange={setShowAIFeatures}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-10 w-10 hover:bg-primary/10 hover:text-primary relative transition-all duration-200 hover:scale-110"
                      title="AI Features"
                    >
                      <Sparkles className="h-5 w-5" />
                      {streak > 0 && (
                        <span className="absolute -top-1 -right-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg animate-pulse">
                          {streak}
                        </span>
                      )}
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        AI Features
                      </SheetTitle>
                    </SheetHeader>
                    <Tabs defaultValue="voice" className="mt-6">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="voice">Voice AI</TabsTrigger>
                        <TabsTrigger value="connect">Connect</TabsTrigger>
                        <TabsTrigger value="moments">Moments</TabsTrigger>
                      </TabsList>
                      <TabsContent value="voice" className="space-y-4 mt-4">
                        <div className="text-sm text-muted-foreground mb-4">
                          Talk to your AI friend powered by OpenAI Realtime
                        </div>
                        <VoiceInterface />
                      </TabsContent>
                      <TabsContent value="connect" className="space-y-4 mt-4">
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-semibold mb-2 flex items-center gap-2">
                              <Heart className="h-4 w-4 text-pink-500" />
                              Circle AI Matching
                            </h3>
                            <EmotionCircleMatch />
                          </div>
                          <div className="mt-6">
                            <h3 className="font-semibold mb-2 flex items-center gap-2">
                              <Radio className="h-4 w-4 text-purple-500" />
                              Live Rooms
                            </h3>
                            <LiveRooms />
                          </div>
                        </div>
                      </TabsContent>
                      <TabsContent value="moments" className="space-y-4 mt-4">
                        <AIMoments />
                      </TabsContent>
                    </Tabs>
                  </SheetContent>
                </Sheet>

                {/* Create Group/Cluster */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowClusterCreator(true)}
                  className="rounded-full h-10 w-10 hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
                  title="Create Group"
                >
                  <Users className="h-5 w-5" />
                </Button>

                {/* Send Pulse */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPulseCreator(true)}
                  className="rounded-full h-10 w-10 hover:bg-amber-500/10 hover:text-amber-600 transition-all duration-200 hover:scale-110"
                  title="Send Pulse"
                >
                  <Radio className="h-5 w-5" />
                </Button>

                {/* Search */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/global-contacts')}
                  className="rounded-full h-10 w-10 hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
                  title="Search"
                >
                  <Search className="h-5 w-5" />
                </Button>

                {/* More Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-10 w-10 hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-110"
                      title="More"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 animate-in fade-in-50 slide-in-from-top-2">
                    <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/contacts')} className="cursor-pointer">
                      <Users className="h-4 w-4 mr-2" />
                      Contacts
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/call-history')} className="cursor-pointer">
                      <Phone className="h-4 w-4 mr-2" />
                      Call History
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/qr-login')} className="cursor-pointer">
                      <QrCode className="h-4 w-4 mr-2" />
                      QR Scanner
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
                      <UserX className="h-4 w-4 mr-2" />
                      Blocked
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/')} className="cursor-pointer">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Home
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-hidden">
            <VirtualizedConversationList
              userId={user.id}
              onConversationSelect={handleConversationSelect}
            />
          </div>
        </>
      )}

      {/* Cluster Creator Dialog */}
      <ClusterCreator
        open={showClusterCreator}
        onOpenChange={setShowClusterCreator}
        contacts={contacts}
        userId={user.id}
        onClusterCreated={(clusterId) => {
          setActiveConversationId(clusterId);
          setShowClusterCreator(false);
        }}
      />

      {/* Pulse Creator Dialog */}
      <PulseCreator
        open={showPulseCreator}
        onOpenChange={setShowPulseCreator}
        contacts={contacts}
        userId={user.id}
        onPulseSent={() => {
          setShowPulseCreator(false);
        }}
      />
      
      {/* Voice AI Interface - Always available */}
      <VoiceInterface />
    </div>
  );
};

export default function ChatEnhanced() {
  return (
    <ErrorBoundary>
      <ChatProvider>
        <ChatEnhancedContent />
      </ChatProvider>
    </ErrorBoundary>
  );
}
