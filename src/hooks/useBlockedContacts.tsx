import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BlockedContact {
  id: string;
  blocked_user_id: string;
  blocked_at: string;
  reason?: string;
}

export const useBlockedContacts = () => {
  const { toast } = useToast();
  const [blockedContacts, setBlockedContacts] = useState<BlockedContact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBlockedContacts();
  }, []);

  const loadBlockedContacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('blocked_contacts')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setBlockedContacts(data || []);
    } catch (error) {
      console.error('Error loading blocked contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const blockContact = async (userId: string, reason?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('blocked_contacts')
        .insert({
          user_id: user.id,
          blocked_user_id: userId,
          reason,
        });

      if (error) throw error;

      await loadBlockedContacts();
      
      toast({
        title: 'Contact blocked',
        description: 'You will no longer receive messages from this contact',
      });

      return true;
    } catch (error: any) {
      console.error('Error blocking contact:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to block contact',
        variant: 'destructive',
      });
      return false;
    }
  };

  const unblockContact = async (userId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('blocked_contacts')
        .delete()
        .eq('user_id', user.id)
        .eq('blocked_user_id', userId);

      if (error) throw error;

      await loadBlockedContacts();
      
      toast({
        title: 'Contact unblocked',
        description: 'You can now receive messages from this contact',
      });

      return true;
    } catch (error: any) {
      console.error('Error unblocking contact:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to unblock contact',
        variant: 'destructive',
      });
      return false;
    }
  };

  const isBlocked = (userId: string): boolean => {
    return blockedContacts.some(bc => bc.blocked_user_id === userId);
  };

  return {
    blockedContacts,
    loading,
    blockContact,
    unblockContact,
    isBlocked,
    reload: loadBlockedContacts,
  };
};
