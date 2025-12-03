import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GroupInfo {
  id: string;
  group_name: string | null;
  group_icon_url: string | null;
  community_description: string | null;
  is_group: boolean;
  member_count: number | null;
  created_by: string | null;
}

interface Participant {
  user_id: string;
  role: string;
  profiles: {
    id: string;
    username: string;
    avatar_url?: string;
    is_online?: boolean;
  };
}

export const useGroupChat = (conversationId: string | null) => {
  const [groupInfo, setGroupInfo] = useState<GroupInfo | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<string>('member');
  const [loading, setLoading] = useState(true);

  const loadGroupInfo = useCallback(async () => {
    if (!conversationId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load conversation info
      const { data: conv } = await supabase
        .from('conversations')
        .select('id, group_name, group_icon_url, community_description, is_group, member_count, created_by')
        .eq('id', conversationId)
        .single();

      if (conv) {
        setGroupInfo(conv);
      }

      // Load participants
      const { data: parts } = await supabase
        .from('conversation_participants')
        .select('user_id, role, profiles!inner(id, username, avatar_url, is_online)')
        .eq('conversation_id', conversationId);

      if (parts) {
        setParticipants(parts as unknown as Participant[]);
        const myRole = parts.find(p => p.user_id === user.id)?.role;
        setCurrentUserRole(myRole || 'member');
      }
    } catch (error) {
      console.error('Error loading group info:', error);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    loadGroupInfo();
  }, [loadGroupInfo]);

  // Subscribe to participant changes
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`group-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversation_participants',
          filter: `conversation_id=eq.${conversationId}`
        },
        () => {
          loadGroupInfo();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, loadGroupInfo]);

  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'owner';
  const isOwner = currentUserRole === 'owner';
  const isGroup = groupInfo?.is_group || false;

  const createGroup = async (name: string, memberIds: string[]): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create conversation
      const { data: conv, error: convError } = await supabase
        .from('conversations')
        .insert({
          group_name: name,
          is_group: true,
          created_by: user.id,
          member_count: memberIds.length + 1
        })
        .select('id')
        .single();

      if (convError) throw convError;

      // Add creator as owner
      await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conv.id,
          user_id: user.id,
          role: 'owner'
        });

      // Add members
      const memberInserts = memberIds.map(id => ({
        conversation_id: conv.id,
        user_id: id,
        role: 'member'
      }));

      await supabase
        .from('conversation_participants')
        .insert(memberInserts);

      toast.success('Group created successfully');
      return conv.id;
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
      return null;
    }
  };

  const updateGroupInfo = async (updates: Partial<GroupInfo>) => {
    if (!conversationId || !isAdmin) return false;

    try {
      const { error } = await supabase
        .from('conversations')
        .update(updates)
        .eq('id', conversationId);

      if (error) throw error;
      loadGroupInfo();
      return true;
    } catch (error) {
      console.error('Error updating group:', error);
      return false;
    }
  };

  const addMember = async (userId: string) => {
    if (!conversationId || !isAdmin) return false;

    try {
      const { error } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversationId,
          user_id: userId,
          role: 'member'
        });

      if (error) throw error;
      
      // Update member count
      await supabase
        .from('conversations')
        .update({ member_count: participants.length + 1 })
        .eq('id', conversationId);

      toast.success('Member added');
      loadGroupInfo();
      return true;
    } catch (error: any) {
      if (error.message?.includes('5 participants')) {
        toast.error('Group is full (max 5 members)');
      } else {
        toast.error('Failed to add member');
      }
      return false;
    }
  };

  const removeMember = async (userId: string) => {
    if (!conversationId || !isAdmin) return false;

    try {
      const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update member count
      await supabase
        .from('conversations')
        .update({ member_count: participants.length - 1 })
        .eq('id', conversationId);

      toast.success('Member removed');
      loadGroupInfo();
      return true;
    } catch (error) {
      toast.error('Failed to remove member');
      return false;
    }
  };

  const promoteToAdmin = async (userId: string) => {
    if (!conversationId || !isAdmin) return false;

    try {
      const { error } = await supabase
        .from('conversation_participants')
        .update({ role: 'admin' })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Member promoted to admin');
      loadGroupInfo();
      return true;
    } catch (error) {
      toast.error('Failed to promote member');
      return false;
    }
  };

  const demoteFromAdmin = async (userId: string) => {
    if (!conversationId || !isOwner) return false;

    try {
      const { error } = await supabase
        .from('conversation_participants')
        .update({ role: 'member' })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success('Admin demoted to member');
      loadGroupInfo();
      return true;
    } catch (error) {
      toast.error('Failed to demote admin');
      return false;
    }
  };

  const leaveGroup = async () => {
    if (!conversationId) return false;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);

      if (error) throw error;
      toast.success('You left the group');
      return true;
    } catch (error) {
      toast.error('Failed to leave group');
      return false;
    }
  };

  return {
    groupInfo,
    participants,
    currentUserRole,
    isAdmin,
    isOwner,
    isGroup,
    loading,
    createGroup,
    updateGroupInfo,
    addMember,
    removeMember,
    promoteToAdmin,
    demoteFromAdmin,
    leaveGroup,
    refresh: loadGroupInfo
  };
};