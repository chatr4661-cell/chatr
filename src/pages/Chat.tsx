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
  Bot, Stethoscope, AlertTriangle, Activity, Trophy, ShoppingBag, Heart, Users as UsersIcon
} from 'lucide-react';
import { MessageAction } from '@/components/MessageAction';
import { PollCreator } from '@/components/PollCreator';
import { PollMessage } from '@/components/PollMessage';
import { MessageReactions } from '@/components/MessageReactions';
import { TypingIndicator, setTypingStatus } from '@/components/TypingIndicator';
import { pickImage, getCurrentLocation, startVoiceRecording, stopVoiceRecording } from '@/utils/mediaUtils';
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
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [viewMode, setViewMode] = useState<'consumer' | 'business'>('consumer');
  const [isProvider, setIsProvider] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

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
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(20);

    if (error) {
      console.error('Error loading contacts:', error);
      return;
    }

    setContacts(data || []);
  };

  const selectContact = async (contact: Profile) => {
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
      toast({
        title: 'Error',
        description: 'Failed to create conversation',
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
      // TODO: Upload voice blob and send
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

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-background p-4">
      <div className="w-full max-w-[390px] h-[844px] bg-background rounded-3xl shadow-2xl overflow-hidden flex">
        {/* Show Business Portal if provider and in business mode */}
        {viewMode === 'business' && !selectedContact ? (
          <>
            {/* Add toggle for providers */}
            {isProvider && (
              <div className="absolute top-4 right-4 z-50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewMode('consumer')}
                  className="rounded-full shadow-elevated"
                >
                  <UsersIcon className="h-4 w-4 mr-2" />
                  Switch to Consumer
                </Button>
              </div>
            )}
            <BusinessPortal />
          </>
        ) : (
        <>
          {/* Add toggle for providers in consumer view */}
          {isProvider && !selectedContact && (
            <div className="fixed top-20 right-4 z-50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode('business')}
                className="rounded-full shadow-elevated"
              >
                <UsersIcon className="h-4 w-4 mr-2" />
                Switch to Business
              </Button>
            </div>
          )}
      {/* Sidebar */}
      <div className={`${selectedContact ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 border-r border-glass-border backdrop-blur-glass bg-gradient-glass`}>
        <div className="p-4 border-b border-glass-border backdrop-blur-glass bg-background/50">
          <div className="flex items-center gap-3 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="rounded-full hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg font-semibold flex-1">Messages</h2>
          </div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {profile?.username?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-semibold text-foreground">{profile?.username || 'User'}</h2>
                <p className="text-xs text-muted-foreground">{profile?.status || 'Available'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/status')}
                className="rounded-full"
              >
                <BarChart3 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="rounded-full hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              className="pl-10 rounded-full bg-background/50 border-glass-border"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2">
            {contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => selectContact(contact)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/50 transition-colors ${
                  selectedContact?.id === contact.id ? 'bg-primary/10' : ''
                }`}
              >
                <div className="relative">
                  <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold">
                      {contact.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {contact.is_online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground">{contact.username}</p>
                    <span className="text-xs text-muted-foreground">12:30 PM</span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{contact.status}</p>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-glass-border backdrop-blur-glass bg-gradient-glass">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden rounded-full bg-primary/10 hover:bg-primary/20"
                    onClick={() => setSelectedContact(null)}
                  >
                    <ArrowLeft className="h-6 w-6 text-primary" />
                  </Button>
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold">
                      {selectedContact.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">{selectedContact.username}</h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedContact.is_online ? 'Online' : `Last seen ${selectedContact.last_seen || 'recently'}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
                    <Video className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
                    <Phone className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4 bg-gradient-to-br from-background via-primary/5 to-accent/5">
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.map((message) => {
                  const isOwn = message.sender_id === user?.id;
                  
                  return (
                    <ContextMenu key={message.id}>
                      <ContextMenuTrigger>
                        <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] space-y-1`}>
                            {message.reply_to_id && (
                              <div className="text-xs text-muted-foreground italic px-2">
                                Replying to message
                              </div>
                            )}
                            
                            {message.message_type === 'poll' && message.poll_options ? (
                              <PollMessage
                                question={message.poll_question || ''}
                                options={message.poll_options}
                                totalVotes={0}
                                onVote={(index) => {}}
                              />
                            ) : message.message_type === 'image' ? (
                              <div className={`rounded-2xl overflow-hidden ${isOwn ? 'rounded-br-sm' : 'rounded-bl-sm'}`}>
                                <img src={message.media_url} alt="Shared image" className="max-w-full" />
                              </div>
                            ) : message.message_type === 'location' ? (
                              <div className={`rounded-2xl p-3 ${
                                isOwn ? 'bg-primary text-primary-foreground' : 'bg-card text-card-foreground'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  <span>{message.location_name}</span>
                                </div>
                              </div>
                            ) : (
                              <div className={`rounded-2xl px-4 py-2 ${
                                isOwn
                                  ? 'bg-primary text-primary-foreground rounded-br-sm shadow-glow'
                                  : 'bg-card text-card-foreground rounded-bl-sm shadow-card backdrop-blur-glass border border-glass-border'
                              }`}>
                                <p className="text-sm break-words">{message.content}</p>
                                <div className="flex items-center gap-1 justify-end mt-1">
                                  {message.is_edited && (
                                    <span className="text-xs opacity-70">edited</span>
                                  )}
                                  {message.is_starred && (
                                    <Star className="h-3 w-3 fill-current" />
                                  )}
                                  <span className={`text-xs ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                    {formatTime(message.created_at)}
                                  </span>
                                  {isOwn && (
                                    <span className="text-primary-foreground/70">
                                      {message.read_at ? (
                                        <CheckCheck className="h-3 w-3" />
                                      ) : (
                                        <Check className="h-3 w-3" />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            <MessageReactions
                              reactions={[]}
                              onReact={(emoji) => handleReact(message.id, emoji)}
                            />
                          </div>
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => setReplyToMessage(message)}>
                          <Reply className="h-4 w-4 mr-2" />
                          Reply
                        </ContextMenuItem>
                        <ContextMenuItem>
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
                          <>
                            <ContextMenuItem>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </ContextMenuItem>
                            <ContextMenuItem onClick={() => handleDeleteMessage(message.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </ContextMenuItem>
                          </>
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
              <div className="px-4 py-2 bg-muted/50 border-t border-glass-border flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">Replying to {replyToMessage.sender?.username}</p>
                  <p className="text-sm truncate">{replyToMessage.content}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setReplyToMessage(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-glass-border backdrop-blur-glass bg-gradient-glass">
              <form onSubmit={sendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
                <Sheet open={showMediaActions} onOpenChange={setShowMediaActions}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MoreVertical className="h-5 w-5" />
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

                <Input
                  value={messageInput}
                  onChange={(e) => handleInputChange(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full bg-background/50 border-glass-border"
                />
                
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Smile className="h-5 w-5" />
                </Button>

                {messageInput.trim() ? (
                  <Button
                    type="submit"
                    size="icon"
                    className="rounded-full h-11 w-11 shadow-glow"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="icon"
                    className={`rounded-full h-11 w-11 ${isRecording ? 'bg-red-500' : ''}`}
                    onClick={handleVoiceRecord}
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                )}
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col bg-gradient-to-br from-background via-primary/5 to-accent/10">
            {/* Main Chat Home Screen */}
            <div className="flex-1 flex flex-col">
              {/* Header with Profile */}
              <div className="p-4 backdrop-blur-glass bg-gradient-glass border-b border-glass-border">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                  <h1 className="text-2xl font-bold text-foreground">HealthMessenger</h1>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full bg-primary/10 hover:bg-primary/20"
                  >
                    <User className="h-5 w-5 text-primary" />
                  </Button>
                </div>
              </div>

              {/* Message Input Bar */}
              <div className="p-4 max-w-4xl mx-auto w-full">
                <div className="relative">
                  <Input
                    placeholder="Type a message..."
                    className="rounded-full bg-card/50 backdrop-blur-glass border-glass-border pr-24 shadow-card"
                    readOnly
                    onClick={() => {
                      toast({
                        title: 'Select a contact',
                        description: 'Choose a contact from the left to start chatting'
                      });
                    }}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-9 w-9"
                    >
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full h-9 w-9"
                    >
                      <Mic className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Service Cards Grid */}
              <ScrollArea className="flex-1 p-4">
                <div className="max-w-4xl mx-auto space-y-3">
                  <div onClick={() => navigate('/ai-assistant')}>
                    <ServiceCard
                      icon={Bot}
                      title="AI Health Assistant"
                      description="Get instant health advice and symptom checking"
                      iconColor="bg-gradient-to-br from-teal-400 to-emerald-500"
                    />
                  </div>
                  
                  <div onClick={() => navigate('/booking')}>
                    <ServiceCard
                      icon={Stethoscope}
                      title="Doctor/Nurse Booking"
                      description="Book appointments with healthcare professionals"
                      iconColor="bg-gradient-to-br from-blue-400 to-blue-600"
                    />
                  </div>
                  
                  <div onClick={() => navigate('/emergency')}>
                    <ServiceCard
                      icon={AlertTriangle}
                      title="Emergency / Panic Button"
                      description="Quick access to emergency services"
                      iconColor="bg-gradient-to-br from-red-400 to-red-600"
                    />
                  </div>
                  
                  <div onClick={() => navigate('/wellness')}>
                    <ServiceCard
                      icon={Activity}
                      title="Wellness Tracking"
                      description="Track your health metrics and goals"
                      iconColor="bg-gradient-to-br from-pink-400 to-pink-600"
                    />
                  </div>
                  
                  <div onClick={() => navigate('/')}>
                    <ServiceCard
                      icon={Trophy}
                      title="Youth Engagement"
                      description="Health programs and activities"
                      iconColor="bg-gradient-to-br from-yellow-400 to-yellow-600"
                    />
                  </div>
                  
                  <div onClick={() => navigate('/')}>
                    <ServiceCard
                      icon={ShoppingBag}
                      title="Marketplace"
                      description="Order medicines and health products"
                      iconColor="bg-gradient-to-br from-purple-400 to-purple-600"
                    />
                  </div>
                  
                  <div onClick={() => {
                    toast({
                      title: 'Messaging',
                      description: 'Select a contact from the left to start chatting'
                    });
                  }}>
                    <ServiceCard
                      icon={MessageCircle}
                      title="Messaging"
                      description="Chat with healthcare providers"
                      iconColor="bg-gradient-to-br from-green-400 to-emerald-600"
                    />
                  </div>
                  
                  <div onClick={() => navigate('/')}>
                    <ServiceCard
                      icon={Heart}
                      title="Allied Healthcare"
                      description="Access specialized healthcare services"
                      iconColor="bg-gradient-to-br from-blue-400 to-indigo-600"
                    />
                  </div>

                  {/* AI Assistant Message Bubble */}
                  <div className="flex justify-end px-4 py-2">
                    <div className="bg-gradient-to-br from-teal-400/20 to-emerald-500/20 backdrop-blur-glass border border-teal-400/30 rounded-2xl rounded-br-sm px-4 py-3 max-w-[85%] shadow-glow">
                      <p className="text-sm text-foreground">Hi! How can I assist you today?</p>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
      </div>

        <PollCreator
          open={showPollCreator}
          onClose={() => setShowPollCreator(false)}
          onSend={handlePollSend}
        />
          </>
        )}
      </div>
    </div>
  );
};

export default Chat;
