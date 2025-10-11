import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Search, MessageCircle, Phone, Video, Loader2 } from 'lucide-react';

export default function GlobalContacts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadAllUsers();
    }
  }, [user]);

  const loadUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/auth');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    setUser(profile);
  };

  const loadAllUsers = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .order('is_online', { ascending: false })
      .order('username');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive'
      });
    } else {
      setAllUsers(data || []);
    }
    
    setIsLoading(false);
  };

  const startChat = (contact: any) => {
    navigate('/chat', { state: { selectedContact: contact } });
  };

  const startCall = async (contact: any, callType: 'voice' | 'video') => {
    try {
      console.log('🎥 Starting call from global contacts:', { callType, to: contact.username });
      
      // Get current user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user?.id)
        .single();

      const { data: convData, error: convError } = await supabase.rpc('create_direct_conversation', {
        other_user_id: contact.id
      });

      if (convError) throw convError;

      const { error: callError } = await supabase
        .from('calls')
        .insert({
          conversation_id: convData,
          caller_id: user?.id,
          caller_name: profile?.username || user?.email || 'Unknown',
          caller_avatar: profile?.avatar_url,
          receiver_id: contact.id,
          receiver_name: contact.username || contact.email || 'Unknown',
          receiver_avatar: contact.avatar_url,
          call_type: callType,
          status: 'ringing'
        });

      if (callError) {
        console.error('❌ Failed to create call:', callError);
        throw callError;
      }

      console.log('✅ Call created successfully');
      toast({
        title: 'Success',
        description: `${callType === 'voice' ? 'Voice' : 'Video'} call started`
      });
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: 'Error',
        description: 'Failed to start call',
        variant: 'destructive'
      });
    }
  };

  const filteredUsers = allUsers.filter(u =>
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/chat')}
          className="rounded-full hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold">Find People</h1>
          <p className="text-sm text-muted-foreground">Message or call anyone on chatr</p>
        </div>
      </div>

      {/* Search */}
      <div className="p-4 border-b bg-card/30">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-background border-border/50 focus-visible:border-primary"
          />
        </div>
      </div>

      {/* User List */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No users found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Try a different search</p>
            </div>
          ) : (
            filteredUsers.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-all group"
              >
                <div className="relative">
                  <Avatar className="w-14 h-14 border-2 border-primary/10">
                    <AvatarImage src={contact.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-lg font-semibold">
                      {contact.username?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {contact.is_online && (
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-background animate-pulse" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">
                    {contact.username || contact.phone_number}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate">
                    {contact.phone_number}
                  </p>
                  {contact.is_online && (
                    <Badge variant="outline" className="text-xs mt-1 border-green-500/50 text-green-600">
                      Online
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startCall(contact, 'voice')}
                    className="rounded-full h-9 w-9 hover:bg-primary/10 hover:text-primary"
                    title="Voice Call"
                  >
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => startCall(contact, 'video')}
                    className="rounded-full h-9 w-9 hover:bg-primary/10 hover:text-primary"
                    title="Video Call"
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="default"
                    size="icon"
                    onClick={() => startChat(contact)}
                    className="rounded-full h-9 w-9 bg-primary hover:bg-primary/90"
                    title="Message"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
