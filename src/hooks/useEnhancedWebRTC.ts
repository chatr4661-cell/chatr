/**
 * useEnhancedWebRTC - FaceTime-Quality Web Calling Hook
 * 
 * Integrates cutting-edge web APIs for superior call quality:
 * - Insertable Streams for custom video processing
 * - WebCodecs for hardware-accelerated encoding
 * - WebTransport for low-latency signaling (when available)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  getInsertableStreamsManager, 
  isInsertableStreamsSupported,
  type TransformOptions 
} from '@/utils/insertableStreams';
import { 
  WebCodecsVideoEncoder, 
  isWebCodecsSupported,
  QUALITY_PRESETS,
  type EncoderStats 
} from '@/utils/webCodecsEncoder';
import { 
  HybridSignalingManager, 
  isWebTransportSupported,
  type WebTransportStats 
} from '@/utils/webTransportSignaling';

export interface EnhancedWebRTCCapabilities {
  insertableStreams: boolean;
  webCodecs: boolean;
  webTransport: boolean;
  hardwareEncoding: boolean;
}

export interface EnhancedWebRTCStats {
  encoder?: EncoderStats;
  signaling?: WebTransportStats;
  activeEnhancements: string[];
}

interface UseEnhancedWebRTCOptions {
  enabled?: boolean;
  webTransportUrl?: string | null;
  qualityPreset?: keyof typeof QUALITY_PRESETS;
  transformMode?: TransformOptions['mode'];
}

export const useEnhancedWebRTC = (options: UseEnhancedWebRTCOptions = {}) => {
  const {
    enabled = true,
    webTransportUrl = null,
    qualityPreset = '720p30',
    transformMode = 'enhance'
  } = options;

  const [capabilities, setCapabilities] = useState<EnhancedWebRTCCapabilities>({
    insertableStreams: false,
    webCodecs: false,
    webTransport: false,
    hardwareEncoding: false
  });
  
  const [stats, setStats] = useState<EnhancedWebRTCStats>({
    activeEnhancements: []
  });
  
  const [isInitialized, setIsInitialized] = useState(false);
  
  const encoderRef = useRef<WebCodecsVideoEncoder | null>(null);
  const signalingRef = useRef<HybridSignalingManager | null>(null);
  const insertableStreamsRef = useRef(getInsertableStreamsManager());
  
  // Check capabilities on mount
  useEffect(() => {
    const checkCapabilities = async () => {
      const caps: EnhancedWebRTCCapabilities = {
        insertableStreams: isInsertableStreamsSupported(),
        webCodecs: isWebCodecsSupported(),
        webTransport: isWebTransportSupported(),
        hardwareEncoding: false
      };
      
      // Check for hardware encoding support
      if (caps.webCodecs) {
        try {
          const { isHardwareAccelerationAvailable } = await import('@/utils/webCodecsEncoder');
          caps.hardwareEncoding = await isHardwareAccelerationAvailable('avc1.640028');
        } catch {}
      }
      
      setCapabilities(caps);
      
      console.log('🔍 [EnhancedWebRTC] Capabilities:', {
        insertableStreams: caps.insertableStreams ? '✅' : '❌',
        webCodecs: caps.webCodecs ? '✅' : '❌',
        webTransport: caps.webTransport ? '✅' : '❌',
        hardwareEncoding: caps.hardwareEncoding ? '✅ HW' : '⚠️ SW'
      });
    };
    
    checkCapabilities();
  }, []);
  
  /**
   * Initialize all enhanced features
   */
  const initialize = useCallback(async (
    userId: string,
    callId: string,
    onSignal?: (message: any) => void
  ): Promise<string[]> => {
    if (!enabled) {
      console.log('ℹ️ [EnhancedWebRTC] Enhancements disabled');
      return [];
    }
    
    const activeEnhancements: string[] = [];
    
    try {
      // 1. Initialize Insertable Streams
      if (capabilities.insertableStreams) {
        insertableStreamsRef.current.initialize();
        insertableStreamsRef.current.onFrameStats((stats) => {
          // Could expose frame stats for debugging
        });
        activeEnhancements.push('insertableStreams');
        console.log('✅ [EnhancedWebRTC] Insertable Streams ready');
      }
      
      // 2. Initialize WebTransport signaling (if URL provided)
      if (webTransportUrl && capabilities.webTransport && onSignal) {
        signalingRef.current = new HybridSignalingManager();
        const signalingType = await signalingRef.current.initialize(
          webTransportUrl,
          userId,
          callId,
          onSignal
        );
        
        if (signalingType === 'webtransport') {
          activeEnhancements.push('webTransport');
          console.log('✅ [EnhancedWebRTC] WebTransport signaling active');
        }
      }
      
      setStats(prev => ({ ...prev, activeEnhancements }));
      setIsInitialized(true);
      
      console.log(`✅ [EnhancedWebRTC] Initialized with ${activeEnhancements.length} enhancements:`, activeEnhancements);
      return activeEnhancements;
    } catch (error) {
      console.error('❌ [EnhancedWebRTC] Initialization failed:', error);
      return [];
    }
  }, [enabled, capabilities, webTransportUrl]);
  
  /**
   * Apply Insertable Streams transforms to RTCRtpSender/Receiver
   */
  const applyTransforms = useCallback((
    sender: RTCRtpSender | null,
    receiver: RTCRtpReceiver | null
  ): boolean => {
    if (!capabilities.insertableStreams) return false;
    
    const manager = insertableStreamsRef.current;
    let applied = false;
    
    if (sender) {
      applied = manager.applySenderTransform(sender, { mode: transformMode }) || applied;
    }
    
    if (receiver) {
      applied = manager.applyReceiverTransform(receiver, { mode: 'passthrough' }) || applied;
    }
    
    return applied;
  }, [capabilities.insertableStreams, transformMode]);
  
  /**
   * Initialize WebCodecs encoder for a video track
   */
  const initializeEncoder = useCallback(async (
    videoTrack: MediaStreamTrack
  ): Promise<boolean> => {
    if (!capabilities.webCodecs) {
      console.log('ℹ️ [EnhancedWebRTC] WebCodecs not available');
      return false;
    }
    
    try {
      encoderRef.current = new WebCodecsVideoEncoder();
      
      const success = await encoderRef.current.initialize(videoTrack, qualityPreset, {
        onStats: (encoderStats) => {
          setStats(prev => ({ ...prev, encoder: encoderStats }));
        },
        onError: (error) => {
          console.error('❌ [EnhancedWebRTC] Encoder error:', error);
        }
      });
      
      if (success) {
        // Don't auto-start - WebRTC handles encoding internally
        // This is for custom processing scenarios
        console.log('✅ [EnhancedWebRTC] WebCodecs encoder ready');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ [EnhancedWebRTC] Failed to initialize encoder:', error);
      return false;
    }
  }, [capabilities.webCodecs, qualityPreset]);
  
  /**
   * Send signal via enhanced transport (WebTransport or fallback)
   */
  const sendSignal = useCallback(async (
    type: 'offer' | 'answer' | 'ice-candidate' | 'hangup',
    to: string,
    data: any,
    userId: string,
    callId: string
  ): Promise<boolean> => {
    if (signalingRef.current?.isUsingWebTransport()) {
      return signalingRef.current.sendSignal(type, to, data, userId, callId);
    }
    
    // Return false to indicate standard signaling should be used
    return false;
  }, []);
  
  /**
   * Update transform mode dynamically
   */
  const setTransformMode = useCallback((mode: TransformOptions['mode']) => {
    if (capabilities.insertableStreams) {
      insertableStreamsRef.current.setMode(mode);
      insertableStreamsRef.current.requestKeyFrame();
    }
  }, [capabilities.insertableStreams]);
  
  /**
   * Get current statistics
   */
  const getStats = useCallback((): EnhancedWebRTCStats => {
    const signalingStats = signalingRef.current?.getStats();
    const encoderStats = encoderRef.current?.getStats();
    
    return {
      encoder: encoderStats,
      signaling: signalingStats || undefined,
      activeEnhancements: stats.activeEnhancements
    };
  }, [stats.activeEnhancements]);
  
  /**
   * Cleanup all resources
   */
  const cleanup = useCallback(async () => {
    try {
      // Stop encoder
      await encoderRef.current?.stop();
      encoderRef.current = null;
      
      // Close signaling
      await signalingRef.current?.close();
      signalingRef.current = null;
      
      // Destroy insertable streams manager
      insertableStreamsRef.current.destroy();
      
      setIsInitialized(false);
      setStats({ activeEnhancements: [] });
      
      console.log('🧹 [EnhancedWebRTC] Cleaned up');
    } catch (error) {
      console.error('❌ [EnhancedWebRTC] Cleanup error:', error);
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);
  
  return {
    // State
    capabilities,
    stats,
    isInitialized,
    
    // Methods
    initialize,
    applyTransforms,
    initializeEncoder,
    sendSignal,
    setTransformMode,
    getStats,
    cleanup,
    
    // Utilities
    isEnhanced: stats.activeEnhancements.length > 0,
    hasHardwareEncoding: capabilities.hardwareEncoding,
    isUsingWebTransport: signalingRef.current?.isUsingWebTransport() ?? false
  };
};

export default useEnhancedWebRTC;
