/**
 * UI State Signals
 * 
 * Provides user-friendly network and call state messages for WebView.
 * Never shows raw errors to the user.
 * 
 * States:
 * - OFFLINE → "Waiting for network…"
 * - ULTRA_LOW → "Low signal — voice optimized"
 * - DROP → "Reconnecting…"
 * - RECOVERED → "Call resumed"
 */

import { NetworkMode, getNetworkModeInfo, onNetworkModeChange } from './nativeNetworkBridge';
import { MediaQuality, getDegradationState } from './gracefulDegradation';
import { isLocalNetworkCall } from './lanMode';

export type UIState = 
  | 'excellent'
  | 'good'
  | 'weak'
  | 'very_weak'
  | 'offline'
  | 'reconnecting'
  | 'recovered'
  | 'local_network'
  | 'video_paused'
  | 'audio_only'
  | 'text_fallback';

export interface UIStateInfo {
  state: UIState;
  message: string;
  shortMessage: string;
  icon: 'signal-full' | 'signal-good' | 'signal-weak' | 'signal-none' | 'wifi' | 'reconnect' | 'local';
  color: 'green' | 'yellow' | 'orange' | 'red' | 'blue' | 'gray';
  showBanner: boolean;
  bannerType: 'info' | 'warning' | 'error' | 'success';
  isInterruptive: boolean;
}

// State listeners - CRITICAL: Default to 'excellent' to prevent false "offline" banners
let stateListeners: Array<(info: UIStateInfo) => void> = [];
let currentUIState: UIState = 'excellent'; // Default to excellent, not 'good'
let lastRecoveryTime = 0;
const RECOVERY_DISPLAY_DURATION = 3000; // Show "recovered" for 3 seconds

/**
 * Get UI state info for current network/call state
 */
export function getUIStateInfo(): UIStateInfo {
  const modeInfo = getNetworkModeInfo();
  const degradation = getDegradationState();
  const isLocal = isLocalNetworkCall();
  
  // Check for local network call
  if (isLocal) {
    return {
      state: 'local_network',
      message: 'Local Network Call',
      shortMessage: 'Local',
      icon: 'local',
      color: 'blue',
      showBanner: true,
      bannerType: 'info',
      isInterruptive: false
    };
  }
  
  // Check for recovery state
  if (Date.now() - lastRecoveryTime < RECOVERY_DISPLAY_DURATION) {
    return {
      state: 'recovered',
      message: 'Call resumed',
      shortMessage: 'Resumed',
      icon: 'signal-good',
      color: 'green',
      showBanner: true,
      bannerType: 'success',
      isInterruptive: false
    };
  }
  
  // Check degradation state
  if (degradation.isDegrading) {
    return {
      state: 'reconnecting',
      message: 'Reconnecting…',
      shortMessage: 'Reconnecting',
      icon: 'reconnect',
      color: 'yellow',
      showBanner: true,
      bannerType: 'warning',
      isInterruptive: false
    };
  }
  
  if (degradation.currentQuality === MediaQuality.TEXT_ONLY) {
    return {
      state: 'text_fallback',
      message: 'Voice unavailable — using text',
      shortMessage: 'Text Only',
      icon: 'signal-none',
      color: 'orange',
      showBanner: true,
      bannerType: 'warning',
      isInterruptive: true
    };
  }
  
  if (degradation.currentQuality === MediaQuality.AUDIO_LOW) {
    return {
      state: 'audio_only',
      message: 'Low signal — voice optimized',
      shortMessage: 'Voice Mode',
      icon: 'signal-weak',
      color: 'yellow',
      showBanner: true,
      bannerType: 'info',
      isInterruptive: false
    };
  }
  
  // Network mode based states
  switch (modeInfo.mode) {
    case NetworkMode.MODE_0_OFFLINE:
      return {
        state: 'offline',
        message: 'Waiting for network…',
        shortMessage: 'Offline',
        icon: 'signal-none',
        color: 'red',
        showBanner: true,
        bannerType: 'error',
        isInterruptive: true
      };
      
    case NetworkMode.MODE_1_ULTRA_LOW:
      return {
        state: 'very_weak',
        message: 'Very weak signal — voice optimized',
        shortMessage: 'Weak Signal',
        icon: 'signal-weak',
        color: 'orange',
        showBanner: true,
        bannerType: 'warning',
        isInterruptive: false
      };
      
    case NetworkMode.MODE_2_LOW:
      return {
        state: 'weak',
        message: 'Weak network — audio only',
        shortMessage: 'Audio Only',
        icon: 'signal-weak',
        color: 'yellow',
        showBanner: true,
        bannerType: 'info',
        isInterruptive: false
      };
      
    case NetworkMode.MODE_3_NORMAL:
      return {
        state: 'good',
        message: 'Network good',
        shortMessage: 'Good',
        icon: 'signal-good',
        color: 'green',
        showBanner: false,
        bannerType: 'info',
        isInterruptive: false
      };
      
    case NetworkMode.MODE_4_HIGH:
      return {
        state: 'excellent',
        message: 'Excellent network',
        shortMessage: 'HD',
        icon: 'signal-full',
        color: 'green',
        showBanner: false,
        bannerType: 'info',
        isInterruptive: false
      };
      
    default:
      return {
        state: 'good',
        message: 'Connected',
        shortMessage: 'Connected',
        icon: 'signal-good',
        color: 'green',
        showBanner: false,
        bannerType: 'info',
        isInterruptive: false
      };
  }
}

/**
 * Subscribe to UI state changes
 */
export function onUIStateChange(callback: (info: UIStateInfo) => void): () => void {
  stateListeners.push(callback);
  return () => {
    stateListeners = stateListeners.filter(l => l !== callback);
  };
}

/**
 * Notify state change
 */
function notifyStateChange(info: UIStateInfo): void {
  if (info.state !== currentUIState) {
    currentUIState = info.state;
    console.log(`📱 [UIState] State changed: ${info.state} - "${info.message}"`);
  }
  
  stateListeners.forEach(listener => {
    try {
      listener(info);
    } catch (e) {
      console.error('[UIState] Listener error:', e);
    }
  });
}

/**
 * Initialize UI state signal monitoring
 */
export function initializeUIStateSignals(): () => void {
  console.log('📱 [UIState] Initializing...');
  
  // Monitor network changes
  const unsubscribe = onNetworkModeChange(() => {
    const info = getUIStateInfo();
    notifyStateChange(info);
  });
  
  // Initial state
  const initialInfo = getUIStateInfo();
  notifyStateChange(initialInfo);
  
  return unsubscribe;
}

/**
 * Trigger recovery state (for UI display)
 */
export function triggerRecoveryState(): void {
  lastRecoveryTime = Date.now();
  const info = getUIStateInfo();
  notifyStateChange(info);
  
  // Clear after duration
  setTimeout(() => {
    const info = getUIStateInfo();
    notifyStateChange(info);
  }, RECOVERY_DISPLAY_DURATION);
}

/**
 * Get message for video being paused
 */
export function getVideoPausedMessage(): string {
  const modeInfo = getNetworkModeInfo();
  
  switch (modeInfo.mode) {
    case NetworkMode.MODE_0_OFFLINE:
      return 'Video unavailable — no network';
    case NetworkMode.MODE_1_ULTRA_LOW:
      return 'Video paused — network too weak';
    case NetworkMode.MODE_2_LOW:
      return 'Video disabled — optimizing for voice';
    default:
      return 'Video paused';
  }
}

/**
 * Get message for reconnection
 */
export function getReconnectingMessage(): string {
  return 'Reconnecting…';
}

/**
 * Get message for call ended
 */
export function getCallEndedMessage(reason?: string): string {
  switch (reason) {
    case 'network':
      return 'Call ended — network lost';
    case 'declined':
      return 'Call declined';
    case 'busy':
      return 'User busy';
    case 'no_answer':
      return 'No answer';
    case 'timeout':
      return 'Call timed out';
    case 'normal':
    default:
      return 'Call ended';
  }
}

/**
 * Get current signal strength (0-4)
 */
export function getSignalStrength(): number {
  const modeInfo = getNetworkModeInfo();
  
  switch (modeInfo.mode) {
    case NetworkMode.MODE_0_OFFLINE:
      return 0;
    case NetworkMode.MODE_1_ULTRA_LOW:
      return 1;
    case NetworkMode.MODE_2_LOW:
      return 2;
    case NetworkMode.MODE_3_NORMAL:
      return 3;
    case NetworkMode.MODE_4_HIGH:
      return 4;
    default:
      return 2;
  }
}

/**
 * Check if should show network warning
 */
export function shouldShowNetworkWarning(): boolean {
  const modeInfo = getNetworkModeInfo();
  return modeInfo.mode <= NetworkMode.MODE_2_LOW;
}

/**
 * Get CSS color class for current state
 */
export function getStateColorClass(): string {
  const info = getUIStateInfo();
  
  switch (info.color) {
    case 'green':
      return 'text-green-500';
    case 'yellow':
      return 'text-yellow-500';
    case 'orange':
      return 'text-orange-500';
    case 'red':
      return 'text-red-500';
    case 'blue':
      return 'text-blue-500';
    case 'gray':
    default:
      return 'text-gray-500';
  }
}

/**
 * Get background color class for banner
 */
export function getBannerColorClass(): string {
  const info = getUIStateInfo();
  
  switch (info.bannerType) {
    case 'success':
      return 'bg-green-500/90';
    case 'warning':
      return 'bg-yellow-500/90';
    case 'error':
      return 'bg-red-500/90';
    case 'info':
    default:
      return 'bg-blue-500/90';
  }
}

/**
 * Expose to window for native access
 */
if (typeof window !== 'undefined') {
  (window as any).ChatrUIState = {
    getInfo: getUIStateInfo,
    onChange: onUIStateChange,
    getSignalStrength,
    shouldShowWarning: shouldShowNetworkWarning,
    getVideoPausedMessage,
    getReconnectingMessage,
    triggerRecovery: triggerRecoveryState
  };
}
