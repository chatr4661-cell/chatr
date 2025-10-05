import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import ServiceCard from '@/components/ServiceCard';
import BusinessPortal from '@/components/BusinessPortal';
import { 
  MessageCircle, Send, LogOut, Search, MoreVertical, Phone, Video, ArrowLeft, 
  Check, CheckCheck, Image as ImageIcon, Mic, MapPin, File, Smile, BarChart3,
  Reply, Forward, Star, Copy, Trash2, Edit2, Download, X, Paperclip, User,
  Bot, Stethoscope, AlertTriangle, Activity, Trophy, ShoppingBag, Heart, Users as UsersIcon, UserPlus, QrCode
} from 'lucide-react';
import { MessageAction } from '@/components/MessageAction';
import { PollCreator } from '@/components/PollCreator';
import { PollMessage } from '@/components/PollMessage';
import { MessageReactions } from '@/components/MessageReactions';
import { TypingIndicator, setTypingStatus } from '@/components/TypingIndicator';
import { VoiceMessageRecorder } from '@/components/VoiceMessageRecorder';
import { GroupChatCreator } from '@/components/GroupChatCreator';
import { MessageForwarding } from '@/components/MessageForwarding';
import { ContactManager } from '@/components/ContactManager';
import VoiceCall from '@/components/VoiceCall';
import VideoCall from '@/components/VideoCall';
import { CallInterface } from '@/components/CallInterface';
import { QRScanner } from '@/components/QRScanner';
import { DeviceSessions } from '@/components/DeviceSessions';
import { pickImage, getCurrentLocation, startVoiceRecording, stopVoiceRecording } from '@/utils/mediaUtils';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import logo from '@/assets/chatr-logo.png';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  status: string;
  last_seen?: string;
  is_online?: boolean;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read_at: string | null;
  message_type: string;
  media_url?: string;
  file_name?: string;
  duration?: number;
  reply_to_id?: string;
  is_edited?: boolean;
  is_deleted?: boolean;
  is_starred?: boolean;
  location_latitude?: number;
  location_longitude?: number;
  location_name?: string;
  poll_question?: string;
  poll_options?: any;
  sender?: Profile;
}

const Chat = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedContact, setSelectedContact] = useState<Profile | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showMediaActions, setShowMediaActions] = useState(false);
  const [showPollCreator, setShowPollCreator] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showGroupCreator, setShowGroupCreator] = useState(false);
  const [showMessageForwarding, setShowMessageForwarding] = useState(false);
  const [messageToForward, setMessageToForward] = useState<Message | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [viewMode, setViewMode] = useState<'consumer' | 'business' | 'contacts'>('consumer');
  const [isProvider, setIsProvider] = useState(false);
  const [allConversations, setAllConversations] = useState<any[]>([]);
  const [activeCall, setActiveCall] = useState<{ type: 'voice' | 'video', callId: string, partnerId: string } | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showDeviceSessions, setShowDeviceSessions] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Enable real-time notifications
  useRealtimeNotifications(user?.id);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        loadProfile(session.user.id);
        checkProviderStatus(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        loadProfile(session.user.id);
        checkProviderStatus(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkProviderStatus = async (userId: string) => {
    const { data } = await supabase
      .from('service_providers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (data) {
      setIsProvider(true);
      setViewMode('business');
    }
  };

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error loading profile:', error);
      return;
    }

    setProfile(data);
    loadContacts();
  };

  const loadContacts = async () => {
    if (!user?.id) return;

    // Get user's contacts with profile info
    const { data: contactsData } = await supabase
      .from('contacts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_registered', true);

    if (contactsData && contactsData.length > 0) {
      const contactUserIds = contactsData
        .filter(c => c.contact_user_id)
        .map(c => c.contact_user_id);

      if (contactUserIds.length > 0) {
        const { data: profilesData, error } = await supabase
          .from('profiles')
          .select('*')
          .in('id', contactUserIds);

        if (error) {
          console.error('Error loading contact profiles:', error);
          return;
        }

        setContacts(profilesData || []);
      } else {
        setContacts([]);
      }
    } else {
      setContacts([]);
    }
  };

  // Reload contacts when switching back to consumer view
  useEffect(() => {
    if (viewMode === 'consumer' && user?.id) {
      loadContacts();
    }
  }, [viewMode, user?.id]);

  const selectContact = async (contact: Profile) => {
    // Critical: Check if user is authenticated before proceeding
    if (!user?.id) {
      toast({
        title: 'Authentication Required',
        description: 'Please wait for authentication to complete',
        variant: 'destructive'
      });
      console.error('User not authenticated when selecting contact');
      return;
    }

    setSelectedContact(contact);
    
    const { data: existingConversation } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (existingConversation && existingConversation.length > 0) {
      const conversationIds = existingConversation.map((c) => c.conversation_id);
      
      const { data: otherParticipant } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', contact.id)
        .in('conversation_id', conversationIds);

      if (otherParticipant && otherParticipant.length > 0) {
        setConversationId(otherParticipant[0].conversation_id);
        loadMessages(otherParticipant[0].conversation_id);
        return;
      }
    }

    const { data: newConversation, error } = await supabase
      .from('conversations')
      .insert({ created_by: user.id })
      .select()
      .single();

    if (error || !newConversation) {
      console.error('Error creating conversation:', error);
      console.error('Full error details:', JSON.stringify(error, null, 2));
      console.error('User ID:', user.id);
      toast({
        title: 'Failed to Create Conversation',
        description: error?.message || 'Unable to start chat. Please try again.',
        variant: 'destructive'
      });
      return;
    }

    await supabase.from('conversation_participants').insert([
      { conversation_id: newConversation.id, user_id: user.id },
      { conversation_id: newConversation.id, user_id: contact.id },
    ]);

    setConversationId(newConversation.id);
    loadMessages(newConversation.id);
  };

  const loadMessages = async (convId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles(*)
      `)
      .eq('conversation_id', convId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    setMessages(data || []);
    subscribeToMessages(convId);
  };

  const subscribeToMessages = (convId: string) => {
    const channel = supabase
      .channel(`messages:${convId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`,
        },
        async (payload) => {
          const { data: newMessage } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles(*)
            `)
            .eq('id', payload.new.id)
            .single();

          if (newMessage) {
            setMessages((prev) => [...prev, newMessage]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleInputChange = (value: string) => {
    setMessageInput(value);
    
    if (conversationId && user) {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      setTypingStatus(conversationId, user.id, true);
      
      typingTimeoutRef.current = setTimeout(() => {
        setTypingStatus(conversationId, user.id, false);
      }, 2000);
    }
  };

  const sendMessage = async (e: React.FormEvent, messageType: string = 'text', additionalData: any = {}) => {
    e.preventDefault();
    
    if ((!messageInput.trim() && messageType === 'text') || !conversationId || !user) return;

    const messageData: any = {
      sender_id: user.id,
      conversation_id: conversationId,
      message_type: messageType,
      reply_to_id: replyToMessage?.id || null,
      ...additionalData
    };

    if (messageType === 'text') {
      messageData.content = messageInput;
    }

    const { error } = await supabase.from('messages').insert(messageData);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
      return;
    }

    setMessageInput('');
    setReplyToMessage(null);
    if (conversationId && user) {
      setTypingStatus(conversationId, user.id, false);
    }
  };

  const handleImagePick = async () => {
    const imageUrl = await pickImage();
    if (imageUrl) {
      sendMessage(new Event('submit') as any, 'image', { media_url: imageUrl, content: 'Photo' });
    }
    setShowMediaActions(false);
  };

  const handleLocationShare = async () => {
    const location = await getCurrentLocation();
    if (location) {
      sendMessage(new Event('submit') as any, 'location', {
        content: 'Location',
        location_latitude: location.latitude,
        location_longitude: location.longitude,
        location_name: 'Current Location'
      });
    }
    setShowMediaActions(false);
  };

  const handleVoiceRecord = async () => {
    if (!isRecording) {
      setIsRecording(true);
      startVoiceRecording();
      toast({
        title: 'Recording...',
        description: 'Tap to stop recording'
      });
    } else {
      stopVoiceRecording();
      setIsRecording(false);
      toast({
        title: 'Voice message sent!',
      });
    }
  };

  const handlePollSend = (question: string, options: string[]) => {
    const pollOptions = options.map(text => ({ text, votes: 0 }));
    sendMessage(new Event('submit') as any, 'poll', {
      content: question,
      poll_question: question,
      poll_options: pollOptions
    });
  };

  const handleReact = async (messageId: string, emoji: string) => {
    const { error } = await supabase
      .from('message_reactions')
      .upsert({
        message_id: messageId,
        user_id: user.id,
        emoji
      });

    if (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleStarMessage = async (messageId: string, isStarred: boolean) => {
    await supabase
      .from('messages')
      .update({ is_starred: !isStarred })
      .eq('id', messageId);
  };

  const handleDeleteMessage = async (messageId: string) => {
    await supabase
      .from('messages')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', messageId);
    
    setMessages(prev => prev.filter(m => m.id !== messageId));
  };

  const handleVoiceMessageSend = async (audioBlob: Blob, duration: number) => {
    if (!conversationId || !user) return;

    try {
      // Upload audio to storage
      const fileName = `voice-${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('social-media')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('social-media')
        .getPublicUrl(fileName);

      // Send message
      await sendMessage(new Event('submit') as any, 'voice', {
        content: 'Voice message',
        media_url: publicUrl,
        duration: duration
      });

      setShowVoiceRecorder(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to send voice message',
        variant: 'destructive'
      });
    }
  };

  const handleForwardMessage = (message: Message) => {
    setMessageToForward(message);
    setShowMessageForwarding(true);
  };

  const startVoiceCall = async () => {
    if (!selectedContact || !conversationId || !user) return;

    const { data: call, error } = await supabase
      .from('calls')
      .insert({
        conversation_id: conversationId,
        caller_id: user.id,
        call_type: 'voice',
        status: 'ringing'
      })
      .select()
      .single();

    if (error || !call) {
      toast({
        title: 'Error',
        description: 'Failed to start call',
        variant: 'destructive'
      });
      return;
    }

    setActiveCall({
      type: 'voice',
      callId: call.id,
      partnerId: selectedContact.id
    });
  };

  const startVideoCall = async () => {
    if (!selectedContact || !conversationId || !user) return;

    const { data: call, error } = await supabase
      .from('calls')
      .insert({
        conversation_id: conversationId,
        caller_id: user.id,
        call_type: 'video',
        status: 'ringing'
      })
      .select()
      .single();

    if (error || !call) {
      toast({
        title: 'Error',
        description: 'Failed to start call',
        variant: 'destructive'
      });
      return;
    }

    setActiveCall({
      type: 'video',
      callId: call.id,
      partnerId: selectedContact.id
    });
  };

  const endCall = async () => {
    if (!activeCall) return;

    await supabase
      .from('calls')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString()
      })
      .eq('id', activeCall.callId);

    setActiveCall(null);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (viewMode === 'business' && isProvider && !selectedContact) {
    return (
      <div className="h-screen flex bg-background relative">
        <div className="absolute top-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('consumer')}
            className="rounded-full shadow-lg"
          >
            <UsersIcon className="h-4 w-4 mr-2" />
            Switch to Consumer
          </Button>
        </div>
        <BusinessPortal />
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Main Container - WhatsApp/Telegram Style */}
      <div className="flex w-full max-w-full mx-auto">
        {/* Sidebar - Contact List */}
        <div className={`${selectedContact ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 border-r border-border bg-card`}>
          {/* Header */}
          <div className="p-3 border-b border-border bg-primary/5">
            <div className="flex items-center gap-3 mb-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="rounded-full hover:bg-primary/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <img src={logo} alt="chatr+ Logo" className="h-8 object-contain flex-1" />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode(viewMode === 'contacts' ? 'consumer' : 'contacts')}
                className="rounded-full hover:bg-primary/10"
                title="Contacts"
              >
                <UsersIcon className="h-5 w-5" />
              </Button>
              {isProvider && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('business')}
                  className="rounded-full"
                >
                  <Stethoscope className="h-5 w-5" />
                </Button>
              )}
              <CallInterface userId={user?.id || ''} username={profile?.username || 'User'} />
              <Sheet open={showDeviceSessions} onOpenChange={setShowDeviceSessions}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" title="Linked Devices">
                    <QrCode className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Device Management</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <DeviceSessions />
                    <Button 
                      className="w-full mt-4" 
                      onClick={() => {
                        setShowDeviceSessions(false);
                        setShowQRScanner(true);
                      }}
                    >
                      Link New Device
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
              <Button variant="ghost" size="icon" className="rounded-full" onClick={handleSignOut}>
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search or start new chat"
                className="pl-10 rounded-lg bg-background border-border"
              />
            </div>
          </div>

          {/* Contacts List or Contact Manager */}
          {viewMode === 'contacts' ? (
            <ContactManager 
              userId={user?.id || ''} 
              onContactSelect={(contact) => {
                setViewMode('consumer');
                selectContact(contact);
              }}
            />
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-1">
                {contacts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <UsersIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No contacts yet</p>
                    <p className="text-sm mt-2">Click the contacts icon to add people</p>
                    <Button 
                      onClick={() => setViewMode('contacts')}
                      className="mt-4"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Contacts
                    </Button>
                  </div>
                ) : (
                  contacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => selectContact(contact)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/80 transition-all ${
                      selectedContact?.id === contact.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-lg">
                          {contact.username[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {contact.is_online && (
                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="font-semibold text-foreground truncate">{contact.username}</p>
                        <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">12:30 PM</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckCheck className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                        <p className="text-sm text-muted-foreground truncate">{contact.status || 'Hey there!'}</p>
                      </div>
                    </div>
                  </button>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Chat Area */}
        <div className={`${selectedContact ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-background`}>
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="p-3 border-b border-border bg-card flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden rounded-full"
                    onClick={() => setSelectedContact(null)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {selectedContact.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">{selectedContact.username}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedContact.is_online ? 'online' : `last seen ${selectedContact.last_seen || 'recently'}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={startVideoCall}>
                    <Video className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full" onClick={startVoiceCall}>
                    <Phone className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4 bg-[#efeae2] dark:bg-[#0b141a]">
                <div className="space-y-3 max-w-4xl mx-auto">
                  {messages.map((message) => {
                    const isOwn = message.sender_id === user?.id;
                    
                    return (
                      <ContextMenu key={message.id}>
                        <ContextMenuTrigger>
                          <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%]`}>
                              {message.message_type === 'poll' && message.poll_options ? (
                                <PollMessage
                                  question={message.poll_question || ''}
                                  options={message.poll_options}
                                  totalVotes={0}
                                  onVote={(index) => {}}
                                />
                              ) : message.message_type === 'image' ? (
                                <div className={`rounded-lg overflow-hidden shadow-md ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                                  <img src={message.media_url} alt="Shared image" className="max-w-full" />
                                  <div className="px-2 py-1 bg-black/50 text-white text-xs flex items-center justify-end gap-1">
                                    <span>{formatTime(message.created_at)}</span>
                                    {isOwn && (message.read_at ? <CheckCheck className="h-3 w-3 text-blue-400" /> : <Check className="h-3 w-3" />)}
                                  </div>
                                </div>
                              ) : message.message_type === 'location' ? (
                                <div className={`rounded-lg p-3 shadow-md ${
                                  isOwn ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-foreground rounded-br-sm' : 'bg-white dark:bg-[#202c33] text-foreground rounded-bl-sm'
                                }`}>
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4" />
                                    <span>{message.location_name}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className={`rounded-lg px-3 py-2 shadow-sm ${
                                  isOwn
                                    ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-foreground rounded-br-sm'
                                    : 'bg-white dark:bg-[#202c33] text-foreground rounded-bl-sm'
                                }`}>
                                  <p className="text-sm break-words whitespace-pre-wrap">{message.content}</p>
                                  <div className="flex items-center gap-1 justify-end mt-1">
                                    {message.is_edited && (
                                      <span className="text-[10px] opacity-70">edited</span>
                                    )}
                                    <span className="text-[11px] opacity-70">
                                      {formatTime(message.created_at)}
                                    </span>
                                    {isOwn && (
                                      message.read_at ? (
                                        <CheckCheck className="h-3.5 w-3.5 text-blue-500" />
                                      ) : (
                                        <Check className="h-3.5 w-3.5 opacity-70" />
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                        <ContextMenuItem onClick={() => setReplyToMessage(message)}>
                            <Reply className="h-4 w-4 mr-2" />
                            Reply
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => handleForwardMessage(message)}>
                            <Forward className="h-4 w-4 mr-2" />
                            Forward
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => handleStarMessage(message.id, message.is_starred || false)}>
                            <Star className="h-4 w-4 mr-2" />
                            {message.is_starred ? 'Unstar' : 'Star'}
                          </ContextMenuItem>
                          <ContextMenuItem>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </ContextMenuItem>
                          {isOwn && (
                            <ContextMenuItem onClick={() => handleDeleteMessage(message.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </ContextMenuItem>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                    );
                  })}
                </div>
                {conversationId && <TypingIndicator conversationId={conversationId} currentUserId={user?.id} />}
              </ScrollArea>

              {/* Reply Preview */}
              {replyToMessage && (
                <div className="px-4 py-2 bg-muted/50 border-t border-border flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Replying to {replyToMessage.sender?.username}</p>
                    <p className="text-sm truncate">{replyToMessage.content}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setReplyToMessage(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Input Area */}
              <div className="p-3 border-t border-border bg-card">
                <form onSubmit={sendMessage} className="flex items-center gap-2">
                  <Sheet open={showMediaActions} onOpenChange={setShowMediaActions}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0">
                        <Paperclip className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-auto">
                      <SheetHeader>
                        <SheetTitle>Send</SheetTitle>
                      </SheetHeader>
                      <div className="grid grid-cols-4 gap-4 py-4">
                        <MessageAction icon={ImageIcon} label="Photo" onClick={handleImagePick} color="text-blue-500" />
                        <MessageAction icon={File} label="Document" onClick={() => {}} color="text-purple-500" />
                        <MessageAction icon={MapPin} label="Location" onClick={handleLocationShare} color="text-green-500" />
                        <MessageAction icon={BarChart3} label="Poll" onClick={() => { setShowMediaActions(false); setShowPollCreator(true); }} color="text-orange-500" />
                      </div>
                    </SheetContent>
                  </Sheet>

                  <div className="flex-1 relative">
                    <Input
                      value={messageInput}
                      onChange={(e) => handleInputChange(e.target.value)}
                      placeholder="Type a message"
                      className="rounded-full bg-background border-border pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full h-8 w-8"
                    >
                      <Smile className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </div>

                  {messageInput.trim() ? (
                    <Button
                      type="submit"
                      size="icon"
                      className="rounded-full flex-shrink-0 h-11 w-11"
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      className="rounded-full flex-shrink-0 h-11 w-11"
                      onClick={() => setShowVoiceRecorder(true)}
                    >
                      <Mic className="h-5 w-5" />
                    </Button>
                  )}
                </form>
              </div>
            </>
          ) : (
            // Empty State - No Chat Selected
            <div className="flex-1 flex items-center justify-center bg-[#f0f2f5] dark:bg-[#0b141a] p-4">
              <div className="text-center">
                <MessageCircle className="h-24 w-24 mx-auto text-muted-foreground/30 mb-4" />
                <h2 className="text-2xl font-semibold mb-2">HealthMessenger</h2>
                <p className="text-muted-foreground mb-6">
                  Send and receive messages securely with healthcare providers
                </p>
                <Button onClick={() => navigate('/')} variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Voice Message Recorder */}
      {showVoiceRecorder && (
        <VoiceMessageRecorder
          onSend={handleVoiceMessageSend}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      )}

      {/* Group Chat Creator */}
      <GroupChatCreator
        open={showGroupCreator}
        onOpenChange={setShowGroupCreator}
        contacts={contacts}
        userId={user?.id || ''}
        onGroupCreated={(groupId) => {
          toast({
            title: "Success",
            description: "Group created successfully"
          });
          setShowGroupCreator(false);
        }}
      />

      {/* Message Forwarding */}
      {messageToForward && (
        <MessageForwarding
          open={showMessageForwarding}
          onOpenChange={setShowMessageForwarding}
          message={messageToForward}
          conversations={allConversations}
          userId={user?.id || ''}
        />
      )}

      <PollCreator
        open={showPollCreator}
        onClose={() => setShowPollCreator(false)}
        onSend={handlePollSend}
      />

      {/* Voice Call */}
      {activeCall?.type === 'voice' && selectedContact && user && conversationId && (
        <VoiceCall
          conversationId={conversationId}
          callId={activeCall.callId}
          contactName={selectedContact.username}
          contactAvatar={selectedContact.avatar_url || undefined}
          isInitiator={true}
          userId={user.id}
          partnerId={activeCall.partnerId}
          onEnd={endCall}
        />
      )}

      {/* Video Call */}
      {activeCall?.type === 'video' && selectedContact && user && conversationId && (
        <VideoCall
          conversationId={conversationId}
          callId={activeCall.callId}
          isInitiator={true}
          userId={user.id}
          partnerId={activeCall.partnerId}
          onEnd={endCall}
        />
      )}

      {/* QR Scanner for linking devices */}
      <QRScanner open={showQRScanner} onOpenChange={setShowQRScanner} />
    </div>
  );
};

export default Chat;
