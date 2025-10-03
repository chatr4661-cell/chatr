import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Phone, Video, ArrowLeft, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';
import VideoCall from '@/components/VideoCall';
import VoiceCall from '@/components/VoiceCall';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';

export default function ChatEnhanced() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [activeCall, setActiveCall] = useState<{ type: 'voice' | 'video'; conversationId: string } | null>(null);
  
  // Enable real-time notifications
  useRealtimeNotifications(user?.id);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadContacts();
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
        .limit(20);

      setContacts(profiles || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="h-6 px-2"
          >
            <ArrowLeft className="h-3 w-3" />
          </Button>
          <h1 className="text-sm font-bold">Contacts</h1>
        </div>

        <div className="space-y-2">
          {contacts.map((contact) => (
            <Card key={contact.id} className="p-3 backdrop-blur-xl bg-white/5 border-white/10">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={contact.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xs">
                    {contact.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-semibold truncate">{contact.username}</h3>
                  <p className="text-[10px] text-muted-foreground truncate">{contact.status}</p>
                </div>

                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openChat(contact)}
                    className="h-7 w-7 p-0"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedContact(contact);
                      startVoiceCall(contact);
                    }}
                    className="h-7 w-7 p-0"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedContact(contact);
                      startVideoCall(contact);
                    }}
                    className="h-7 w-7 p-0"
                  >
                    <Video className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {contacts.length === 0 && (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No contacts found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}