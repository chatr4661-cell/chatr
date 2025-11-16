import { useCallback } from 'react';
import { BackgroundTask } from '@capawesome/capacitor-background-task';
import { toast } from 'sonner';

/**
 * Background task scheduler hook
 * Enables background sync for messages, uploads, reminders, and delivery updates
 */
export const useBackgroundTask = () => {
  /**
   * Run a background task
   * Task will continue even if app is closed/backgrounded
   */
  const runBackgroundTask = useCallback(async (
    taskCallback: () => Promise<void>,
    options?: {
      taskName?: string;
      onTimeout?: () => void;
      timeoutMs?: number;
    }
  ) => {
    try {
      const taskId = await BackgroundTask.beforeExit(async () => {
        console.log(`🔄 Background task started: ${options?.taskName || 'unnamed'}`);
        
        try {
          // Run the actual task
          await taskCallback();
          console.log(`✅ Background task completed: ${options?.taskName || 'unnamed'}`);
        } catch (error) {
          console.error(`❌ Background task failed: ${options?.taskName || 'unnamed'}`, error);
        } finally {
          // Finish the background task
          BackgroundTask.finish({ taskId });
        }
      });

      return taskId;
    } catch (error) {
      console.error('Background task initialization failed:', error);
      toast.error('Background sync failed');
      return null;
    }
  }, []);

  /**
   * Sync messages in background
   */
  const syncMessagesBackground = useCallback(async (syncCallback: () => Promise<void>) => {
    return runBackgroundTask(syncCallback, {
      taskName: 'message-sync',
      timeoutMs: 30000 // 30 seconds
    });
  }, [runBackgroundTask]);

  /**
   * Upload files in background
   */
  const uploadFilesBackground = useCallback(async (uploadCallback: () => Promise<void>) => {
    return runBackgroundTask(uploadCallback, {
      taskName: 'file-upload',
      timeoutMs: 120000 // 2 minutes for large files
    });
  }, [runBackgroundTask]);

  /**
   * Sync contacts in background
   */
  const syncContactsBackground = useCallback(async (syncCallback: () => Promise<void>) => {
    return runBackgroundTask(syncCallback, {
      taskName: 'contact-sync',
      timeoutMs: 60000 // 1 minute
    });
  }, [runBackgroundTask]);

  /**
   * Check for updates in background
   */
  const checkUpdatesBackground = useCallback(async (checkCallback: () => Promise<void>) => {
    return runBackgroundTask(checkCallback, {
      taskName: 'update-check',
      timeoutMs: 15000 // 15 seconds
    });
  }, [runBackgroundTask]);

  return {
    runBackgroundTask,
    syncMessagesBackground,
    uploadFilesBackground,
    syncContactsBackground,
    checkUpdatesBackground
  };
};
