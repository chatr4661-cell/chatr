import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, 
  Send, 
  Search, 
  Paperclip,
  MoreVertical,
  MessageSquare,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { setTypingStatus } from '@/components/TypingIndicator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Conversation {
  id: string;
  customer_name: string;
  customer_avatar: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  customer_id: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  attachment_url?: string;
}

const QUICK_REPLIES = [
  "Thank you for your interest! How can I help you?",
  "I'm available to discuss your requirements.",
  "Let me check availability and get back to you.",
  "What date and time works best for you?",
  "I'll send you a booking confirmation shortly.",
];

export default function SellerMessages() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredConversations(
        conversations.filter(c => 
          c.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.last_message.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchTerm, conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!activeConversation || !sellerId) return;

    // Subscribe to new messages
    const messagesChannel = supabase
      .channel(`conversation-${activeConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversation.id}`
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (newMsg.sender_id !== sellerId) {
            setMessages(prev => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    // Subscribe to typing indicators
    const typingChannel = supabase
      .channel(`typing-${activeConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `conversation_id=eq.${activeConversation.id}`
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          const typedPayload = payload as any;
          if (typedPayload?.new?.user_id !== sellerId) {
            const { data: user } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', typedPayload.new.user_id)
              .single();
            
            if (user) {
              setTypingUsers(prev => [...new Set([...prev, user.username])]);
              setTimeout(() => {
                setTypingUsers(prev => prev.filter(u => u !== user.username));
              }, 3000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [activeConversation, sellerId]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: sellerData } = await supabase
        .from('chatr_plus_sellers')
        .select('id, user_id')
        .eq('user_id', user.id)
        .single();

      if (!sellerData) {
        navigate('/chatr-plus/seller-registration');
        return;
      }

      setSellerId(sellerData.user_id);

      // Load conversations from bookings
      const { data: bookings } = await supabase
        .from('chatr_plus_bookings')
        .select('id, user_id')
        .eq('seller_id', sellerData.id)
        .order('created_at', { ascending: false });

      if (!bookings) {
        setConversations([]);
        setFilteredConversations([]);
        setLoading(false);
        return;
      }

      // Get customer profiles
      const userIds = bookings.map(b => b.user_id).filter(Boolean);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      // Create conversations map
      const mockConversations: Conversation[] = bookings?.map(b => {
        const profile = profiles?.find(p => p.id === b.user_id);
        return {
          id: b.id,
          customer_name: profile?.username || 'Customer',
          customer_avatar: profile?.avatar_url || null,
          customer_id: b.user_id,
          last_message: 'New booking inquiry',
          last_message_time: new Date().toISOString(),
          unread_count: 0,
        };
      }) || [];

      setConversations(mockConversations);
      setFilteredConversations(mockConversations);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load messages',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeConversation || !sellerId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConversation.id,
          sender_id: sellerId,
          content: newMessage,
        });

      if (error) throw error;

      setNewMessage('');
      await setTypingStatus(activeConversation.id, sellerId, false);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation || !sellerId) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `chat-attachments/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-media')
        .getPublicUrl(filePath);

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConversation.id,
          sender_id: sellerId,
          content: `Sent a file: ${file.name}`,
          attachment_url: publicUrl,
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'File sent successfully',
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload file',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleTyping = async () => {
    if (activeConversation && sellerId) {
      await setTypingStatus(activeConversation.id, sellerId, true);
    }
  };

  const selectConversation = (conversation: Conversation) => {
    setActiveConversation(conversation);
    loadMessages(conversation.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate('/seller')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h1 className="text-2xl font-bold">Messages</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
          {/* Conversations List */}
          <Card className="lg:col-span-1 flex flex-col">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No conversations yet</p>
                </div>
              ) : (
                <div className="p-2">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={`p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                        activeConversation?.id === conv.id ? 'bg-accent' : ''
                      }`}
                      onClick={() => selectConversation(conv)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          {conv.customer_avatar ? (
                            <img src={conv.customer_avatar} alt="" className="h-10 w-10 rounded-full" />
                          ) : (
                            <span className="text-sm font-semibold">{conv.customer_name[0]}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-sm truncate">{conv.customer_name}</p>
                            {conv.unread_count > 0 && (
                              <Badge variant="destructive" className="h-5 px-1.5 text-xs">
                                {conv.unread_count}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.last_message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(conv.last_message_time), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 flex flex-col">
            {activeConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {activeConversation.customer_avatar ? (
                        <img src={activeConversation.customer_avatar} alt="" className="h-10 w-10 rounded-full" />
                      ) : (
                        <span className="text-sm font-semibold">{activeConversation.customer_name[0]}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{activeConversation.customer_name}</p>
                      {typingUsers.length > 0 && (
                        <p className="text-xs text-muted-foreground">typing...</p>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Booking</DropdownMenuItem>
                      <DropdownMenuItem>Block Customer</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  {messages.length === 0 ? (
                    <div className="text-center text-muted-foreground py-12">
                      <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isOwn = msg.sender_id === sellerId;
                        return (
                          <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] ${isOwn ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-3`}>
                              <p className="text-sm">{msg.content}</p>
                              {msg.attachment_url && (
                                <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="text-xs underline block mt-1">
                                  View attachment
                                </a>
                              )}
                              <p className="text-xs opacity-70 mt-1">
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Quick Replies */}
                <div className="px-4 py-2 border-t">
                  <ScrollArea className="w-full">
                    <div className="flex gap-2">
                      {QUICK_REPLIES.map((reply, idx) => (
                        <Button
                          key={idx}
                          variant="outline"
                          size="sm"
                          className="whitespace-nowrap"
                          onClick={() => setNewMessage(reply)}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          {reply.substring(0, 20)}...
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => {
                        setNewMessage(e.target.value);
                        handleTyping();
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      className="flex-1"
                    />
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
