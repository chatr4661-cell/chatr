/**
 * ICE Connection Monitor
 * 
 * Monitors WebRTC ICE connection state and handles recovery:
 * - Extended disconnect tolerance (elevator survival)
 * - Automatic reconnection attempts
 * - TURN-only fallback on failure
 */

import { CallPreset, INDIA_SURVIVAL, getWebRTCConfig } from './indiaCallPresets';

export interface ICEMonitorConfig {
  disconnectToleranceMs: number;
  maxReconnectAttempts: number;
  onRecoveryStart?: () => void;
  onRecoverySuccess?: () => void;
  onRecoveryFailed?: () => void;
  onQualityChange?: (quality: 'excellent' | 'good' | 'poor') => void;
}

export interface ICEMonitorState {
  isConnected: boolean;
  reconnectAttempts: number;
  lastConnectedTime: number | null;
  currentQuality: 'excellent' | 'good' | 'poor';
}

/**
 * Creates an ICE connection monitor for a peer connection
 */
export function createICEMonitor(
  pc: RTCPeerConnection,
  config: ICEMonitorConfig
): ICEMonitorState & { cleanup: () => void } {
  let disconnectTimer: NodeJS.Timeout | null = null;
  let qualityInterval: NodeJS.Timeout | null = null;
  
  const state: ICEMonitorState = {
    isConnected: false,
    reconnectAttempts: 0,
    lastConnectedTime: null,
    currentQuality: 'good',
  };

  // Handle ICE connection state changes
  const handleIceConnectionChange = () => {
    const iceState = pc.iceConnectionState;
    console.log('❄️ [ICEMonitor] State:', iceState);
    
    switch (iceState) {
      case 'connected':
      case 'completed':
        handleConnected();
        break;
        
      case 'disconnected':
        handleDisconnected();
        break;
        
      case 'failed':
        handleFailed();
        break;
        
      case 'closed':
        handleClosed();
        break;
    }
  };

  const handleConnected = () => {
    state.isConnected = true;
    state.lastConnectedTime = Date.now();
    state.reconnectAttempts = 0;
    
    // Clear any pending disconnect timer
    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      disconnectTimer = null;
    }
    
    // Start quality monitoring
    startQualityMonitoring();
    
    if (config.onRecoverySuccess && state.reconnectAttempts > 0) {
      config.onRecoverySuccess();
    }
  };

  const handleDisconnected = () => {
    console.log(`⚠️ [ICEMonitor] Disconnected - waiting ${config.disconnectToleranceMs}ms before action`);
    
    config.onRecoveryStart?.();
    
    // Extended tolerance for elevator/basement survival
    disconnectTimer = setTimeout(() => {
      if (pc.iceConnectionState === 'disconnected') {
        console.log('🔄 [ICEMonitor] Still disconnected after tolerance - attempting ICE restart');
        attemptRecovery();
      }
    }, config.disconnectToleranceMs);
  };

  const handleFailed = () => {
    console.log('❌ [ICEMonitor] ICE failed');
    state.isConnected = false;
    
    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      disconnectTimer = null;
    }
    
    attemptRecovery();
  };

  const handleClosed = () => {
    state.isConnected = false;
    cleanup();
  };

  const attemptRecovery = () => {
    if (state.reconnectAttempts >= config.maxReconnectAttempts) {
      console.log('❌ [ICEMonitor] Max reconnect attempts reached');
      config.onRecoveryFailed?.();
      return;
    }
    
    state.reconnectAttempts++;
    console.log(`🔄 [ICEMonitor] Recovery attempt ${state.reconnectAttempts}/${config.maxReconnectAttempts}`);
    
    config.onRecoveryStart?.();
    
    try {
      // Attempt ICE restart
      pc.restartIce();
    } catch (e) {
      console.error('❌ [ICEMonitor] ICE restart failed:', e);
      
      // Schedule another attempt with exponential backoff
      const backoffMs = Math.min(1000 * Math.pow(2, state.reconnectAttempts), 10000);
      setTimeout(() => {
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
          attemptRecovery();
        }
      }, backoffMs);
    }
  };

  const startQualityMonitoring = () => {
    if (qualityInterval) return;
    
    qualityInterval = setInterval(async () => {
      if (!state.isConnected) return;
      
      try {
        const stats = await pc.getStats();
        let rtt = 0;
        let packetsLost = 0;
        let packetsSent = 0;
        
        stats.forEach(report => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = report.currentRoundTripTime * 1000 || 0;
          }
          if (report.type === 'outbound-rtp' && report.kind === 'audio') {
            packetsSent = report.packetsSent || 0;
          }
          if (report.type === 'remote-inbound-rtp') {
            packetsLost = report.packetsLost || 0;
          }
        });
        
        const lossRate = packetsSent > 0 ? (packetsLost / packetsSent) * 100 : 0;
        
        let newQuality: 'excellent' | 'good' | 'poor';
        if (rtt < 150 && lossRate < 2) {
          newQuality = 'excellent';
        } else if (rtt < 400 && lossRate < 5) {
          newQuality = 'good';
        } else {
          newQuality = 'poor';
        }
        
        if (newQuality !== state.currentQuality) {
          state.currentQuality = newQuality;
          config.onQualityChange?.(newQuality);
        }
      } catch (e) {
        // Stats not available, ignore
      }
    }, 3000); // Check every 3 seconds
  };

  const cleanup = () => {
    if (disconnectTimer) {
      clearTimeout(disconnectTimer);
      disconnectTimer = null;
    }
    if (qualityInterval) {
      clearInterval(qualityInterval);
      qualityInterval = null;
    }
    pc.removeEventListener('iceconnectionstatechange', handleIceConnectionChange);
  };

  // Attach listener
  pc.addEventListener('iceconnectionstatechange', handleIceConnectionChange);

  return {
    ...state,
    cleanup,
  };
}

/**
 * Force TURN-only reconnection (for failed P2P attempts)
 */
export async function forceTurnReconnect(
  pc: RTCPeerConnection,
  onNewConnection: (newPc: RTCPeerConnection) => void
): Promise<void> {
  console.log('🔄 [ICEMonitor] Forcing TURN-only reconnection');
  
  const survivalConfig = getWebRTCConfig(INDIA_SURVIVAL);
  
  // Create new connection with TURN-only config
  const newPc = new RTCPeerConnection(survivalConfig);
  
  // Copy tracks from old connection
  const senders = pc.getSenders();
  for (const sender of senders) {
    if (sender.track) {
      newPc.addTrack(sender.track);
    }
  }
  
  onNewConnection(newPc);
}
