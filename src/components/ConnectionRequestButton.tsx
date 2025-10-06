import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, Clock, UserX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ConnectionRequestButtonProps {
  userId: string;
  currentUserId: string;
  onConnectionAccepted?: () => void;
}

export const ConnectionRequestButton = ({ 
  userId, 
  currentUserId,
  onConnectionAccepted 
}: ConnectionRequestButtonProps) => {
  const [status, setStatus] = useState<'none' | 'pending-sent' | 'pending-received' | 'accepted'>('none');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkConnectionStatus();
  }, [userId, currentUserId]);

  const checkConnectionStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('connection_requests')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUserId})`)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setStatus('none');
        setRequestId(null);
      } else if (data.status === 'accepted') {
        setStatus('accepted');
        setRequestId(data.id);
      } else if (data.sender_id === currentUserId) {
        setStatus('pending-sent');
        setRequestId(data.id);
      } else {
        setStatus('pending-received');
        setRequestId(data.id);
      }
    } catch (error: any) {
      console.error('Error checking connection status:', error);
    }
  };

  const sendRequest = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('connection_requests')
        .insert([{
          sender_id: currentUserId,
          receiver_id: userId,
          status: 'pending'
        }])
        .select()
        .single();

      if (error) throw error;

      setStatus('pending-sent');
      setRequestId(data.id);
      toast({
        title: 'Connection Request Sent',
        description: 'Your connection request has been sent',
      });
    } catch (error: any) {
      console.error('Error sending request:', error);
      toast({
        title: 'Error',
        description: 'Failed to send connection request',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async () => {
    if (!requestId) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('connection_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      if (error) throw error;

      setStatus('accepted');
      toast({
        title: 'Connection Accepted',
        description: 'You are now connected',
      });
      onConnectionAccepted?.();
    } catch (error: any) {
      console.error('Error accepting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to accept connection request',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const rejectRequest = async () => {
    if (!requestId) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('connection_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      setStatus('none');
      setRequestId(null);
      toast({
        title: 'Request Rejected',
        description: 'Connection request has been rejected',
      });
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast({
        title: 'Error',
        description: 'Failed to reject connection request',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const cancelRequest = async () => {
    if (!requestId) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('connection_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      setStatus('none');
      setRequestId(null);
      toast({
        title: 'Request Cancelled',
        description: 'Connection request has been cancelled',
      });
    } catch (error: any) {
      console.error('Error cancelling request:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel connection request',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'accepted') {
    return (
      <Button variant="outline" size="sm" disabled className="gap-2">
        <UserCheck className="h-4 w-4" />
        <span>Connected</span>
      </Button>
    );
  }

  if (status === 'pending-sent') {
    return (
      <Button 
        variant="outline" 
        size="sm" 
        onClick={cancelRequest}
        disabled={loading}
        className="gap-2"
      >
        <Clock className="h-4 w-4" />
        <span>Pending</span>
      </Button>
    );
  }

  if (status === 'pending-received') {
    return (
      <div className="flex gap-2">
        <Button 
          variant="default" 
          size="sm" 
          onClick={acceptRequest}
          disabled={loading}
          className="gap-2"
        >
          <UserCheck className="h-4 w-4" />
          <span>Accept</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={rejectRequest}
          disabled={loading}
        >
          <UserX className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button 
      variant="default" 
      size="sm" 
      onClick={sendRequest}
      disabled={loading}
      className="gap-2"
    >
      <UserPlus className="h-4 w-4" />
      <span>Connect</span>
    </Button>
  );
};
