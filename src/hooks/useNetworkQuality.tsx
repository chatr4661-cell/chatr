import { useState, useEffect } from 'react';

interface NetworkQuality {
  type: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export const useNetworkQuality = () => {
  const [quality, setQuality] = useState<'fast' | 'slow' | 'offline'>('fast');

  useEffect(() => {
    const updateQuality = () => {
      if (!navigator.onLine) {
        setQuality('offline');
        return;
      }

      // @ts-ignore - NetworkInformation is experimental
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      
      if (connection) {
        const effectiveType = connection.effectiveType;
        const rtt = connection.rtt;
        
        // Detect 2G/slow networks
        if (effectiveType === 'slow-2g' || effectiveType === '2g' || rtt > 1000) {
          setQuality('slow');
        } else if (effectiveType === '3g' || rtt > 500) {
          setQuality('slow');
        } else {
          setQuality('fast');
        }
      } else {
        // No network info API, assume fast
        setQuality('fast');
      }
    };

    updateQuality();

    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', updateQuality);
      return () => connection.removeEventListener('change', updateQuality);
    }

    window.addEventListener('online', updateQuality);
    window.addEventListener('offline', updateQuality);

    return () => {
      window.removeEventListener('online', updateQuality);
      window.removeEventListener('offline', updateQuality);
    };
  }, []);

  return quality;
};
