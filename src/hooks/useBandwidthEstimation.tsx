import { useState, useEffect, useCallback } from 'react';

export interface BandwidthInfo {
  downlink: number; // Mbps
  rtt: number; // milliseconds
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g' | 'unknown';
  saveData: boolean;
  estimatedSpeed: 'very-slow' | 'slow' | 'moderate' | 'fast';
}

export const useBandwidthEstimation = () => {
  const [bandwidth, setBandwidth] = useState<BandwidthInfo>({
    downlink: 10,
    rtt: 50,
    effectiveType: 'unknown',
    saveData: false,
    estimatedSpeed: 'fast',
  });

  const [measuredSpeed, setMeasuredSpeed] = useState<number | null>(null);

  /**
   * Get network information from browser API
   */
  const updateNetworkInfo = useCallback(() => {
    // @ts-ignore - NetworkInformation is experimental
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      const effectiveType = connection.effectiveType || 'unknown';
      const downlink = connection.downlink || 10;
      const rtt = connection.rtt || 50;
      const saveData = connection.saveData || false;

      let estimatedSpeed: BandwidthInfo['estimatedSpeed'] = 'fast';
      
      if (effectiveType === 'slow-2g' || effectiveType === '2g' || downlink < 0.15) {
        estimatedSpeed = 'very-slow';
      } else if (effectiveType === '3g' || downlink < 0.5) {
        estimatedSpeed = 'slow';
      } else if (downlink < 2) {
        estimatedSpeed = 'moderate';
      }

      setBandwidth({
        downlink,
        rtt,
        effectiveType,
        saveData,
        estimatedSpeed,
      });
    }
  }, []);

  /**
   * Perform actual bandwidth test by downloading small resource
   */
  const measureBandwidth = useCallback(async () => {
    try {
      const startTime = performance.now();
      const testUrl = '/chatr-logo.png'; // Small test file
      
      const response = await fetch(testUrl, { cache: 'no-store' });
      const blob = await response.blob();
      
      const endTime = performance.now();
      const duration = (endTime - startTime) / 1000; // seconds
      const sizeInBits = blob.size * 8;
      const speedMbps = (sizeInBits / duration) / 1000000;
      
      setMeasuredSpeed(speedMbps);
      
      // Update estimated speed based on measurement
      let estimatedSpeed: BandwidthInfo['estimatedSpeed'] = 'fast';
      if (speedMbps < 0.1) {
        estimatedSpeed = 'very-slow';
      } else if (speedMbps < 0.5) {
        estimatedSpeed = 'slow';
      } else if (speedMbps < 2) {
        estimatedSpeed = 'moderate';
      }
      
      setBandwidth(prev => ({ ...prev, estimatedSpeed }));
      
    } catch (error) {
      console.error('Bandwidth measurement failed:', error);
    }
  }, []);

  useEffect(() => {
    updateNetworkInfo();
    
    // @ts-ignore
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
      return () => connection.removeEventListener('change', updateNetworkInfo);
    }
  }, [updateNetworkInfo]);

  // Measure bandwidth on mount
  useEffect(() => {
    measureBandwidth();
  }, [measureBandwidth]);

  return {
    bandwidth,
    measuredSpeed,
    measureBandwidth,
    isSlowNetwork: bandwidth.estimatedSpeed === 'very-slow' || bandwidth.estimatedSpeed === 'slow',
  };
};
