import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Trash2, Search, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CallHistoryEmptyState, CallListSkeleton } from "@/components/ui/PremiumEmptyStates";

interface Call {
  id: string;
  call_type: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration: number | null;
  caller_id: string;
  receiver_id: string;
  caller?: { username: string; avatar_url: string } | null;
  receiver?: { username: string; avatar_url: string } | null;
}

export default function CallHistory() {
  const navigate = useNavigate();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'missed'>('all');
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewCall, setShowNewCall] = useState(false);

  useEffect(() => {
    loadCalls();
    loadContacts();

    const channel = supabase
      .channel('call-history')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'calls',
      }, () => {
        loadCalls();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadCalls = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      const callsWithProfiles = await Promise.all((data || []).map(async (call) => {
        const [callerProfile, receiverProfile] = await Promise.all([
          supabase.from('profiles').select('username, avatar_url').eq('id', call.caller_id).single(),
          supabase.from('profiles').select('username, avatar_url').eq('id', call.receiver_id).single()
        ]);
        
        return {
          ...call,
          caller: callerProfile.data,
          receiver: receiverProfile.data
        } as Call;
      }));
      
      setCalls(callsWithProfiles);
    } catch (error) {
      console.error('Error loading calls:', error);
      toast.error('Failed to load call history');
    } finally {
      setLoading(false);
    }
  };

  const loadContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)
        .order('username');

      if (error) throw error;
      setContacts(data || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const deleteCall = async (callId: string) => {
    try {
      const { error } = await supabase
        .from('calls')
        .delete()
        .eq('id', callId);

      if (error) throw error;

      setCalls(calls.filter(call => call.id !== callId));
      toast.success('Call deleted');
    } catch (error) {
      console.error('Error deleting call:', error);
      toast.error('Failed to delete call');
    }
  };

  const startCall = async (contactId: string, callType: 'voice' | 'video') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .contains('participant_ids', [user.id, contactId])
        .single();

      let conversationId = conversation?.id;

      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({
            participant_ids: [user.id, contactId],
            is_group: false
          })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // Get caller profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();

      // Get receiver profile
      const { data: receiverProfile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', contactId)
        .single();

      const { data: callData, error: callError } = await supabase
        .from('calls')
        .insert({
          conversation_id: conversationId,
          caller_id: user.id,
          caller_name: profile?.username || 'Unknown',
          caller_avatar: profile?.avatar_url,
          receiver_id: contactId,
          receiver_name: receiverProfile?.username || 'Unknown',
          receiver_avatar: receiverProfile?.avatar_url,
          call_type: callType,
          status: 'ringing'
        })
        .select()
        .single();

      if (callError) throw callError;

      // Send FCM push notification to receiver
      try {
        console.log('📲 Sending FCM call notification to:', contactId);
        await supabase.functions.invoke('fcm-notify', {
          body: {
            type: 'call',
            receiverId: contactId,
            callerId: user.id,
            callerName: profile?.username || 'Unknown',
            callerAvatar: profile?.avatar_url || '',
            callId: callData.id,
            callType: callType
          }
        });
        console.log('✅ FCM call notification sent');
      } catch (fcmError) {
        console.warn('⚠️ FCM notification failed:', fcmError);
      }

      toast.success(`${callType === 'voice' ? 'Voice' : 'Video'} call started`);
      setShowNewCall(false);
      loadCalls();
    } catch (error) {
      console.error('Error starting call:', error);
      toast.error('Failed to start call');
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallIcon = (call: Call) => {
    if (call.call_type === 'video') return <Video className="h-4 w-4" />;
    
    if (call.status === 'rejected' || call.status === 'missed') {
      return <PhoneMissed className="h-4 w-4 text-destructive" />;
    }
    
    return call.caller_id === currentUserId ? 
      <PhoneOutgoing className="h-4 w-4 text-green-500" /> :
      <PhoneIncoming className="h-4 w-4 text-blue-500" />;
  };

  const getContactInfo = (call: Call) => {
    const isOutgoing = call.caller_id === currentUserId;
    return {
      name: isOutgoing ? call.receiver?.username : call.caller?.username,
      avatar: isOutgoing ? call.receiver?.avatar_url : call.caller?.avatar_url,
    };
  };

  const filteredCalls = activeFilter === 'all' 
    ? calls 
    : calls.filter(call => call.status === 'missed');

  const filteredContacts = contacts.filter(contact =>
    contact.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.phone?.includes(searchQuery)
  );

  return (
    <div className="flex flex-col h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold">Calls</h1>
          <Dialog open={showNewCall} onOpenChange={setShowNewCall}>
            <DialogTrigger asChild>
              <Button size="icon" variant="ghost">
                <UserPlus className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>New Call</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search contacts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent"
                      >
                        <Avatar>
                          <AvatarImage src={contact.avatar_url} />
                          <AvatarFallback>
                            {contact.username?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold">{contact.username}</p>
                          {contact.phone && (
                            <p className="text-sm text-muted-foreground">{contact.phone}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => startCall(contact.id, 'voice')}
                          >
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => startCall(contact.id, 'video')}
                          >
                            <Video className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as 'all' | 'missed')} className="w-full px-4">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="missed">Missed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {loading ? (
            <CallListSkeleton count={6} />
          ) : filteredCalls.length === 0 ? (
            <CallHistoryEmptyState onStartCall={() => setShowNewCall(true)} />
          ) : (
            filteredCalls.map((call) => {
              const contact = getContactInfo(call);
              const isOutgoing = call.caller_id === currentUserId;

              return (
                <div key={call.id} className="flex items-center gap-4 p-4 rounded-lg hover:bg-accent transition-colors">
                  <Avatar>
                    <AvatarImage src={contact.avatar} />
                    <AvatarFallback>{contact.name?.[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{contact.name}</p>
                      {getCallIcon(call)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{isOutgoing ? 'Outgoing' : 'Incoming'}</span>
                      {call.duration && call.status === 'ended' && (
                        <>
                          <span>•</span>
                          <span>{formatDuration(call.duration)}</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
                    </p>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteCall(call.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
