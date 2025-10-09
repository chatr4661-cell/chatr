import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, ArrowLeft, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Call {
  id: string;
  call_type: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration: number | null;
  caller_id: string;
  receiver_id: string;
  caller_name: string;
  receiver_name: string;
  caller?: { username: string; avatar_url: string } | null;
  receiver?: { username: string; avatar_url: string } | null;
}

const CallHistory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'missed' | 'voice' | 'video'>('all');
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCalls();
    
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
      
      setUserId(user.id);

      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('started_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      // Fetch caller and receiver profiles separately
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
      toast({
        title: 'Error loading call history',
        description: 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteCall = async (callId: string) => {
    try {
      const { error } = await supabase
        .from('calls')
        .delete()
        .eq('id', callId);

      if (error) throw error;

      toast({
        title: 'Call deleted',
        description: 'Call removed from history',
      });
    } catch (error) {
      console.error('Error deleting call:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete call',
        variant: 'destructive',
      });
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
    
    return call.caller_id === userId ? 
      <PhoneOutgoing className="h-4 w-4 text-green-500" /> :
      <PhoneIncoming className="h-4 w-4 text-blue-500" />;
  };

  const getContactInfo = (call: Call) => {
    const isOutgoing = call.caller_id === userId;
    return {
      name: isOutgoing ? call.receiver?.username || call.receiver_name : call.caller?.username || call.caller_name,
      avatar: isOutgoing ? call.receiver?.avatar_url : call.caller?.avatar_url,
    };
  };

  const filteredCalls = calls.filter(call => {
    if (filter === 'all') return true;
    if (filter === 'missed') return call.status === 'rejected' || call.status === 'missed';
    if (filter === 'voice') return call.call_type === 'voice';
    if (filter === 'video') return call.call_type === 'video';
    return true;
  });

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">Call History</h1>
      </div>

      {/* Filters */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-12">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="missed">Missed</TabsTrigger>
          <TabsTrigger value="voice">Voice</TabsTrigger>
          <TabsTrigger value="video">Video</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Call List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading calls...</div>
        ) : filteredCalls.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No {filter !== 'all' ? filter : ''} calls found
          </div>
        ) : (
          filteredCalls.map((call) => {
            const contact = getContactInfo(call);
            const isOutgoing = call.caller_id === userId;

            return (
              <Card key={call.id} className="p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-4">
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
                      {(call.status === 'rejected' || call.status === 'missed') && (
                        <>
                          <span>•</span>
                          <Badge variant="destructive" className="text-xs">
                            {call.status}
                          </Badge>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(call.started_at), { addSuffix: true })}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCall(call.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        // Navigate to conversation
                        const contactId = isOutgoing ? call.receiver_id : call.caller_id;
                        navigate(`/chat?contact=${contactId}`);
                      }}
                    >
                      {call.call_type === 'video' ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CallHistory;
