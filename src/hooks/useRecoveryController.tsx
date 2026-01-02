import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Connection Recovery Controller - Never-Fail Recovery for Web
 * 
 * Mirrors Android RecoveryController behavior:
 * - Never show "call failed" if recovery is possible
 * - Silent ICE restart attempts
 * - Extended timeouts for mobile networks
 */

export type RecoveryState = 'stable' | 'recovering' | 'recovered' | 'failed';

interface UseRecoveryControllerOptions {
  maxAttempts?: number;
  onRecovered?: () => void;
  onFailed?: () => void;
}

const DEFAULT_MAX_ATTEMPTS = 5;
const RECOVERY_BACKOFF_BASE_MS = 1000;
const CONNECTION_TIMEOUT_MS = 25000;
const ICE_RESTART_DELAY_MS = 2000;

export function useRecoveryController(
  peerConnection: RTCPeerConnection | null,
  options: UseRecoveryControllerOptions = {}
) {
  const {
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    onRecovered,
    onFailed
  } = options;

  const [recoveryState, setRecoveryState] = useState<RecoveryState>('stable');
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  
  const isRecoveringRef = useRef(false);
  const recoveryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRecoveryTimeRef = useRef(0);

  /**
   * Attempt ICE restart recovery
   */
  const attemptRecovery = useCallback(async (pc: RTCPeerConnection) => {
    if (recoveryAttempts >= maxAttempts) {
      console.error('❌ [Recovery] Max attempts reached - call truly failed');
      setRecoveryState('failed');
      onFailed?.();
      return;
    }

    const attempt = recoveryAttempts + 1;
    setRecoveryAttempts(attempt);
    isRecoveringRef.current = true;
    lastRecoveryTimeRef.current = Date.now();

    // Exponential backoff
    const backoffDelay = RECOVERY_BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
    console.log(`🔄 [Recovery] Attempt ${attempt}/${maxAttempts} (backoff: ${backoffDelay}ms)`);

    await new Promise(resolve => setTimeout(resolve, backoffDelay));

    // Trigger ICE restart
    try {
      console.log('🔄 [Recovery] Triggering ICE restart...');
      pc.restartIce();
      
      // Wait for connection with timeout
      const startTime = Date.now();
      
      recoveryTimeoutRef.current = setTimeout(() => {
        if (pc.iceConnectionState !== 'connected' && 
            pc.iceConnectionState !== 'completed') {
          console.warn('⏱️ [Recovery] ICE restart timeout - retrying...');
          attemptRecovery(pc);
        }
      }, CONNECTION_TIMEOUT_MS);
      
    } catch (error) {
      console.error('❌ [Recovery] ICE restart failed:', error);
      attemptRecovery(pc);
    }
  }, [recoveryAttempts, maxAttempts, onFailed]);

  /**
   * Handle ICE connection state changes
   */
  const handleConnectionStateChange = useCallback((state: RTCIceConnectionState) => {
    console.log(`📶 [Recovery] Connection state: ${state} (attempts: ${recoveryAttempts})`);

    switch (state) {
      case 'connected':
      case 'completed':
        if (isRecoveringRef.current) {
          console.log(`✅ [Recovery] Connection RECOVERED after ${recoveryAttempts} attempts`);
          setRecoveryState('recovered');
          onRecovered?.();
          
          // Reset after showing recovered state briefly
          setTimeout(() => {
            setRecoveryState('stable');
          }, 3000);
        } else {
          setRecoveryState('stable');
        }
        
        // Clear any pending timeouts
        if (recoveryTimeoutRef.current) {
          clearTimeout(recoveryTimeoutRef.current);
          recoveryTimeoutRef.current = null;
        }
        
        // Reset counters
        setRecoveryAttempts(0);
        isRecoveringRef.current = false;
        break;

      case 'disconnected':
        // Don't fail immediately - this is often temporary
        console.warn('⚠️ [Recovery] Connection DISCONNECTED - waiting for recovery');
        setRecoveryState('recovering');
        
        // Delay before attempting recovery
        setTimeout(() => {
          if (peerConnection && 
              peerConnection.iceConnectionState === 'disconnected') {
            attemptRecovery(peerConnection);
          }
        }, ICE_RESTART_DELAY_MS);
        break;

      case 'failed':
        console.error('❌ [Recovery] Connection FAILED - attempting immediate recovery');
        setRecoveryState('recovering');
        isRecoveringRef.current = true;
        
        if (peerConnection) {
          attemptRecovery(peerConnection);
        }
        break;

      case 'closed':
        console.log('📞 [Recovery] Connection CLOSED (intentional)');
        setRecoveryAttempts(0);
        isRecoveringRef.current = false;
        break;
    }
  }, [peerConnection, recoveryAttempts, attemptRecovery, onRecovered]);

  /**
   * Force recovery attempt
   */
  const forceRecovery = useCallback(() => {
    if (!peerConnection) return;
    
    console.log('🔧 [Recovery] Forcing recovery attempt');
    setRecoveryState('recovering');
    isRecoveringRef.current = true;
    attemptRecovery(peerConnection);
  }, [peerConnection, attemptRecovery]);

  /**
   * Reset recovery state
   */
  const reset = useCallback(() => {
    setRecoveryState('stable');
    setRecoveryAttempts(0);
    isRecoveringRef.current = false;
    
    if (recoveryTimeoutRef.current) {
      clearTimeout(recoveryTimeoutRef.current);
      recoveryTimeoutRef.current = null;
    }
  }, []);

  // Set up ICE connection state listener
  useEffect(() => {
    if (!peerConnection) return;

    const handler = () => {
      handleConnectionStateChange(peerConnection.iceConnectionState);
    };

    peerConnection.addEventListener('iceconnectionstatechange', handler);
    
    return () => {
      peerConnection.removeEventListener('iceconnectionstatechange', handler);
    };
  }, [peerConnection, handleConnectionStateChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
    };
  }, []);

  return {
    recoveryState,
    recoveryAttempts,
    isRecovering: isRecoveringRef.current,
    handleConnectionStateChange,
    forceRecovery,
    reset
  };
}
