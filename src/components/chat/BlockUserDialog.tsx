import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BlockUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  blockedUserId: string;
  blockedUsername: string;
  onBlocked?: () => void;
}

export const BlockUserDialog: React.FC<BlockUserDialogProps> = ({
  open,
  onOpenChange,
  userId,
  blockedUserId,
  blockedUsername,
  onBlocked
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBlock = async () => {
    if (!userId || !blockedUserId) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('blocked_contacts')
        .insert({
          user_id: userId,
          blocked_user_id: blockedUserId,
          reason: reason.trim() || null,
          blocked_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success(`${blockedUsername} has been blocked`);
      onBlocked?.();
      onOpenChange(false);
      setReason('');
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Failed to block user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-[400px]">
        <AlertDialogHeader>
          <AlertDialogTitle>Block {blockedUsername}?</AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            Blocked contacts will no longer be able to send you messages or see your online status.
            You can unblock them anytime from settings.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2">
          <Label htmlFor="reason" className="text-sm">
            Reason (optional)
          </Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why are you blocking this contact?"
            className="mt-1.5 h-20 resize-none text-sm"
            maxLength={200}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleBlock} 
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? 'Blocking...' : 'Block'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Component to list and manage blocked users
export const BlockedUsersList: React.FC<{ userId: string }> = ({ userId }) => {
  const [blockedUsers, setBlockedUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    loadBlockedUsers();
  }, [userId]);

  const loadBlockedUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('blocked_contacts')
        .select(`
          id,
          blocked_user_id,
          reason,
          blocked_at,
          blocked_user:blocked_user_id(username, avatar_url)
        `)
        .eq('user_id', userId);

      if (error) throw error;
      setBlockedUsers(data || []);
    } catch (error) {
      console.error('Error loading blocked users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (blockedContactId: string) => {
    try {
      const { error } = await supabase
        .from('blocked_contacts')
        .delete()
        .eq('id', blockedContactId);

      if (error) throw error;
      toast.success('User unblocked');
      loadBlockedUsers();
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Failed to unblock user');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="w-5 h-5 border-2 border-primary/60 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (blockedUsers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No blocked contacts
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {blockedUsers.map((blocked) => (
        <div 
          key={blocked.id}
          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
        >
          <div>
            <p className="font-medium text-sm">{blocked.blocked_user?.username || 'Unknown'}</p>
            {blocked.reason && (
              <p className="text-xs text-muted-foreground">{blocked.reason}</p>
            )}
          </div>
          <button
            onClick={() => handleUnblock(blocked.id)}
            className="text-xs text-primary hover:underline"
          >
            Unblock
          </button>
        </div>
      ))}
    </div>
  );
};
