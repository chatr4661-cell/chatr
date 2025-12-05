import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Video, PhoneIncoming, PhoneOutgoing, PhoneMissed, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface CallLog {
  id: string;
  caller_id: string;
  receiver_id: string;
  caller_name: string;
  caller_avatar: string | null;
  receiver_name: string;
  receiver_avatar: string | null;
  call_type: 'audio' | 'video';
  status: string;
  duration: number;
  missed: boolean;
  created_at: string;
}

const DesktopCalls: React.FC = () => {
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchCalls();
  }, []);

  const fetchCalls = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);

      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .or(`caller_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setCalls((data as CallLog[]) || []);
    } catch (error) {
      console.error('Error fetching calls:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCalls = calls.filter(c => {
    const name = c.caller_id === currentUserId ? c.receiver_name : c.caller_name;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const formatDuration = (seconds: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallIcon = (call: CallLog) => {
    if (call.missed) return <PhoneMissed className="h-4 w-4 text-destructive" />;
    if (call.caller_id === currentUserId) return <PhoneOutgoing className="h-4 w-4 text-green-500" />;
    return <PhoneIncoming className="h-4 w-4 text-blue-500" />;
  };

  return (
    <div className="flex h-full">
      {/* Calls List */}
      <div className="w-80 border-r border-border flex flex-col bg-card/50">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold mb-4">Calls</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search call history..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-muted/50"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1">
                    <div className="h-4 w-24 bg-muted rounded mb-2" />
                    <div className="h-3 w-16 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="p-8 text-center">
              <Phone className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'No calls found' : 'No call history'}
              </p>
            </div>
          ) : (
            <div className="py-2">
              {filteredCalls.map((call) => {
                const isOutgoing = call.caller_id === currentUserId;
                const contactName = isOutgoing ? call.receiver_name : call.caller_name;
                const contactAvatar = isOutgoing ? call.receiver_avatar : call.caller_avatar;

                return (
                  <div
                    key={call.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={contactAvatar || undefined} />
                      <AvatarFallback>
                        {contactName?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium truncate",
                        call.missed && "text-destructive"
                      )}>
                        {contactName || 'Unknown'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {getCallIcon(call)}
                        <span>{call.call_type === 'video' ? 'Video' : 'Voice'}</span>
                        {call.duration > 0 && (
                          <>
                            <span>•</span>
                            <span>{formatDuration(call.duration)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(call.created_at), 'MMM d')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(call.created_at), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Call Actions Placeholder */}
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <div className="flex justify-center gap-4 mb-6">
            <Button size="lg" className="rounded-full h-16 w-16">
              <Phone className="h-6 w-6" />
            </Button>
            <Button size="lg" variant="secondary" className="rounded-full h-16 w-16">
              <Video className="h-6 w-6" />
            </Button>
          </div>
          <h3 className="text-lg font-medium text-muted-foreground">
            Make a call
          </h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Select a contact or dial a number to start calling
          </p>
        </div>
      </div>
    </div>
  );
};

export default DesktopCalls;
