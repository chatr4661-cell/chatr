import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NetworkStatus } from '@/components/NetworkStatus';
import { ProductionCallNotifications } from '@/components/calling/ProductionCallNotifications';
import { useChatContext, ChatProvider } from '@/contexts/ChatContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Phone, Video, MoreVertical, User, Users, Search, QrCode, UserX, Radio, Sparkles, Heart, Menu, Send, Share2, Bell, Globe, Zap, Megaphone, Smartphone, Settings, Wifi, WifiOff } from 'lucide-react';
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
import { GroupChatCreator } from '@/components/GroupChatCreator';
import { DisappearingMessagesDialog } from '@/components/DisappearingMessagesDialog';
import { BroadcastCreator } from '@/components/BroadcastCreator';
import { VoiceInterface } from '@/components/voice/VoiceInterface';
import { EmotionCircleMatch } from '@/components/EmotionCircleMatch';
import { LiveRooms } from '@/components/LiveRooms';
import { AIMoments } from '@/components/AIMoments';
import { useMoodTracking } from '@/hooks/useMoodTracking';
import { useStreakTracking } from '@/hooks/useStreakTracking';
import logo from '@/assets/chatr-logo.png';
import GlobalSearch from '@/components/GlobalSearch';
import { Badge } from '@/components/ui/badge';

const ChatEnhancedContent = () => {
  const { user, session } = useChatContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null);
  const [otherUser, setOtherUser] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [showClusterCreator, setShowClusterCreator] = React.useState(false);
  const [showPulseCreator, setShowPulseCreator] = React.useState(false);
  const [showAIFeatures, setShowAIFeatures] = React.useState(false);
  const [showGroupCreator, setShowGroupCreator] = React.useState(false);
  const [showBroadcastCreator, setShowBroadcastCreator] = React.useState(false);
  const [showDisappearingSettings, setShowDisappearingSettings] = React.useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = React.useState(false);
  const [contacts, setContacts] = React.useState<any[]>([]);
  const [profile, setProfile] = React.useState<any>(null);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [notificationCount, setNotificationCount] = React.useState(0);
  const { streak } = useStreakTracking('ai_chat');
  
  // Optimized message handling with batching and pagination
  const { messages, sendMessage, loadMessages, isLoading: messagesLoading, hasMore } = useOptimizedMessages(
    activeConversationId,
    user?.id || ''
  );
  
  // Enable push notifications only if user ID exists
  usePushNotifications(user?.id || undefined);

  // Load user profile
  React.useEffect(() => {
    if (!user?.id) return;
    
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();
      
      setProfile(data);
    };
    
    loadProfile();
  }, [user?.id]);

  // Monitor online status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load notification count
  React.useEffect(() => {
    if (!user?.id) return;
    
    const loadNotifications = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);
      
      setNotificationCount(count || 0);
    };
    
    loadNotifications();
    
    // Subscribe to new notifications
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, () => {
        loadNotifications();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Clear active conversation on mount - removed to improve performance
  // Users will see conversation list immediately

  // Optimized contact loading - deferred for performance
  React.useEffect(() => {
    if (!user?.id) return;

    // Defer contact loading to not block initial render
    const timeoutId = setTimeout(() => {
      const loadContacts = async () => {
        const { data } = await supabase
          .from('contacts')
          .select('contact_user_id, contact_name, contact_phone')
          .eq('user_id', user.id)
          .eq('is_registered', true)
          .not('contact_user_id', 'is', null)
          .limit(50); // Limit for performance

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
    }, 100); // Small delay to prioritize UI render

    return () => clearTimeout(timeoutId);
  }, [user?.id]);

  // Fast auth check - non-blocking
  React.useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
      } else {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [navigate]);

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
  React.useEffect(() => {
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
      // Extended sendMessage to handle media URLs
      await supabase.from('messages').insert({
        conversation_id: activeConversationId,
        sender_id: user!.id,
        content,
        message_type: type || 'text',
        media_url: mediaUrl
      });
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  // Load messages when conversation changes - optimized batch size
  React.useEffect(() => {
    if (activeConversationId) {
      loadMessages(50, 0); // Load 50 messages for smoother scrolling
    }
  }, [activeConversationId, loadMessages]);

  const handleStartCall = async (callType: 'voice' | 'video') => {
    if (!activeConversationId || !otherUser) {
      toast.error('Please select a conversation first');
      return;
    }

    try {
      console.log('🎥 Starting call:', { callType, to: otherUser.username });
      
      // Get current user profile for caller name
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user!.id)
        .single();

      const { data, error } = await supabase
        .from('calls')
        .insert({
          conversation_id: activeConversationId,
          caller_id: user!.id,
          caller_name: profile?.username || user!.email || 'Unknown',
          caller_avatar: profile?.avatar_url,
          receiver_id: otherUser.id,
          receiver_name: otherUser.username || otherUser.email || 'Unknown',
          receiver_avatar: otherUser.avatar_url,
          call_type: callType,
          status: 'ringing'
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to create call:', error);
        throw error;
      }

      console.log('✅ Call created successfully:', data.id);
      toast.success(`${callType === 'voice' ? 'Voice' : 'Video'} call started`);
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
    }
  };

  // Show loading only during initial check
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  // If no user after loading, redirect will handle it
  if (!user?.id) {
    return null;
  }

  return (
    <>
      {/* Call Notifications - CRITICAL: This handles ALL calls */}
      {user && profile && (
        <ProductionCallNotifications 
          userId={user.id} 
          username={profile.username || user.email || 'User'} 
        />
      )}

      <div className="flex flex-col h-screen bg-background">
      <NetworkStatus />
      
      {activeConversationId ? (
        // Conversation View
        <>
          {/* Header - Clean WhatsApp-style */}
          <div className="sticky top-0 z-10 border-b bg-white/95 backdrop-blur-sm px-3 py-2.5 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setActiveConversationId(null);
                setOtherUser(null);
              }}
              className="h-9 w-9 rounded-full hover:bg-muted/50"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            
            {otherUser && (
              <>
                <Avatar className="w-10 h-10 shrink-0">
                  <AvatarImage src={otherUser.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/20 text-primary">
                    {otherUser.username?.[0]?.toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[15px] truncate">{otherUser.username}</p>
                  <p className="text-[12px] text-muted-foreground">
                    {otherUser.is_online ? 'Online' : 'Offline'}
                  </p>
                </div>
              </>
            )}

            <div className="flex items-center gap-1 shrink-0 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleStartCall('voice')}
                className="h-9 w-9 rounded-full hover:bg-muted/50"
                title="Voice Call"
              >
                <Phone className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleStartCall('video')}
                className="h-9 w-9 rounded-full hover:bg-muted/50"
                title="Video Call"
              >
                <Video className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowAIFeatures(true)}
                className="h-9 w-9 rounded-full hover:bg-muted/50"
                title="AI Features"
              >
                <Sparkles className="h-5 w-5 text-primary" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full hover:bg-muted/50"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowDisappearingSettings(true)}>
                    Disappearing Messages
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    View Profile
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-hidden">
            <VirtualMessageList
              messages={messages}
              userId={user.id}
              otherUser={otherUser}
              onLoadMore={() => loadMessages(30, messages.length)}
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
          {/* Clean Header - Exact October 6th Design */}
          <div className="sticky top-0 z-10 border-b border-border/30 bg-white">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/')}
                  className="h-10 w-10 rounded-full hover:bg-accent/50 transition-colors"
                  title="Back"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                
                <img 
                  src="/chatr-logo.png" 
                  alt="chatr" 
                  className="h-7 w-7"
                />
                
                {/* Status Badge */}
                <div className="flex items-center gap-1.5 ml-1">
                  {isOnline ? (
                    <><Wifi className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs text-emerald-600 font-medium">Online</span></>
                  ) : (
                    <><WifiOff className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs text-amber-600 font-medium">Offline</span></>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/profile')}
                  className="h-10 w-10 rounded-full hover:bg-accent/50 transition-colors"
                  title="Profile"
                >
                  <User className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowGroupCreator(true)}
                  className="h-10 w-10 rounded-full hover:bg-accent/50 transition-colors"
                  title="Create Group"
                >
                  <Users className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowGlobalSearch(true)}
                  className="h-10 w-10 rounded-full hover:bg-accent/50 transition-colors"
                  title="Search"
                >
                  <Search className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/notifications')}
                  className="h-10 w-10 rounded-full hover:bg-accent/50 transition-colors relative"
                  title="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-[10px] bg-red-500 border-2 border-white">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Badge>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/call-history')}
                  className="h-10 w-10 rounded-full hover:bg-accent/50 transition-colors"
                  title="Call History"
                >
                  <Phone className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/qr-login')}
                  className="h-10 w-10 rounded-full hover:bg-accent/50 transition-colors"
                  title="QR Code"
                >
                  <QrCode className="h-5 w-5" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => {
                    const shareData = {
                      title: 'chatr',
                      text: 'Join me on chatr - secure messaging and calling!',
                      url: window.location.origin
                    };
                    if (navigator.share) {
                      navigator.share(shareData);
                    } else {
                      navigator.clipboard.writeText(window.location.origin);
                      toast.success('Link copied to clipboard!');
                    }
                  }}
                  className="h-10 w-10 rounded-full hover:bg-accent/50 transition-colors"
                  title="Share chatr"
                >
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* AI Features Sheet */}
          <Sheet open={showAIFeatures} onOpenChange={setShowAIFeatures}>
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

      {/* Group Chat Creator */}
      <GroupChatCreator
        open={showGroupCreator}
        onOpenChange={setShowGroupCreator}
        contacts={contacts}
        userId={user.id}
        onGroupCreated={(groupId) => {
          setActiveConversationId(groupId);
          setShowGroupCreator(false);
        }}
      />

      {/* Broadcast Creator */}
      <BroadcastCreator
        open={showBroadcastCreator}
        onOpenChange={setShowBroadcastCreator}
        contacts={contacts}
        userId={user.id}
      />

      {/* Disappearing Messages Settings */}
      {activeConversationId && showDisappearingSettings && (
        <DisappearingMessagesDialog
          conversationId={activeConversationId}
          onUpdate={(duration) => {
            toast.success(duration ? 'Disappearing messages enabled' : 'Disappearing messages disabled');
            setShowDisappearingSettings(false);
          }}
        />
      )}
      
      {/* Global Search */}
      <GlobalSearch
        open={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        onNavigate={navigate}
        currentUserId={user?.id}
      />
      
      {/* Voice AI Interface - Always available */}
      <VoiceInterface />
      </div>
    </>
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
