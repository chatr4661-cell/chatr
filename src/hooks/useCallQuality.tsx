import React, { useState, useEffect, useCallback } from 'react';

interface CallQualityMetrics {
  bitrate: number;
  packetLoss: number;
  jitter: number;
  rtt: number; // Round-trip time
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

interface CallQualityConfig {
  minBitrate: number;
  maxPacketLoss: number;
  maxJitter: number;
  maxRTT: number;
}

const DEFAULT_CONFIG: CallQualityConfig = {
  minBitrate: 500000, // 500 kbps
  maxPacketLoss: 0.05, // 5%
  maxJitter: 50, // 50ms
  maxRTT: 300, // 300ms
};

export const useCallQuality = (peerConnection: RTCPeerConnection | null) => {
  const [metrics, setMetrics] = useState<CallQualityMetrics>({
    bitrate: 0,
    packetLoss: 0,
    jitter: 0,
    rtt: 0,
    quality: 'good',
  });

  const [adaptiveSettings, setAdaptiveSettings] = useState({
    videoEnabled: true,
    videoQuality: 'high' as 'high' | 'medium' | 'low',
  });

  useEffect(() => {
    if (!peerConnection) return;

    const intervalId = setInterval(async () => {
      try {
        const stats = await peerConnection.getStats();
        const newMetrics = analyzeStats(stats);
        setMetrics(newMetrics);

        // Adaptive quality adjustment
        adjustQuality(newMetrics);
      } catch (error) {
        console.error('Failed to get call stats:', error);
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(intervalId);
  }, [peerConnection]);

  const analyzeStats = (stats: RTCStatsReport): CallQualityMetrics => {
    let bitrate = 0;
    let packetLoss = 0;
    let jitter = 0;
    let rtt = 0;

    stats.forEach((report) => {
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        // Calculate bitrate
        if (report.bytesReceived && report.timestamp) {
          const now = report.timestamp;
          const bytes = report.bytesReceived;
          
          // Store previous values for calculation
          const prevTimestamp = (report as any).prevTimestamp;
          const prevBytes = (report as any).prevBytes;
          
          if (prevTimestamp && prevBytes) {
            const timeDiff = (now - prevTimestamp) / 1000; // seconds
            const bytesDiff = bytes - prevBytes;
            bitrate = (bytesDiff * 8) / timeDiff; // bits per second
          }
          
          (report as any).prevTimestamp = now;
          (report as any).prevBytes = bytes;
        }

        // Packet loss
        if (report.packetsLost && report.packetsReceived) {
          const totalPackets = report.packetsLost + report.packetsReceived;
          packetLoss = totalPackets > 0 ? report.packetsLost / totalPackets : 0;
        }

        // Jitter
        if (report.jitter) {
          jitter = report.jitter * 1000; // Convert to ms
        }
      }

      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        if (report.currentRoundTripTime) {
          rtt = report.currentRoundTripTime * 1000; // Convert to ms
        }
      }
    });

    // Determine overall quality
    let quality: CallQualityMetrics['quality'] = 'excellent';
    
    if (
      bitrate < DEFAULT_CONFIG.minBitrate ||
      packetLoss > DEFAULT_CONFIG.maxPacketLoss ||
      jitter > DEFAULT_CONFIG.maxJitter ||
      rtt > DEFAULT_CONFIG.maxRTT
    ) {
      quality = 'poor';
    } else if (
      bitrate < DEFAULT_CONFIG.minBitrate * 1.5 ||
      packetLoss > DEFAULT_CONFIG.maxPacketLoss * 0.7 ||
      jitter > DEFAULT_CONFIG.maxJitter * 0.7 ||
      rtt > DEFAULT_CONFIG.maxRTT * 0.7
    ) {
      quality = 'fair';
    } else if (
      bitrate < DEFAULT_CONFIG.minBitrate * 2 ||
      packetLoss > DEFAULT_CONFIG.maxPacketLoss * 0.5 ||
      jitter > DEFAULT_CONFIG.maxJitter * 0.5 ||
      rtt > DEFAULT_CONFIG.maxRTT * 0.5
    ) {
      quality = 'good';
    }

    return { bitrate, packetLoss, jitter, rtt, quality };
  };

  const adjustQuality = (metrics: CallQualityMetrics) => {
    if (metrics.quality === 'poor') {
      // Reduce to low quality
      setAdaptiveSettings({
        videoEnabled: true,
        videoQuality: 'low',
      });
    } else if (metrics.quality === 'fair') {
      // Medium quality
      setAdaptiveSettings({
        videoEnabled: true,
        videoQuality: 'medium',
      });
    } else if (metrics.quality === 'good' || metrics.quality === 'excellent') {
      // High quality
      setAdaptiveSettings({
        videoEnabled: true,
        videoQuality: 'high',
      });
    }
  };

  const applyVideoConstraints = useCallback(async (stream: MediaStream) => {
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    let constraints: MediaTrackConstraints = {};

    switch (adaptiveSettings.videoQuality) {
      case 'low':
        constraints = {
          width: { ideal: 320 },
          height: { ideal: 240 },
          frameRate: { ideal: 15 },
        };
        break;
      case 'medium':
        constraints = {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 24 },
        };
        break;
      case 'high':
        constraints = {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        };
        break;
    }

    try {
      await videoTrack.applyConstraints(constraints);
    } catch (error) {
      console.error('Failed to apply video constraints:', error);
    }
  }, [adaptiveSettings.videoQuality]);

  return {
    metrics,
    adaptiveSettings,
    applyVideoConstraints,
  };
};
