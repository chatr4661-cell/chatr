import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  initializeUltraLowBandwidth,
  initializeCallDegradation,
  NetworkMode,
  getNetworkModeInfo,
  onNetworkModeChange,
  isVideoAllowed,
  getVideoPolicy,
  onVideoPolicyChange,
  getAudioConfig,
  applyAudioOptimization,
  optimizeOpusSDP,
  compressSDP,
  batchCandidate,
  clearCandidateCache,
  createMinimalSignal,
  parseMinimalSignal,
  shouldAllowRenegotiation,
  getDiscoveredPeers,
  isPeerLocal,
  isLocalNetworkCall,
  getLocalICEConfig,
  setLocalCallState,
  MediaQuality,
  getDegradationState,
  getQualityDescription,
  getUIStateInfo,
  onUIStateChange,
  getSignalStrength,
  shouldShowNetworkWarning,
  triggerRecoveryState,
  UIStateInfo
} from '@/utils/ultraLowBandwidth';

interface UseUltraLowBandwidthOptions {
  peerConnection?: RTCPeerConnection | null;
  callId?: string;
  onQualityChange?: (quality: MediaQuality, reason: string) => void;
  onFallbackToText?: () => void;
  onOfflineMode?: () => void;
}

interface UltraLowBandwidthState {
  networkMode: NetworkMode;
  modeName: string;
  videoAllowed: boolean;
  videoRequiresTap: boolean;
  maxAudioBitrate: number;
  maxVideoBitrate: number;
  currentQuality: MediaQuality;
  qualityDescription: string;
  uiState: UIStateInfo;
  signalStrength: number;
  showWarning: boolean;
  isLocalCall: boolean;
  isOffline: boolean;
}

/**
 * useUltraLowBandwidth Hook
 * 
 * Provides ultra-low bandwidth optimizations for calls:
 * - Network mode detection (MODE_0-4)
 * - Video kill-switch
 * - Audio optimization
 * - Graceful degradation
 * - UI state signals
 */
export function useUltraLowBandwidth(options: UseUltraLowBandwidthOptions = {}) {
  const { peerConnection, callId, onQualityChange, onFallbackToText, onOfflineMode } = options;
  
  // CRITICAL: Initialize with optimistic defaults to prevent false "offline"/"video paused" notices
  // The real values will be updated after initialization
  const [state, setState] = useState<UltraLowBandwidthState>(() => {
    // Try to get real values, but have safe fallbacks
    try {
      const modeInfo = getNetworkModeInfo();
      const uiState = getUIStateInfo();
      const degradation = getDegradationState();
      
      return {
        networkMode: modeInfo.mode,
        modeName: NetworkMode[modeInfo.mode],
        videoAllowed: modeInfo.videoAllowed,
        videoRequiresTap: modeInfo.videoOnTapOnly,
        maxAudioBitrate: modeInfo.maxAudioBitrate,
        maxVideoBitrate: modeInfo.maxVideoBitrate,
        currentQuality: degradation.currentQuality,
        qualityDescription: getQualityDescription(degradation.currentQuality),
        uiState,
        signalStrength: getSignalStrength(),
        showWarning: shouldShowNetworkWarning(),
        isLocalCall: isLocalNetworkCall(),
        isOffline: modeInfo.mode === NetworkMode.MODE_0_OFFLINE
      };
    } catch (e) {
      // Fallback to safe defaults if initialization fails
      console.warn('[useUltraLowBandwidth] Falling back to defaults:', e);
      return {
        networkMode: NetworkMode.MODE_4_HIGH,
        modeName: 'MODE_4_HIGH',
        videoAllowed: true,
        videoRequiresTap: false,
        maxAudioBitrate: 48,
        maxVideoBitrate: 1500,
        currentQuality: MediaQuality.HD_VIDEO,
        qualityDescription: 'HD Video',
        uiState: {
          state: 'excellent' as const,
          message: 'Excellent network',
          shortMessage: 'HD',
          icon: 'signal-full' as const,
          color: 'green' as const,
          showBanner: false,
          bannerType: 'info' as const,
          isInterruptive: false
        },
        signalStrength: 4,
        showWarning: false,
        isLocalCall: false,
        isOffline: false
      };
    }
  });
  
  const cleanupRef = useRef<(() => void) | null>(null);
  const degradationCleanupRef = useRef<(() => void) | null>(null);
  
  // Initialize ultra-low bandwidth system
  useEffect(() => {
    cleanupRef.current = initializeUltraLowBandwidth();
    
    return () => {
      cleanupRef.current?.();
    };
  }, []);
  
  // Initialize call degradation when peer connection is available
  useEffect(() => {
    if (peerConnection) {
      degradationCleanupRef.current = initializeCallDegradation(peerConnection, {
        onQualityChange: (quality, reason) => {
          setState(prev => ({
            ...prev,
            currentQuality: quality,
            qualityDescription: getQualityDescription(quality)
          }));
          onQualityChange?.(quality, reason);
        },
        onFallbackToText,
      });
    }
    
    return () => {
      degradationCleanupRef.current?.();
    };
  }, [peerConnection, onQualityChange, onFallbackToText]);
  
  // Listen to network mode changes
  useEffect(() => {
    const unsubscribe = onNetworkModeChange((modeInfo) => {
      setState(prev => ({
        ...prev,
        networkMode: modeInfo.mode,
        modeName: NetworkMode[modeInfo.mode],
        videoAllowed: modeInfo.videoAllowed,
        videoRequiresTap: modeInfo.videoOnTapOnly,
        maxAudioBitrate: modeInfo.maxAudioBitrate,
        maxVideoBitrate: modeInfo.maxVideoBitrate,
        isOffline: modeInfo.mode === NetworkMode.MODE_0_OFFLINE
      }));
      
      if (modeInfo.mode === NetworkMode.MODE_0_OFFLINE) {
        onOfflineMode?.();
      }
    });
    
    return unsubscribe;
  }, [onOfflineMode]);
  
  // Listen to UI state changes
  useEffect(() => {
    const unsubscribe = onUIStateChange((uiState) => {
      setState(prev => ({
        ...prev,
        uiState,
        signalStrength: getSignalStrength(),
        showWarning: shouldShowNetworkWarning()
      }));
    });
    
    return unsubscribe;
  }, []);
  
  // Listen to video policy changes
  useEffect(() => {
    const unsubscribe = onVideoPolicyChange((policy) => {
      setState(prev => ({
        ...prev,
        videoAllowed: policy.allowed,
        videoRequiresTap: policy.requiresTap,
        maxVideoBitrate: policy.maxBitrate
      }));
    });
    
    return unsubscribe;
  }, []);
  
  // Apply audio optimization when peer connection changes
  const applyOptimization = useCallback(async () => {
    if (peerConnection) {
      await applyAudioOptimization(peerConnection);
    }
  }, [peerConnection]);
  
  // Trigger recovery state for UI
  const triggerRecovery = useCallback(() => {
    triggerRecoveryState();
  }, []);
  
  // Check if can enable video
  const canEnableVideo = useCallback(() => {
    return state.videoAllowed;
  }, [state.videoAllowed]);
  
  // Get optimized SDP
  const getOptimizedSDP = useCallback((sdp: string) => {
    const audioConfig = getAudioConfig();
    return optimizeOpusSDP(sdp, audioConfig);
  }, []);
  
  // Check if peer is on local network
  const checkLocalPeer = useCallback((peerId: string) => {
    return isPeerLocal(peerId);
  }, []);
  
  // Get local ICE config for local calls
  const getLocalConfig = useCallback(() => {
    return getLocalICEConfig();
  }, []);
  
  return {
    ...state,
    applyOptimization,
    triggerRecovery,
    canEnableVideo,
    getOptimizedSDP,
    checkLocalPeer,
    getLocalConfig,
    // Utility exports
    getDiscoveredPeers,
    batchCandidate: callId ? (candidate: RTCIceCandidate, onReady: (id: string, candidates: RTCIceCandidate[]) => void) => 
      batchCandidate(callId, candidate, onReady) : undefined,
    clearCandidateCache: callId ? () => clearCandidateCache(callId) : undefined,
    shouldAllowRenegotiation
  };
}

export default useUltraLowBandwidth;
