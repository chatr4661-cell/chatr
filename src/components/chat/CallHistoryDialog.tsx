import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface CallHistoryDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  onCallBack: (receiverId: string, callType: 'voice' | 'video') => void;
}

export const CallHistoryDialog: React.FC<CallHistoryDialogProps> = ({
  open,
  onClose,
  userId,
  onCallBack
}) => {
  const [calls, setCalls] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (open) {
      loadCallHistory();
    }
  }, [open]);

  const loadCallHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calls')
        .select('*')
        .or(`caller_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setCalls(data || []);
    } catch (error) {
      console.error('Error loading call history:', error);
      toast.error('Failed to load call history');
    } finally {
      setLoading(false);
    }
  };

  const handleCallBack = (call: any) => {
    const receiverId = call.caller_id === userId ? call.receiver_id : call.caller_id;
    onCallBack(receiverId, call.call_type);
    onClose();
  };

  const getCallIcon = (call: any) => {
    const isMissed = call.missed;
    const isIncoming = call.receiver_id === userId;
    const callType = call.call_type;

    if (isMissed) {
      return <PhoneMissed className="h-4 w-4 text-destructive" />;
    }
    if (isIncoming) {
      return callType === 'video' ? 
        <Video className="h-4 w-4 text-green-600" /> : 
        <PhoneIncoming className="h-4 w-4 text-green-600" />;
    }
    return callType === 'video' ? 
      <Video className="h-4 w-4 text-blue-600" /> : 
      <PhoneOutgoing className="h-4 w-4 text-blue-600" />;
  };

  const getCallLabel = (call: any) => {
    const isMissed = call.missed;
    const isIncoming = call.receiver_id === userId;
    
    if (isMissed) return 'Missed';
    if (isIncoming) return 'Incoming';
    return 'Outgoing';
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Call History</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : calls.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Phone className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No call history yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {calls.map((call) => {
                const otherUserName = call.caller_id === userId ? call.receiver_name : call.caller_name;
                const otherUserAvatar = call.caller_id === userId ? call.receiver_avatar : call.caller_avatar;

                return (
                  <div
                    key={call.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 cursor-pointer group"
                    onClick={() => handleCallBack(call)}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={otherUserAvatar} />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {otherUserName?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{otherUserName}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {getCallIcon(call)}
                        <span>{getCallLabel(call)}</span>
                        {call.duration && <span>· {formatDuration(call.duration)}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCallBack(call);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {call.call_type === 'video' ? 
                        <Video className="h-5 w-5" /> : 
                        <Phone className="h-5 w-5" />
                      }
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
