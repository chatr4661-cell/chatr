import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NetworkStatus } from '@/components/NetworkStatus';
import { ProductionCallNotifications } from '@/components/calling/ProductionCallNotifications';
import { useChatContext, ChatProvider } from '@/contexts/ChatContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useChatPushNotifications } from '@/hooks/useChatPushNotifications';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Phone, Video, MoreVertical, User, Users, Search, QrCode, UserX, Radio, Sparkles, Heart, Menu, Send, Share2, Bell, Globe, Zap, Megaphone, Smartphone, Settings, Wifi, WifiOff, Bluetooth, Info, Trash, Star } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VirtualizedConversationList } from '@/components/chat/VirtualizedConversationList';
import { TrueVirtualMessageList } from '@/components/chat/TrueVirtualMessageList';
import { WhatsAppStyleInput } from '@/components/chat/WhatsAppStyleInput';
import { MessageForwardDialog } from '@/components/chat/MessageForwardDialog';
import { MessageReportDialog } from '@/components/chat/MessageReportDialog';
import { MessageSearchBar } from '@/components/MessageSearchBar';
import { PinnedMessagesViewer } from '@/components/chat/PinnedMessagesViewer';
import { MessageFilters } from '@/components/chat/MessageFilters';
import { useVirtualizedMessages } from "@/hooks/useVirtualizedMessages";
import { AddParticipantDialog } from '@/components/chat/AddParticipantDialog';
import { useNetworkQuality } from "@/hooks/useNetworkQuality";
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
import { AIChatToolbar } from '@/components/chat/AIChatToolbar';
import { AIInsightsPanel } from '@/components/chat/AIInsightsPanel';
import { SmartRepliesPanel } from '@/components/chat/SmartRepliesPanel';
import { useAIChatAssistant } from '@/hooks/useAIChatAssistant';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { OfflineChat } from '@/components/OfflineChat';
import { UserInfoSidebar } from '@/components/UserInfoSidebar';
import { UnifiedPermissionsSetup } from '@/components/UnifiedPermissionsSetup';

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
  const networkQuality = useNetworkQuality();
  const [showOfflineMode, setShowOfflineMode] = React.useState(false);
  const [messageToForward, setMessageToForward] = React.useState<any>(null);
  const [showForwardDialog, setShowForwardDialog] = React.useState(false);
  const [showContactInfo, setShowContactInfo] = React.useState(false);
  const [showMessageSearch, setShowMessageSearch] = React.useState(false);
  const [searchResultMessageId, setSearchResultMessageId] = React.useState<string | null>(null);
  const [messageFilter, setMessageFilter] = React.useState<'all' | 'media' | 'links' | 'documents' | 'location'>('all');
  
  // Selection Mode State
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [selectedMessages, setSelectedMessages] = React.useState<Set<string>>(new Set());
  
  // AI Features State
  const [showSmartReplies, setShowSmartReplies] = React.useState(false);
  const [showSummary, setShowSummary] = React.useState(false);
  const [showInsights, setShowInsights] = React.useState(false);
  const [insightsType, setInsightsType] = React.useState<'sentiment' | 'topics' | 'urgency' | 'language'>('sentiment');
  
  const {
    loading: aiLoading,
    summary,
    smartReplies,
    insights,
    generateSummary,
    generateSmartReplies,
    analyzeMessages,
    clearSummary,
    clearSmartReplies,
    clearInsights
  } = useAIChatAssistant();
  
  const [showAddParticipant, setShowAddParticipant] = React.useState(false);
  const [conversationParticipants, setConversationParticipants] = React.useState<string[]>([]);
  
  // Error boundary for chat to prevent crashes
  const [chatError, setChatError] = React.useState<Error | null>(null);
  
  // Use virtualized messages hook - WhatsApp-style performance
  const { 
    messages: displayMessages, 
    sendMessage,
    loadMessages,
    loadOlderMessages,
    hasMore,
    isLoading: messagesLoading, 
    sending,
    deleteMessage,
    editMessage,
    reactToMessage
  } = useVirtualizedMessages(
    activeConversationId,
    user?.id || ''
  );
  
  // Enable push notifications only if user ID exists
  usePushNotifications(user?.id || undefined);
  
  // Enable WhatsApp-style chat push notifications
  useChatPushNotifications({ 
    userId: user?.id || '', 
    activeConversationId 
  });
  
  // Enable realtime notifications with sound
  useRealtimeNotifications(user?.id);

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

  // Auto-sync contacts on login and load registered contacts
  React.useEffect(() => {
    if (!user?.id) return;

    const syncAndLoadContacts = async () => {
      try {
        // Auto-sync contacts from phone (native only)
        const { Capacitor } = await import('@capacitor/core');
        const isNative = Capacitor.isNativePlatform();
        
        if (isNative) {
          console.log('🔄 Auto-syncing contacts on login...');
          const { Contacts } = await import('@capacitor-community/contacts');
          
          try {
            const permission = await Contacts.requestPermissions();
            
            if (permission.contacts === 'granted') {
              const result = await Contacts.getContacts({
                projection: { name: true, phones: true }
              });

              if (result?.contacts?.length) {
                // Hash phone numbers and sync
                const phoneHashes = new Set<string>();
                const contactsMap = new Map();

                for (const contact of result.contacts) {
                  const phone = contact.phones?.[0]?.number;
                  if (phone) {
                    const normalized = phone.replace(/\D/g, '');
                    const fullPhone = normalized.length === 10 ? `+91${normalized}` : `+${normalized}`;
                    const msgBuffer = new TextEncoder().encode(normalized);
                    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                    
                    phoneHashes.add(hash);
                    contactsMap.set(hash, {
                      name: contact.name?.display || 'Unknown',
                      phone: fullPhone,
                      hash
                    });
                  }
                }

                // Find registered users
                const { data: registeredProfiles } = await supabase
                  .from('profiles')
                  .select('id, username, phone_number, phone_hash')
                  .in('phone_hash', Array.from(phoneHashes))
                  .not('phone_hash', 'is', null);

                // Upsert contacts
                const contactsToUpsert = Array.from(contactsMap.values()).map(contact => {
                  const registered = registeredProfiles?.find(p => p.phone_hash === contact.hash);
                  return {
                    user_id: user.id,
                    contact_name: contact.name,
                    contact_phone: contact.phone,
                    contact_phone_hash: contact.hash,
                    is_registered: !!registered,
                    contact_user_id: registered?.id || null
                  };
                });

                if (contactsToUpsert.length > 0) {
                  await supabase.from('contacts').upsert(contactsToUpsert, {
                    onConflict: 'user_id,contact_phone',
                    ignoreDuplicates: false
                  });
                }

                await supabase.from('profiles').update({ 
                  contacts_synced: true,
                  last_contact_sync: new Date().toISOString()
                }).eq('id', user.id);

                console.log(`✅ Synced ${contactsToUpsert.length} contacts (${registeredProfiles?.length || 0} on platform)`);
              }
            }
          } catch (err) {
            console.log('Contact sync skipped:', err);
          }
        }

        // Load registered contacts for display
        const { data } = await supabase
          .from('contacts')
          .select('contact_user_id, contact_name, contact_phone')
          .eq('user_id', user.id)
          .eq('is_registered', true)
          .not('contact_user_id', 'is', null)
          .limit(50);

        if (!data?.length) {
          setContacts([]);
          return;
        }

        const userIds = data.map(c => c.contact_user_id).filter(Boolean);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, phone_number')
          .in('id', userIds);

        if (!profiles) {
          setContacts([]);
          return;
        }

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
      } catch (error) {
        console.error('Error syncing contacts:', error);
        setContacts([]);
      }
    };

    syncAndLoadContacts();
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

  const handleSendMessage = async (content: string, type?: string, mediaAttachments?: any[]) => {
    if (!activeConversationId) return;
    try {
      await sendMessage(content, type, mediaAttachments);
    } catch (error) {
      console.error('Send failed:', error);
      toast.error('Failed to send message');
    }
  };

  const handleForwardMessage = (message: any) => {
    setMessageToForward(message);
    setShowForwardDialog(true);
  };

  const handleStarMessage = async (messageId: string) => {
    try {
      if (!user?.id) return;

      // Check if already starred
      const { data: existing } = await supabase
        .from('starred_messages')
        .select('id')
        .eq('user_id', user.id)
        .eq('message_id', messageId)
        .maybeSingle();

      if (existing) {
        // Unstar
        const { error } = await supabase
          .from('starred_messages')
          .delete()
          .eq('user_id', user.id)
          .eq('message_id', messageId);

        if (error) throw error;
        toast.success('Message unstarred');
      } else {
        // Star
        const { error } = await supabase
          .from('starred_messages')
          .insert({
            user_id: user.id,
            message_id: messageId,
            conversation_id: activeConversationId!,
          });

        if (error) throw error;
        toast.success('Message starred');
      }
      
      // Reload messages to reflect the change
      await loadMessages();
    } catch (error) {
      console.error('Star error:', error);
      toast.error('Failed to update message');
    }
  };

  const [replyToMessage, setReplyToMessage] = React.useState<any>(null);
  const [showReportDialog, setShowReportDialog] = React.useState(false);
  const [messageToReport, setMessageToReport] = React.useState<any>(null);

  const handleReplyMessage = (message: any) => {
    setReplyToMessage(message);
  };

  const cancelReply = () => {
    setReplyToMessage(null);
  };

  const handlePinMessage = async (messageId: string) => {
    try {
      if (!user?.id || !activeConversationId) return;

      // Check if already pinned
      const { data: existing } = await supabase
        .from('pinned_messages')
        .select('id')
        .eq('conversation_id', activeConversationId)
        .eq('message_id', messageId)
        .maybeSingle();

      if (existing) {
        // Unpin
        const { error } = await supabase
          .from('pinned_messages')
          .delete()
          .eq('conversation_id', activeConversationId)
          .eq('message_id', messageId);

        if (error) throw error;
        toast.success('Message unpinned');
      } else {
        // Check pin limit (max 3)
        const { data: pinnedCount } = await supabase
          .from('pinned_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', activeConversationId);

        if (pinnedCount && (pinnedCount as any).count >= 3) {
          toast.error('Maximum 3 messages can be pinned per chat');
          return;
        }

        // Pin
        const { error } = await supabase
          .from('pinned_messages')
          .insert({
            conversation_id: activeConversationId,
            message_id: messageId,
            pinned_by: user.id,
          });

        if (error) throw error;
        toast.success('Message pinned');
      }
      
      // Reload messages
      await loadMessages();
    } catch (error) {
      console.error('Pin error:', error);
      toast.error('Failed to update message');
    }
  };

  const handleReportMessage = (message: any) => {
    setMessageToReport(message);
    setShowReportDialog(true);
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const message = displayMessages.find(m => m.id === messageId);
      if (!message) return;

      // Check if message is within 2 minutes window (for non-owners)
      const messageTime = new Date(message.created_at).getTime();
      const now = Date.now();
      const twoMinutes = 2 * 60 * 1000;
      const canDelete = message.sender_id === user?.id && (now - messageTime) <= twoMinutes;

      if (!canDelete && message.sender_id === user?.id) {
        toast.error('Messages can only be deleted within 2 minutes');
        return;
      }

      // Soft delete
      const { error } = await supabase
        .from('messages')
        .update({ 
          is_deleted: true, 
          deleted_at: new Date().toISOString(),
          content: '' // Clear content for privacy
        })
        .eq('id', messageId);

      if (error) throw error;
      
      await loadMessages();
      toast.success('Message deleted');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string) => {
    try {
      await editMessage(messageId, newContent);
      toast.success('Message updated');
    } catch (error) {
      console.error('Error editing message:', error);
      toast.error('Failed to edit message');
    }
  };

  const handleSelectMessage = (messageId: string) => {
    setSelectedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const handleDeleteSelected = async () => {
    try {
      for (const msgId of selectedMessages) {
        await deleteMessage(msgId);
      }
      toast.success(`Deleted ${selectedMessages.size} message${selectedMessages.size > 1 ? 's' : ''}`);
      setSelectedMessages(new Set());
      setSelectionMode(false);
    } catch (error) {
      toast.error('Failed to delete messages');
    }
  };

  const handleForwardSelected = () => {
    const messagesToForward = displayMessages.filter(m => selectedMessages.has(m.id));
    if (messagesToForward.length > 0) {
      setMessageToForward(messagesToForward[0]);
      setShowForwardDialog(true);
    }
  };

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedMessages(new Set());
  };

  // Load messages when conversation changes - handled by hook
  React.useEffect(() => {
    if (activeConversationId) {
      loadConversationParticipants(activeConversationId);
    }
  }, [activeConversationId]);
  
  const loadConversationParticipants = async (convId: string) => {
    const { data } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('conversation_id', convId);
    
    setConversationParticipants(data?.map(p => p.user_id) || []);
  };

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

  // Show offline mode if enabled
  if (showOfflineMode) {
    return (
      <div className="relative h-screen bg-background">
        <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between bg-card/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowOfflineMode(false)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Online Chat
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <Bluetooth className="w-3 h-3" />
              Bluetooth Mode Active
            </Badge>
            <Badge variant="outline" className="gap-1">
              <WifiOff className="w-3 h-3" />
              No Internet Required
            </Badge>
          </div>
        </div>
        <div className="pt-20 h-full">
          <OfflineChat />
        </div>
      </div>
    );
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

      <div className="flex flex-col h-screen bg-background overflow-hidden">
      <NetworkStatus />
      
      {activeConversationId ? (
        // Conversation View
        <>
          {/* Header - Clean WhatsApp-style */}
          <div data-chat-container className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur-sm px-3 py-2 flex items-center gap-2">
            {selectionMode ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={exitSelectionMode}
                  className="h-8 w-8 rounded-full"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="font-medium text-sm flex-1">{selectedMessages.size} selected</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleForwardSelected}
                    disabled={selectedMessages.size === 0}
                    className="h-8 w-8 rounded-full"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleDeleteSelected}
                    disabled={selectedMessages.size === 0}
                    className="h-8 w-8 rounded-full text-destructive"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setActiveConversationId(null);
                    setOtherUser(null);
                  }}
                  className="h-8 w-8 rounded-full hover:bg-muted/50"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                
                {otherUser && (
                  <button 
                    onClick={() => setShowContactInfo(true)}
                    className="flex items-center gap-2 flex-1 min-w-0 hover:bg-muted/30 rounded-lg p-1 -m-1 transition-colors"
                  >
                    <Avatar className="w-8 h-8 shrink-0">
                      <AvatarImage src={otherUser.avatar_url} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/20 text-primary text-xs">
                        {otherUser.username?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="font-semibold text-xs truncate">{otherUser.username}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {otherUser.is_online ? 'Online' : 'Offline'}
                      </p>
                    </div>
                  </button>
                )}

              <MessageFilters
                activeFilter={messageFilter}
                onFilterChange={setMessageFilter}
                counts={{
                  media: displayMessages.filter(m => m.message_type === 'image' || m.message_type === 'video').length,
                  links: displayMessages.filter(m => m.content?.includes('http')).length,
                  documents: displayMessages.filter(m => m.message_type === 'document').length,
                  location: displayMessages.filter(m => m.message_type === 'location').length,
                }}
              />
                <div className="flex items-center gap-0.5 shrink-0 ml-auto">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowMessageSearch(!showMessageSearch)}
                className="h-8 w-8 rounded-full hover:bg-muted/50"
                title="Search messages"
              >
                <Search className="h-4 w-4" />
              </Button>
              {conversationParticipants.length > 0 && conversationParticipants.length < 5 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowAddParticipant(true)}
                  className="h-8 w-8 rounded-full hover:bg-muted/50"
                  title="Add Participant"
                >
                  <Users className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleStartCall('voice')}
                className="h-8 w-8 rounded-full hover:bg-muted/50"
                title="Voice Call"
              >
                <Phone className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleStartCall('video')}
                className="h-8 w-8 rounded-full hover:bg-muted/50"
                title="Video Call"
              >
                <Video className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowOfflineMode(true)}
                className="h-8 w-8 rounded-full hover:bg-muted/50"
                title="Bluetooth Mode"
              >
                <Bluetooth className="h-5 w-5" />
              </Button>
              <AIChatToolbar
                onSummarize={async (type) => {
                  await generateSummary(displayMessages, type);
                  setShowSummary(true);
                }}
                onSmartReply={async () => {
                  if (displayMessages.length > 0) {
                    const lastMsg = displayMessages[displayMessages.length - 1];
                    if (lastMsg.sender_id !== user?.id) {
                      await generateSmartReplies(lastMsg.content, displayMessages.slice(-5));
                      setShowSmartReplies(true);
                    } else {
                      toast.info('Smart replies work on received messages');
                    }
                  }
                }}
                onAnalyze={async (type) => {
                  setInsightsType(type);
                  await analyzeMessages(displayMessages, type);
                  setShowInsights(true);
                }}
                disabled={displayMessages.length === 0}
              />
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
                      {user && (
                        <>
                          <DropdownMenuItem asChild>
                            <div className="w-full">
                              <UnifiedPermissionsSetup userId={user.id} />
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      )}
                      <DropdownMenuItem onClick={() => setSelectionMode(true)}>
                        Select Messages
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowDisappearingSettings(true)}>
                        Disappearing Messages
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/profile')}>
                        View Profile
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}
          </div>

          {/* Pinned Messages Viewer */}
          {activeConversationId && user?.id && (
            <PinnedMessagesViewer
              conversationId={activeConversationId}
              userId={user.id}
              onMessageClick={(messageId) => {
                setSearchResultMessageId(messageId);
                toast.success('Scrolling to pinned message');
              }}
              onUnpin={async () => {
                await loadMessages();
              }}
            />
          )}

          {/* Message Search Bar */}
          {showMessageSearch && (
            <div className="border-b bg-background px-2 py-2">
              <MessageSearchBar
                messages={displayMessages.filter(msg => {
                  if (messageFilter === 'all') return true;
                  if (messageFilter === 'media') return msg.message_type === 'image' || msg.message_type === 'video';
                  if (messageFilter === 'links') return msg.content?.includes('http');
                  if (messageFilter === 'documents') return msg.message_type === 'document';
                  if (messageFilter === 'location') return msg.message_type === 'location';
                  return true;
                })}
                onResultSelect={(messageId) => {
                  setSearchResultMessageId(messageId);
                  setShowMessageSearch(false);
                  toast.success('Message found - scrolling to message');
                }}
                onClose={() => setShowMessageSearch(false)}
              />
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden pb-20">
            {user?.id ? (
              <TrueVirtualMessageList
                messages={displayMessages}
                userId={user.id}
                otherUser={otherUser}
                onLoadMore={loadOlderMessages}
                hasMore={hasMore}
                isLoading={messagesLoading}
                onForward={handleForwardMessage}
                onStar={handleStarMessage}
                onReply={handleReplyMessage}
                onDelete={handleDeleteMessage}
                onEdit={handleEditMessage}
                onPin={handlePinMessage}
                onReport={handleReportMessage}
                selectionMode={selectionMode}
                selectedMessages={selectedMessages}
                onSelectMessage={handleSelectMessage}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-primary/60 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Input */}
          <WhatsAppStyleInput
            onSendMessage={handleSendMessage}
            conversationId={activeConversationId}
            userId={user.id}
            disabled={messagesLoading}
            replyToMessage={replyToMessage}
            onCancelReply={cancelReply}
            lastMessage={displayMessages.length > 0 && displayMessages[displayMessages.length - 1].sender_id !== user.id 
              ? displayMessages[displayMessages.length - 1].content 
              : undefined}
            conversationContext={displayMessages.slice(-5).map(m => m.content)}
            onAIAction={async (action) => {
              if (action === 'smart_reply') {
                if (displayMessages.length > 0) {
                  const lastMsg = displayMessages[displayMessages.length - 1];
                  if (lastMsg.sender_id !== user?.id) {
                    await generateSmartReplies(lastMsg.content, displayMessages.slice(-5));
                    setShowSmartReplies(true);
                  } else {
                    toast.info('Smart replies work on received messages');
                  }
                }
              } else if (action === 'summarize') {
                await generateSummary(displayMessages, 'brief');
                setShowSummary(true);
              } else if (action === 'translate') {
                toast.info('Translation feature coming soon!');
              } else if (action === 'extract_action') {
                await analyzeMessages(displayMessages, 'topics');
                setShowInsights(true);
              }
            }}
          />
        </>
      ) : (
        // Conversation List View
        <>
          {/* Clean Header - Compact */}
          <div className="sticky top-0 z-10 border-b border-border/30 bg-card/95 backdrop-blur-lg">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/')}
                  className="h-8 w-8 rounded-full hover:bg-accent/50"
                  title="Back"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                
                <img 
                  src="/chatr-logo.png" 
                  alt="chatr" 
                  className="h-6 w-6"
                />
              </div>

              <div className="flex items-center gap-0.5">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/profile')}
                  className="h-8 w-8 rounded-full hover:bg-accent/50"
                  title="Profile"
                >
                  <User className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowGroupCreator(true)}
                  className="h-8 w-8 rounded-full hover:bg-accent/50"
                  title="Create Group"
                >
                  <Users className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowGlobalSearch(true)}
                  className="h-8 w-8 rounded-full hover:bg-accent/50"
                  title="Search"
                >
                  <Search className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/notifications')}
                  className="h-8 w-8 rounded-full hover:bg-accent/50 relative"
                  title="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {notificationCount > 0 && (
                    <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 flex items-center justify-center p-0 text-[9px] bg-red-500 border border-white">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Badge>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/starred-messages')}
                  className="h-8 w-8 rounded-full hover:bg-accent/50"
                  title="Starred Messages"
                >
                  <Star className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/call-history')}
                  className="h-8 w-8 rounded-full hover:bg-accent/50"
                  title="Call History"
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/growth')}
                  className="h-8 w-8 rounded-full hover:bg-accent/50"
                  title="Rewards"
                >
                  <QrCode className="h-4 w-4" />
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
                  className="h-8 w-8 rounded-full hover:bg-accent/50"
                  title="Share chatr"
                >
                  <Share2 className="h-4 w-4" />
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

      {/* AI Summary Dialog */}
      <Dialog open={showSummary} onOpenChange={(open) => {
        setShowSummary(open);
        if (!open) clearSummary();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>AI Conversation Summary</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[500px] pr-4">
            {aiLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{summary}</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Smart Replies Panel */}
      {showSmartReplies && smartReplies.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-50 px-4">
          <SmartRepliesPanel
            replies={smartReplies}
            onSelect={(reply) => {
              handleSendMessage(reply);
              clearSmartReplies();
              setShowSmartReplies(false);
            }}
            onClose={() => {
              clearSmartReplies();
              setShowSmartReplies(false);
            }}
            loading={aiLoading}
          />
        </div>
      )}

      {/* AI Insights Panel */}
      <AIInsightsPanel
        open={showInsights}
        onClose={() => {
          setShowInsights(false);
          clearInsights();
        }}
        insights={insights}
        type={insightsType}
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

      {/* Message Forward Dialog */}
      <MessageForwardDialog
        open={showForwardDialog}
        onClose={() => setShowForwardDialog(false)}
        messageId={messageToForward?.id || ''}
        messageContent={messageToForward?.content || ''}
        userId={user?.id || ''}
      />
      
      {/* Add Participant Dialog */}
      {activeConversationId && (
        <AddParticipantDialog
          open={showAddParticipant}
          onOpenChange={setShowAddParticipant}
          conversationId={activeConversationId}
          currentParticipants={conversationParticipants}
          onParticipantAdded={() => {
            loadConversationParticipants(activeConversationId);
            loadMessages();
          }}
        />
      )}
      
      {/* Contact Info Sidebar */}
      <UserInfoSidebar
        contact={otherUser ? {
          id: otherUser.id,
          username: otherUser.username || 'Unknown',
          avatar_url: otherUser.avatar_url || null,
          email: null,
          phone_number: otherUser.phone_number || null,
          status: otherUser.status || null,
          is_online: otherUser.is_online || false,
          last_seen: otherUser.last_seen || new Date().toISOString(),
          created_at: otherUser.created_at || new Date().toISOString(),
          age: null,
          gender: null
        } : null}
        open={showContactInfo}
        onOpenChange={setShowContactInfo}
      />

      {/* Message Forward Dialog */}
      {messageToForward && (
        <MessageForwardDialog
          open={showForwardDialog}
          onClose={() => {
            setShowForwardDialog(false);
            setMessageToForward(null);
          }}
          messageId={messageToForward.id}
          messageContent={messageToForward.content}
          userId={user.id}
        />
      )}

      {/* Message Report Dialog */}
      {messageToReport && (
        <MessageReportDialog
          open={showReportDialog}
          onClose={() => {
            setShowReportDialog(false);
            setMessageToReport(null);
          }}
          messageId={messageToReport.id}
          conversationId={activeConversationId!}
          reportedUserId={messageToReport.sender_id}
          userId={user.id}
        />
      )}
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
