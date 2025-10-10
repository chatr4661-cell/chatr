import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BackupOptions {
  includeMedia?: boolean;
  conversations?: string[];
}

export const useCloudBackup = (userId: string) => {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [lastBackup, setLastBackup] = useState<Date | null>(null);

  const createBackup = useCallback(async (options: BackupOptions = {}) => {
    setIsBackingUp(true);
    try {
      // Fetch all user conversations
      const { data: conversations, error: convError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (convError) throw convError;

      const conversationIds = options.conversations || 
        conversations?.map(c => c.conversation_id) || [];

      // Fetch messages from selected conversations
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('*')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: true });

      if (msgError) throw msgError;

      // Fetch conversation metadata
      const { data: convMetadata, error: metaError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds);

      if (metaError) throw metaError;

      const backup = {
        version: '1.0',
        userId,
        createdAt: new Date().toISOString(),
        conversations: convMetadata,
        messages: messages?.map(msg => ({
          ...msg,
          // Exclude media URLs if not requested
          media_url: options.includeMedia ? msg.media_url : null,
        })),
        messageCount: messages?.length || 0,
      };

      // Store backup in Supabase storage
      const backupKey = `backups/${userId}/${Date.now()}.json`;
      const { error: uploadError } = await supabase.storage
        .from('chat-backups')
        .upload(backupKey, JSON.stringify(backup), {
          contentType: 'application/json',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Save backup metadata
      await supabase.from('backup_history').insert({
        user_id: userId,
        backup_key: backupKey,
        message_count: backup.messageCount,
        size_bytes: new Blob([JSON.stringify(backup)]).size,
        includes_media: options.includeMedia || false,
      });

      setLastBackup(new Date());
      toast.success(`Backup created: ${backup.messageCount} messages`);
      
      return backup;
    } catch (error) {
      console.error('Backup failed:', error);
      toast.error('Failed to create backup');
      throw error;
    } finally {
      setIsBackingUp(false);
    }
  }, [userId]);

  const restoreBackup = useCallback(async (backupKey: string) => {
    setIsRestoring(true);
    try {
      // Download backup file
      const { data, error: downloadError } = await supabase.storage
        .from('chat-backups')
        .download(backupKey);

      if (downloadError) throw downloadError;

      const backup = JSON.parse(await data.text());

      // Validate backup format
      if (backup.version !== '1.0' || backup.userId !== userId) {
        throw new Error('Invalid backup file');
      }

      // Restore conversations (if they don't exist)
      for (const conv of backup.conversations) {
        const { error } = await supabase
          .from('conversations')
          .upsert(conv, { onConflict: 'id' });
        
        if (error) console.error('Failed to restore conversation:', error);
      }

      // Restore messages
      let restoredCount = 0;
      for (const msg of backup.messages) {
        const { error } = await supabase
          .from('messages')
          .upsert(msg, { onConflict: 'id' });
        
        if (!error) restoredCount++;
      }

      toast.success(`Restored ${restoredCount} messages`);
      
      return { restoredCount, totalMessages: backup.messageCount };
    } catch (error) {
      console.error('Restore failed:', error);
      toast.error('Failed to restore backup');
      throw error;
    } finally {
      setIsRestoring(false);
    }
  }, [userId]);

  const listBackups = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('backup_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to list backups:', error);
      return [];
    }
  }, [userId]);

  const deleteBackup = useCallback(async (backupKey: string) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('chat-backups')
        .remove([backupKey]);

      if (storageError) throw storageError;

      // Delete metadata
      const { error: dbError } = await supabase
        .from('backup_history')
        .delete()
        .eq('backup_key', backupKey)
        .eq('user_id', userId);

      if (dbError) throw dbError;

      toast.success('Backup deleted');
    } catch (error) {
      console.error('Failed to delete backup:', error);
      toast.error('Failed to delete backup');
    }
  }, [userId]);

  return {
    createBackup,
    restoreBackup,
    listBackups,
    deleteBackup,
    isBackingUp,
    isRestoring,
    lastBackup,
  };
};
