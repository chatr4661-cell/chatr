import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NetworkQualityIndicatorProps {
  peerConnection?: RTCPeerConnection | null;
}

export const NetworkQualityIndicator = ({ peerConnection }: NetworkQualityIndicatorProps) => {
  const [quality, setQuality] = useState<'excellent' | 'good' | 'poor' | 'disconnected'>('excellent');
  const [stats, setStats] = useState({ packetLoss: 0, rtt: 0 });

  useEffect(() => {
    if (!peerConnection) return;

    const interval = setInterval(async () => {
      try {
        const stats = await peerConnection.getStats();
        let packetsLost = 0;
        let packetsReceived = 0;
        let roundTripTime = 0;

        stats.forEach(report => {
          if (report.type === 'inbound-rtp') {
            packetsLost = report.packetsLost || 0;
            packetsReceived = report.packetsReceived || 0;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            roundTripTime = report.currentRoundTripTime || 0;
          }
        });

        const totalPackets = packetsLost + packetsReceived;
        const packetLossRate = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;

        setStats({ packetLoss: packetLossRate, rtt: roundTripTime * 1000 });

        // Determine quality
        if (peerConnection.iceConnectionState === 'disconnected' || 
            peerConnection.iceConnectionState === 'failed') {
          setQuality('disconnected');
        } else if (packetLossRate > 5 || roundTripTime > 0.3) {
          setQuality('poor');
        } else if (packetLossRate > 2 || roundTripTime > 0.15) {
          setQuality('good');
        } else {
          setQuality('excellent');
        }
      } catch (error) {
        console.error('Failed to get network stats:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [peerConnection]);

  const getColor = () => {
    switch (quality) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-yellow-500';
      case 'poor': return 'text-orange-500';
      case 'disconnected': return 'text-red-500';
    }
  };

  const getLabel = () => {
    switch (quality) {
      case 'excellent': return 'Excellent';
      case 'good': return 'Good';
      case 'poor': return 'Poor';
      case 'disconnected': return 'Disconnected';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full"
    >
      {quality === 'disconnected' ? (
        <WifiOff className={`w-4 h-4 ${getColor()}`} />
      ) : (
        <Wifi className={`w-4 h-4 ${getColor()}`} />
      )}
      <span className="text-xs text-white font-medium">{getLabel()}</span>
    </motion.div>
  );
};
