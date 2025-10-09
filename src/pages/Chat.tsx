import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NetworkStatus } from '@/components/NetworkStatus';
import { useChatContext } from '@/contexts/ChatContext';
import { useMessageSync } from '@/hooks/useMessageSync';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Phone, Video, MoreVertical, User, Users, Search, QrCode, UserX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ConversationList } from '@/components/chat/ConversationList';
import { MessageThread } from '@/components/chat/MessageThread';
import { EnhancedMessageInput } from '@/components/chat/EnhancedMessageInput';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const ChatEnhancedContent = () => {
  const { user, session } = useChatContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Only sync messages if we have both a conversation and a valid user ID
  const { messages, isLoading, sendMessage, markAsRead } = useMessageSync(
    activeConversationId, 
    user?.id || undefined
  );
  
  // Enable push notifications only if user ID exists
  usePushNotifications(user?.id || undefined);

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

  // Redirect if not authenticated
  useEffect(() => {
    if (!session) {
      navigate('/auth');
    }
  }, [session, navigate]);

  // Handle contact selected from location state
  useEffect(() => {
    const selectedContact = (location.state as any)?.selectedContact;
    if (selectedContact && user) {
      handleStartConversation(selectedContact);
    }
  }, [location.state, user]);

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

  const handleConversationSelect = (conversationId: string, user?: any) => {
    setActiveConversationId(conversationId);
    setOtherUser(user);
  };

  const handleSendMessage = async (content: string) => {
    if (!activeConversationId) return;

    await sendMessage({
      conversation_id: activeConversationId,
      content,
      message_type: 'text'
    });
  };

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
            <MessageThread
              messages={messages}
              userId={user.id}
              otherUser={otherUser}
            />
          </div>

          {/* Input */}
          <EnhancedMessageInput
            onSendMessage={handleSendMessage}
            disabled={isLoading}
          />
        </>
      ) : (
        // Conversation List View
        <>
          {/* Header */}
          <div className="border-b bg-card p-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              {/* Left: Back + Logo */}
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/')}
                  className="rounded-full h-9 w-9"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-lg font-bold text-primary">chatr</h1>
              </div>
              
              {/* Right: Action Icons */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/profile')}
                  className="rounded-full h-9 w-9"
                  title="Profile"
                >
                  <User className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/contacts')}
                  className="rounded-full h-9 w-9"
                  title="Contacts"
                >
                  <Users className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/global-contacts')}
                  className="rounded-full h-9 w-9"
                  title="Search Users"
                >
                  <Search className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-9 w-9"
                  title="Blocked Contacts"
                >
                  <UserX className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/call-history')}
                  className="rounded-full h-9 w-9"
                  title="Calls"
                >
                  <Phone className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/qr-login')}
                  className="rounded-full h-9 w-9"
                  title="QR Scan"
                >
                  <QrCode className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-9 w-9"
                  title="More"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Conversations */}
          <div className="flex-1 overflow-hidden">
            <ConversationList
              userId={user.id}
              onConversationSelect={handleConversationSelect}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default function ChatEnhanced() {
  return (
    <ErrorBoundary>
      <ChatEnhancedContent />
    </ErrorBoundary>
  );
}
