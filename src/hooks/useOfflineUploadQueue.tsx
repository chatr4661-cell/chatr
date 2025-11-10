import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

interface UploadQueueItem {
  id: string;
  file: File | Blob;
  path: string;
  bucket: string;
  metadata?: Record<string, any>;
  timestamp: number;
  retries: number;
}

/**
 * Queue-based offline upload system for files and media
 * Automatically retries failed uploads when connection is restored
 */
export const useOfflineUploadQueue = () => {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Back online - resuming uploads');
      processQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Offline - uploads queued');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Add item to upload queue
  const queueUpload = useCallback((
    file: File | Blob,
    path: string,
    bucket: string = 'media',
    metadata?: Record<string, any>
  ) => {
    const item: UploadQueueItem = {
      id: crypto.randomUUID(),
      file,
      path,
      bucket,
      metadata,
      timestamp: Date.now(),
      retries: 0,
    };

    setQueue(prev => [...prev, item]);

    if (isOnline) {
      processQueue();
    } else {
      toast.info('Upload queued - will send when online');
    }

    return item.id;
  }, [isOnline]);

  // Process upload queue
  const processQueue = useCallback(async () => {
    if (isProcessing || !isOnline || queue.length === 0) return;

    setIsProcessing(true);

    for (const item of queue) {
      try {
        // Dynamic import to avoid circular dependency
        const { supabase } = await import('@/integrations/supabase/client');

        const { data, error } = await supabase.storage
          .from(item.bucket)
          .upload(item.path, item.file, {
            cacheControl: '3600',
            upsert: false,
            ...item.metadata,
          });

        if (error) throw error;

        console.log(`✅ Uploaded: ${item.path}`);
        
        // Remove from queue on success
        setQueue(prev => prev.filter(i => i.id !== item.id));

      } catch (error) {
        console.error(`❌ Upload failed: ${item.path}`, error);

        // Retry logic (max 3 retries)
        if (item.retries < 3) {
          setQueue(prev => 
            prev.map(i => 
              i.id === item.id 
                ? { ...i, retries: i.retries + 1 }
                : i
            )
          );
        } else {
          // Max retries reached - remove from queue
          setQueue(prev => prev.filter(i => i.id !== item.id));
          toast.error(`Upload failed: ${item.path}`);
        }
      }
    }

    setIsProcessing(false);
  }, [isProcessing, isOnline, queue]);

  // Clear queue
  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  return {
    queue,
    queueUpload,
    clearQueue,
    isProcessing,
    pendingCount: queue.length,
  };
};
