import { useState, useEffect, useCallback } from 'react';

export interface DataUsageStats {
  totalBytes: number;
  sessionBytes: number;
  cachedBytes: number;
  savedBytes: number;
  mediaBytes: number;
  messageBytes: number;
  lastReset: string;
}

const STORAGE_KEY = 'data-usage-stats';

export const useDataUsageTracking = () => {
  const [stats, setStats] = useState<DataUsageStats>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      totalBytes: 0,
      sessionBytes: 0,
      cachedBytes: 0,
      savedBytes: 0,
      mediaBytes: 0,
      messageBytes: 0,
      lastReset: new Date().toISOString(),
    };
  });

  // Session tracking
  const [sessionStart] = useState(Date.now());

  /**
   * Track data usage from fetch requests
   */
  const trackRequest = useCallback((
    url: string,
    bytes: number,
    fromCache: boolean = false
  ) => {
    setStats(prev => {
      const isMedia = url.includes('storage') || url.includes('media');
      const isMessage = url.includes('messages');
      
      return {
        ...prev,
        totalBytes: prev.totalBytes + bytes,
        sessionBytes: prev.sessionBytes + bytes,
        cachedBytes: fromCache ? prev.cachedBytes + bytes : prev.cachedBytes,
        savedBytes: fromCache ? prev.savedBytes + bytes : prev.savedBytes,
        mediaBytes: isMedia ? prev.mediaBytes + bytes : prev.mediaBytes,
        messageBytes: isMessage ? prev.messageBytes + bytes : prev.messageBytes,
      };
    });
  }, []);

  /**
   * Reset stats
   */
  const resetStats = useCallback(() => {
    setStats({
      totalBytes: 0,
      sessionBytes: 0,
      cachedBytes: 0,
      savedBytes: 0,
      mediaBytes: 0,
      messageBytes: 0,
      lastReset: new Date().toISOString(),
    });
  }, []);

  /**
   * Format bytes to human readable
   */
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }, []);

  /**
   * Get percentage saved by caching
   */
  const getSavingsPercentage = useCallback((): number => {
    if (stats.totalBytes === 0) return 0;
    return ((stats.savedBytes / stats.totalBytes) * 100);
  }, [stats]);

  // Persist stats
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  }, [stats]);

  // Intercept fetch to track data usage
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Clone response to read body
      const clonedResponse = response.clone();
      
      try {
        const blob = await clonedResponse.blob();
        const fromCache = response.headers.get('x-cache') === 'HIT' || 
                         response.type === 'opaque';
        
        trackRequest(args[0].toString(), blob.size, fromCache);
      } catch (error) {
        // Ignore errors
      }
      
      return response;
    };
    
    return () => {
      window.fetch = originalFetch;
    };
  }, [trackRequest]);

  return {
    stats,
    trackRequest,
    resetStats,
    formatBytes,
    getSavingsPercentage,
    sessionDuration: (Date.now() - sessionStart) / 1000 / 60, // minutes
  };
};
