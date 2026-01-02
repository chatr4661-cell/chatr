import { useRef, useCallback, useState, useEffect } from 'react';

/**
 * Call Quality Copilot - Silent Intelligence for Web
 * 
 * Mirrors Android CopilotDecisionEngine behavior:
 * - Pre-call network analysis
 * - Adaptive quality during call
 * - Subtle hints only when necessary
 * - Never shows technical stats to user
 */

export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline' | 'unknown';
export type CallRoute = 'hd-video' | 'standard-video' | 'audio-only' | 'low-bitrate-audio';
export type CopilotAction = 
  | { type: 'none' }
  | { type: 'reduce-bitrate'; showHint: boolean }
  | { type: 'switch-audio-only'; showHint: boolean }
  | { type: 'enable-jitter-buffer'; showHint: boolean }
  | { type: 'ice-restart'; showHint: boolean }
  | { type: 'show-hint'; message: string; duration: number };

interface CopilotHint {
  message: string;
  duration: number;
  timestamp: number;
}

interface WebRTCStats {
  packetLoss: number;  // Percentage
  rtt: number;         // Round trip time in ms
  jitter: number;      // Jitter in ms
  bitrate: number;     // Current bitrate in bps
  isDisconnecting: boolean;
  recovered: boolean;
}

const HINT_COOLDOWN_MS = 15000;
const PACKET_LOSS_REDUCE_BITRATE = 10;
const PACKET_LOSS_AUDIO_ONLY = 25;
const RTT_HIGH_LATENCY = 500;

export function useCallCopilot(peerConnection: RTCPeerConnection | null) {
  const [currentHint, setCurrentHint] = useState<CopilotHint | null>(null);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality>('unknown');
  const [recommendedRoute, setRecommendedRoute] = useState<CallRoute>('hd-video');
  
  const lastHintTime = useRef(0);
  const hasRecoveredRecently = useRef(false);
  const previousPacketLoss = useRef(0);
  const statsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Pre-call network analysis - runs silently before call connects
   * Returns recommended call route based on network conditions
   */
  const analyzeNetworkQuality = useCallback(async (): Promise<CallRoute> => {
    try {
      // Measure latency via image ping
      const startTime = performance.now();
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      try {
        await fetch('https://www.google.com/favicon.ico', {
          mode: 'no-cors',
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch {
        clearTimeout(timeoutId);
      }
      
      const latency = performance.now() - startTime;
      
      // Check connection type if available
      const connection = (navigator as any).connection;
      const effectiveType = connection?.effectiveType;
      const downlink = connection?.downlink || 10; // Mbps
      
      console.log(`📶 [Copilot] Network analysis: latency=${latency.toFixed(0)}ms, type=${effectiveType}, downlink=${downlink}Mbps`);
      
      let quality: NetworkQuality;
      let route: CallRoute;
      
      if (!navigator.onLine) {
        quality = 'offline';
        route = 'low-bitrate-audio';
      } else if (latency < 50 && downlink > 10) {
        quality = 'excellent';
        route = 'hd-video';
      } else if (latency < 150 && downlink > 5) {
        quality = 'good';
        route = 'standard-video';
      } else if (latency < 300 && downlink > 1) {
        quality = 'fair';
        route = 'audio-only';
      } else {
        quality = 'poor';
        route = 'low-bitrate-audio';
      }
      
      // Adjust based on connection type (only if still unknown)
      if (effectiveType === '3g' && quality !== 'poor') {
        quality = 'fair';
        route = 'audio-only';
      } else if (effectiveType === '2g' || effectiveType === 'slow-2g') {
        quality = 'poor';
        route = 'low-bitrate-audio';
      }
      
      setNetworkQuality(quality);
      setRecommendedRoute(route);
      
      console.log(`✅ [Copilot] Pre-call analysis: quality=${quality}, route=${route}`);
      return route;
      
    } catch (error) {
      console.error('❌ [Copilot] Network analysis failed:', error);
      setNetworkQuality('unknown');
      setRecommendedRoute('standard-video');
      return 'standard-video';
    }
  }, []);

  /**
   * Analyze current call stats and determine action
   */
  const analyzeCallStats = useCallback((stats: WebRTCStats): CopilotAction => {
    const now = Date.now();
    const shouldShowHint = now - lastHintTime.current > HINT_COOLDOWN_MS;
    
    // High packet loss - reduce bitrate silently
    if (stats.packetLoss > PACKET_LOSS_REDUCE_BITRATE && stats.packetLoss <= PACKET_LOSS_AUDIO_ONLY) {
      console.log(`📉 [Copilot] Reducing bitrate (packet loss: ${stats.packetLoss.toFixed(1)}%)`);
      return { type: 'reduce-bitrate', showHint: false };
    }
    
    // Severe packet loss - switch to audio only
    if (stats.packetLoss > PACKET_LOSS_AUDIO_ONLY) {
      console.log(`🎤 [Copilot] Switching to audio only (packet loss: ${stats.packetLoss.toFixed(1)}%)`);
      if (shouldShowHint) {
        lastHintTime.current = now;
        setCurrentHint({ message: 'Audio optimized', duration: 3000, timestamp: now });
      }
      return { type: 'switch-audio-only', showHint: shouldShowHint };
    }
    
    // High RTT - enable jitter buffer
    if (stats.rtt > RTT_HIGH_LATENCY) {
      console.log(`📶 [Copilot] High RTT detected (${stats.rtt.toFixed(0)}ms)`);
      return { type: 'enable-jitter-buffer', showHint: false };
    }
    
    // Connection unstable
    if (stats.isDisconnecting) {
      console.log('🔄 [Copilot] Connection unstable - ICE restart');
      if (shouldShowHint) {
        lastHintTime.current = now;
        setCurrentHint({ message: 'Reconnecting...', duration: 5000, timestamp: now });
      }
      hasRecoveredRecently.current = false;
      return { type: 'ice-restart', showHint: shouldShowHint };
    }
    
    // Just recovered from bad state
    if (stats.recovered && !hasRecoveredRecently.current) {
      console.log('✅ [Copilot] Connection recovered');
      hasRecoveredRecently.current = true;
      if (shouldShowHint) {
        lastHintTime.current = now;
        setCurrentHint({ message: 'Call stabilized', duration: 3000, timestamp: now });
      }
      return { type: 'show-hint', message: 'Call stabilized', duration: 3000 };
    }
    
    // Check for recovery (packet loss improved significantly)
    if (previousPacketLoss.current > 10 && stats.packetLoss < 2) {
      if (!hasRecoveredRecently.current && shouldShowHint) {
        hasRecoveredRecently.current = true;
        lastHintTime.current = now;
        setCurrentHint({ message: 'Call stabilized', duration: 3000, timestamp: now });
      }
    }
    
    previousPacketLoss.current = stats.packetLoss;
    
    return { type: 'none' };
  }, []);

  /**
   * Collect stats from peer connection
   */
  const collectStats = useCallback(async (): Promise<WebRTCStats | null> => {
    if (!peerConnection) return null;
    
    try {
      const stats = await peerConnection.getStats();
      let packetsLost = 0;
      let packetsReceived = 0;
      let rtt = 0;
      let jitter = 0;
      let bitrate = 0;
      
      stats.forEach(report => {
        if (report.type === 'inbound-rtp') {
          packetsLost += report.packetsLost || 0;
          packetsReceived += report.packetsReceived || 0;
          jitter = Math.max(jitter, (report.jitter || 0) * 1000);
        }
        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
          rtt = (report.currentRoundTripTime || 0) * 1000;
          bitrate = report.availableOutgoingBitrate || 0;
        }
      });
      
      const totalPackets = packetsLost + packetsReceived;
      const packetLoss = totalPackets > 0 ? (packetsLost / totalPackets) * 100 : 0;
      
      const iceState = peerConnection.iceConnectionState;
      const isDisconnecting = iceState === 'disconnected' || iceState === 'failed';
      const recovered = iceState === 'connected' || iceState === 'completed';
      
      return {
        packetLoss,
        rtt,
        jitter,
        bitrate,
        isDisconnecting,
        recovered
      };
    } catch (error) {
      console.error('❌ [Copilot] Failed to collect stats:', error);
      return null;
    }
  }, [peerConnection]);

  /**
   * Start monitoring call quality
   */
  const startMonitoring = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
    }
    
    console.log('📊 [Copilot] Starting quality monitoring...');
    
    statsIntervalRef.current = setInterval(async () => {
      const stats = await collectStats();
      if (stats) {
        analyzeCallStats(stats);
      }
    }, 3000); // Check every 3 seconds
  }, [collectStats, analyzeCallStats]);

  /**
   * Stop monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (statsIntervalRef.current) {
      clearInterval(statsIntervalRef.current);
      statsIntervalRef.current = null;
    }
    console.log('📊 [Copilot] Stopped quality monitoring');
  }, []);

  /**
   * Clear current hint
   */
  const clearHint = useCallback(() => {
    setCurrentHint(null);
  }, []);

  /**
   * Reset copilot state for new call
   */
  const reset = useCallback(() => {
    setCurrentHint(null);
    setNetworkQuality('unknown');
    setRecommendedRoute('hd-video');
    lastHintTime.current = 0;
    hasRecoveredRecently.current = false;
    previousPacketLoss.current = 0;
    stopMonitoring();
  }, [stopMonitoring]);

  // Auto-clear hints after duration
  useEffect(() => {
    if (currentHint) {
      const timeout = setTimeout(() => {
        setCurrentHint(null);
      }, currentHint.duration);
      return () => clearTimeout(timeout);
    }
  }, [currentHint]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    currentHint,
    networkQuality,
    recommendedRoute,
    analyzeNetworkQuality,
    analyzeCallStats,
    collectStats,
    startMonitoring,
    stopMonitoring,
    clearHint,
    reset
  };
}
