/**
 * Native Network Bridge
 * 
 * Provides network mode classification for ultra-low bandwidth support.
 * Exposes window.CHATR_NETWORK_MODE for native Android control.
 * 
 * MODE_0_OFFLINE: No connectivity
 * MODE_1_ULTRA_LOW: ≤10 kbps, satellite-like (voice optimized)
 * MODE_2_LOW: 10-30 kbps (low bitrate audio)
 * MODE_3_NORMAL: 30-500 kbps (normal audio, limited video)
 * MODE_4_HIGH: >500 kbps (full quality)
 */

export enum NetworkMode {
  MODE_0_OFFLINE = 0,
  MODE_1_ULTRA_LOW = 1,
  MODE_2_LOW = 2,
  MODE_3_NORMAL = 3,
  MODE_4_HIGH = 4
}

export interface NetworkModeInfo {
  mode: NetworkMode;
  modeName: string;
  description: string;
  maxAudioBitrate: number; // kbps
  maxVideoBitrate: number; // kbps
  videoAllowed: boolean;
  videoOnTapOnly: boolean;
  estimatedBandwidth: number; // kbps
  rtt: number; // ms
  isOffline: boolean;
  isSatellite: boolean;
}

// Mode configurations
const MODE_CONFIGS: Record<NetworkMode, Omit<NetworkModeInfo, 'estimatedBandwidth' | 'rtt'>> = {
  [NetworkMode.MODE_0_OFFLINE]: {
    mode: NetworkMode.MODE_0_OFFLINE,
    modeName: 'OFFLINE',
    description: 'Waiting for network…',
    maxAudioBitrate: 0,
    maxVideoBitrate: 0,
    videoAllowed: false,
    videoOnTapOnly: false,
    isOffline: true,
    isSatellite: false
  },
  [NetworkMode.MODE_1_ULTRA_LOW]: {
    mode: NetworkMode.MODE_1_ULTRA_LOW,
    modeName: 'ULTRA_LOW',
    description: 'Low signal — voice optimized',
    maxAudioBitrate: 12, // 8-12 kbps Opus
    maxVideoBitrate: 0,
    videoAllowed: false,
    videoOnTapOnly: false,
    isOffline: false,
    isSatellite: true // Treat as satellite-grade
  },
  [NetworkMode.MODE_2_LOW]: {
    mode: NetworkMode.MODE_2_LOW,
    modeName: 'LOW',
    description: 'Weak network — audio only',
    maxAudioBitrate: 24, // 16-24 kbps
    maxVideoBitrate: 0,
    videoAllowed: false,
    videoOnTapOnly: false,
    isOffline: false,
    isSatellite: false
  },
  [NetworkMode.MODE_3_NORMAL]: {
    mode: NetworkMode.MODE_3_NORMAL,
    modeName: 'NORMAL',
    description: 'Network good',
    maxAudioBitrate: 32,
    maxVideoBitrate: 300, // Only on tap
    videoAllowed: true,
    videoOnTapOnly: true, // User must explicitly enable
    isOffline: false,
    isSatellite: false
  },
  [NetworkMode.MODE_4_HIGH]: {
    mode: NetworkMode.MODE_4_HIGH,
    modeName: 'HIGH',
    description: 'Excellent network',
    maxAudioBitrate: 48,
    maxVideoBitrate: 1500,
    videoAllowed: true,
    videoOnTapOnly: false,
    isOffline: false,
    isSatellite: false
  }
};

// Global state - CRITICAL: Initialize with proper defaults to prevent false "offline" state
let currentMode: NetworkMode = NetworkMode.MODE_4_HIGH; // Default to HIGH, not OFFLINE
let currentModeInfo: NetworkModeInfo = {
  ...MODE_CONFIGS[NetworkMode.MODE_4_HIGH],
  estimatedBandwidth: 1000,
  rtt: 50
}; // Initialize with defaults, not null
let modeChangeListeners: Array<(info: NetworkModeInfo) => void> = [];
let nativeHasControl = false;
let isInitialized = false;

// Extend window interface
declare global {
  interface Window {
    CHATR_NETWORK_MODE?: NetworkMode;
    CHATR_NETWORK_INFO?: NetworkModeInfo;
    ChatrNetwork?: {
      getMode: () => NetworkMode;
      getModeInfo: () => NetworkModeInfo;
      setMode: (mode: NetworkMode, bandwidth: number, rtt: number) => void;
      onModeChange: (callback: (info: NetworkModeInfo) => void) => void;
    };
  }
}

/**
 * Classify network mode based on bandwidth and RTT
 */
export function classifyNetworkMode(bandwidthKbps: number, rttMs: number): NetworkMode {
  // Offline detection
  if (!navigator.onLine) {
    return NetworkMode.MODE_0_OFFLINE;
  }
  
  // Ultra-low: satellite-like conditions
  if (bandwidthKbps <= 10 || rttMs > 2000) {
    return NetworkMode.MODE_1_ULTRA_LOW;
  }
  
  // Low: 2G-like
  if (bandwidthKbps <= 30 || rttMs > 1000) {
    return NetworkMode.MODE_2_LOW;
  }
  
  // Normal: 3G-like
  if (bandwidthKbps <= 500 || rttMs > 300) {
    return NetworkMode.MODE_3_NORMAL;
  }
  
  // High: 4G/WiFi
  return NetworkMode.MODE_4_HIGH;
}

/**
 * Get current network mode info
 */
export function getNetworkModeInfo(): NetworkModeInfo {
  // Always return initialized info - never null
  return currentModeInfo;
}

/**
 * Set network mode (called from native bridge or web detection)
 */
export function setNetworkMode(mode: NetworkMode, bandwidth: number = 0, rtt: number = 0): void {
  const previousMode = currentMode;
  currentMode = mode;
  
  const config = MODE_CONFIGS[mode];
  currentModeInfo = {
    ...config,
    estimatedBandwidth: bandwidth,
    rtt
  };
  
  // Update global window object for native access
  if (typeof window !== 'undefined') {
    window.CHATR_NETWORK_MODE = mode;
    window.CHATR_NETWORK_INFO = currentModeInfo;
  }
  
  // Log mode change
  if (previousMode !== mode) {
    console.log(`📶 [NetworkBridge] Mode changed: ${NetworkMode[previousMode]} → ${NetworkMode[mode]}`);
    console.log(`📶 [NetworkBridge] ${config.description} | Audio: ${config.maxAudioBitrate}kbps | Video: ${config.videoAllowed ? 'allowed' : 'disabled'}`);
    
    // Notify listeners
    modeChangeListeners.forEach(listener => {
      try {
        listener(currentModeInfo!);
      } catch (e) {
        console.error('[NetworkBridge] Listener error:', e);
      }
    });
  }
}

/**
 * Subscribe to network mode changes
 */
export function onNetworkModeChange(callback: (info: NetworkModeInfo) => void): () => void {
  modeChangeListeners.push(callback);
  return () => {
    modeChangeListeners = modeChangeListeners.filter(l => l !== callback);
  };
}

/**
 * Initialize network bridge
 */
export function initializeNetworkBridge(): void {
  if (isInitialized) {
    console.log('📶 [NetworkBridge] Already initialized');
    return;
  }
  
  console.log('📶 [NetworkBridge] Initializing...');
  isInitialized = true;
  
  // Expose to window for native bridge
  if (typeof window !== 'undefined') {
    window.ChatrNetwork = {
      getMode: () => currentMode,
      getModeInfo: getNetworkModeInfo,
      setMode: (mode: NetworkMode, bandwidth: number, rtt: number) => {
        nativeHasControl = true;
        setNetworkMode(mode, bandwidth, rtt);
      },
      onModeChange: onNetworkModeChange
    };
    
    // Check if native already set mode BEFORE our detection
    if (window.CHATR_NETWORK_MODE !== undefined) {
      nativeHasControl = true;
      currentMode = window.CHATR_NETWORK_MODE;
      console.log('📶 [NetworkBridge] Native already set mode:', NetworkMode[currentMode]);
    }
    
    // Initial mode detection from web (only if native hasn't taken control)
    if (!nativeHasControl) {
      detectNetworkModeFromWeb();
    }
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      if (!nativeHasControl) {
        detectNetworkModeFromWeb();
      }
    });
    
    window.addEventListener('offline', () => {
      setNetworkMode(NetworkMode.MODE_0_OFFLINE, 0, 0);
    });
    
    // Listen for connection changes
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', () => {
        if (!nativeHasControl) {
          detectNetworkModeFromWeb();
        }
      });
    }
  }
  
  console.log('📶 [NetworkBridge] Initialized. Current mode:', NetworkMode[currentMode]);
}

/**
 * Detect network mode from web APIs (fallback when native bridge not available)
 */
function detectNetworkModeFromWeb(): void {
  // Check if native has already taken control
  if (nativeHasControl) {
    console.log('📶 [NetworkBridge] Native has control, skipping web detection');
    return;
  }
  
  if (!navigator.onLine) {
    setNetworkMode(NetworkMode.MODE_0_OFFLINE, 0, 0);
    return;
  }
  
  const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;
  
  if (!connection) {
    // No network info API - assume HIGH quality for modern browsers/WiFi
    console.log('📶 [NetworkBridge] No Network Info API, assuming HIGH (modern browser/WiFi)');
    setNetworkMode(NetworkMode.MODE_4_HIGH, 1000, 50);
    return;
  }
  
  const effectiveType = connection.effectiveType;
  const downlink = connection.downlink || 0; // Mbps
  const rtt = connection.rtt || 0;
  
  const bandwidthKbps = downlink * 1000;
  
  // Map effective type to modes
  let mode: NetworkMode;
  switch (effectiveType) {
    case 'slow-2g':
      mode = NetworkMode.MODE_1_ULTRA_LOW;
      break;
    case '2g':
      mode = NetworkMode.MODE_2_LOW;
      break;
    case '3g':
      mode = NetworkMode.MODE_3_NORMAL;
      break;
    case '4g':
    default:
      mode = classifyNetworkMode(bandwidthKbps, rtt);
      break;
  }
  
  setNetworkMode(mode, bandwidthKbps, rtt);
}

/**
 * Check if video is currently allowed
 */
export function isVideoAllowed(): boolean {
  const info = getNetworkModeInfo();
  return info.videoAllowed;
}

/**
 * Check if video requires user tap to enable
 */
export function isVideoTapRequired(): boolean {
  const info = getNetworkModeInfo();
  return info.videoOnTapOnly;
}

/**
 * Get current audio bitrate limit
 */
export function getMaxAudioBitrate(): number {
  const info = getNetworkModeInfo();
  return info.maxAudioBitrate;
}

/**
 * Get current video bitrate limit
 */
export function getMaxVideoBitrate(): number {
  const info = getNetworkModeInfo();
  return info.maxVideoBitrate;
}

/**
 * Get user-friendly status message
 */
export function getNetworkStatusMessage(): string {
  const info = getNetworkModeInfo();
  return info.description;
}

/**
 * Check if we're in offline mode
 */
export function isOffline(): boolean {
  return currentMode === NetworkMode.MODE_0_OFFLINE;
}

/**
 * Check if we're in satellite-like conditions
 */
export function isSatelliteMode(): boolean {
  const info = getNetworkModeInfo();
  return info.isSatellite;
}
