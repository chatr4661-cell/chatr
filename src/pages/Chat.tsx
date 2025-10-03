import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Send, LogOut, Search, MoreVertical, Phone, Video, ArrowLeft, Check, CheckCheck } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  status: string;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  read_at: string | null;
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
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        loadProfile(session.user.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate('/auth');
      } else {
        setUser(session.user);
        loadProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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
    
    // Find or create conversation
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

    // Create new conversation
    const { data: newConversation, error } = await supabase
      .from('conversations')
      .insert({})
      .select()
      .single();

    if (error || !newConversation) {
      console.error('Error creating conversation:', error);
      return;
    }

    // Add participants
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

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim() || !conversationId || !user) return;

    const { error } = await supabase.from('messages').insert({
      content: messageInput,
      sender_id: user.id,
      conversation_id: conversationId,
    });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
      return;
    }

    setMessageInput('');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar - Contacts List */}
      <div className={`${selectedContact ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 border-r border-glass-border backdrop-blur-glass bg-gradient-glass`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-glass-border backdrop-blur-glass bg-background/50">
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
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="rounded-full hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              className="pl-10 rounded-full bg-background/50 border-glass-border"
            />
          </div>
        </div>

        {/* Contacts List */}
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
                <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold">
                    {contact.username[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
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
            {/* Chat Header */}
            <div className="p-4 border-b border-glass-border backdrop-blur-glass bg-gradient-glass">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden rounded-full"
                    onClick={() => setSelectedContact(null)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-semibold">
                      {selectedContact.username[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-foreground">{selectedContact.username}</h3>
                    <p className="text-xs text-muted-foreground">Online</p>
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

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4 bg-gradient-to-br from-background via-primary/5 to-accent/5">
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.map((message) => {
                  const isOwn = message.sender_id === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-sm shadow-glow'
                            : 'bg-card text-card-foreground rounded-bl-sm shadow-card backdrop-blur-glass border border-glass-border'
                        }`}
                      >
                        <p className="text-sm break-words">{message.content}</p>
                        <div className="flex items-center gap-1 justify-end mt-1">
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
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-glass-border backdrop-blur-glass bg-gradient-glass">
              <form onSubmit={sendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full bg-background/50 border-glass-border"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full h-11 w-11 shadow-glow"
                  disabled={!messageInput.trim()}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-gradient-to-br from-background via-primary/5 to-accent/10">
            <div className="text-center space-y-4">
              <div className="mx-auto w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center">
                <MessageCircle className="w-12 h-12 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">HealthMessenger</h2>
              <p className="text-muted-foreground max-w-md">
                Select a contact to start chatting with healthcare providers and manage your health.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
