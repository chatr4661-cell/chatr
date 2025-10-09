import React, { useState, useEffect, useRef } from 'react';
import { getNetworkStats, getOptimalQuality, setBandwidth, type NetworkStats, type QualityLevel } from '@/utils/videoQualityManager';

interface UseNetworkStatsProps {
  peerConnection: RTCPeerConnection | null;
  enabled?: boolean;
  autoAdjust?: boolean;
}

export const useNetworkStats = ({ 
  peerConnection, 
  enabled = true,
  autoAdjust = true 
}: UseNetworkStatsProps) => {
  const [stats, setStats] = useState<NetworkStats>({
    bandwidth: 0,
    packetLoss: 0,
    rtt: 0,
    jitter: 0,
    fps: 0,
    resolution: ''
  });
  const [currentQuality, setCurrentQuality] = useState<QualityLevel>('ultra');
  const [connectionQuality, setConnectionQuality] = useState<'excellent' | 'good' | 'poor' | 'reconnecting'>('excellent');
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!peerConnection || !enabled) return;

    const updateStats = async () => {
      try {
        const networkStats = await getNetworkStats(peerConnection);
        setStats(networkStats);

        // Determine connection quality
        if (networkStats.packetLoss > 5 || networkStats.rtt > 300) {
          setConnectionQuality('poor');
        } else if (networkStats.packetLoss > 2 || networkStats.rtt > 150) {
          setConnectionQuality('good');
        } else {
          setConnectionQuality('excellent');
        }

        // Auto-adjust quality if enabled
        if (autoAdjust) {
          const optimalQuality = getOptimalQuality(networkStats);
          if (optimalQuality !== currentQuality) {
            await setBandwidth(peerConnection, optimalQuality);
            setCurrentQuality(optimalQuality);
            console.log(`📊 Quality auto-adjusted to ${optimalQuality}`);
          }
        }
      } catch (error) {
        console.error('Error monitoring network stats:', error);
      }
    };

    // Update stats every 2 seconds
    intervalRef.current = setInterval(updateStats, 2000);

    // Initial update
    updateStats();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [peerConnection, enabled, autoAdjust, currentQuality]);

  const manualSetQuality = async (quality: QualityLevel) => {
    if (!peerConnection) return;
    await setBandwidth(peerConnection, quality);
    setCurrentQuality(quality);
  };

  return {
    stats,
    currentQuality,
    connectionQuality,
    setQuality: manualSetQuality
  };
};
