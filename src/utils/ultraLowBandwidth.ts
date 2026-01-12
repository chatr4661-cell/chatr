/**
 * Ultra-Low Bandwidth Infrastructure
 * 
 * Master initialization for all bandwidth optimization systems:
 * 1. Native Network Mode Bridge (MODE_0-4)
 * 2. Audio Optimization (Opus DTX/FEC)
 * 3. Video Kill-Switch
 * 4. Signaling Minimization
 * 5. LAN/Hotspot Mode
 * 6. Graceful Degradation
 * 7. UI State Signals
 */

import { initializeNetworkBridge, NetworkMode, getNetworkModeInfo } from './nativeNetworkBridge';
import { initializeVideoKillSwitch } from './videoKillSwitch';
import { initializeLANMode } from './lanMode';
import { initializeGracefulDegradation } from './gracefulDegradation';
import { initializeUIStateSignals, getUIStateInfo } from './uiStateSignals';

export * from './nativeNetworkBridge';
export * from './audioOptimization';
export * from './videoKillSwitch';
export * from './signalingMinimization';
export * from './lanMode';
export * from './gracefulDegradation';
export * from './uiStateSignals';

let initialized = false;
const cleanupFunctions: Array<() => void> = [];

/**
 * Initialize all ultra-low bandwidth systems
 */
export function initializeUltraLowBandwidth(): () => void {
  if (initialized) {
    console.log('📡 [ULB] Already initialized');
    return () => {};
  }

  console.log('📡 [ULB] ====================================');
  console.log('📡 [ULB] Ultra-Low Bandwidth Mode Initializing');
  console.log('📡 [ULB] ====================================');

  // 1. Network Bridge (foundation)
  initializeNetworkBridge();

  // 2. Video Kill-Switch
  cleanupFunctions.push(initializeVideoKillSwitch());

  // 3. LAN Mode
  cleanupFunctions.push(initializeLANMode());

  // 4. UI State Signals
  cleanupFunctions.push(initializeUIStateSignals());

  initialized = true;

  const modeInfo = getNetworkModeInfo();
  const uiState = getUIStateInfo();

  console.log('📡 [ULB] Initialization complete');
  console.log(`📡 [ULB] Network Mode: ${NetworkMode[modeInfo.mode]}`);
  console.log(`📡 [ULB] UI State: ${uiState.message}`);

  return () => {
    cleanupFunctions.forEach(fn => fn());
    cleanupFunctions.length = 0;
    initialized = false;
    console.log('📡 [ULB] Cleaned up');
  };
}

/**
 * Initialize degradation for an active call
 */
export function initializeCallDegradation(
  peerConnection: RTCPeerConnection | null,
  callbacks?: {
    onQualityChange?: (quality: any, reason: string) => void;
    onFallbackToText?: () => void;
  }
): () => void {
  return initializeGracefulDegradation(peerConnection, callbacks);
}

/**
 * Check if system is ready for calls
 */
export function isReadyForCalls(): boolean {
  const modeInfo = getNetworkModeInfo();
  return modeInfo.mode !== NetworkMode.MODE_0_OFFLINE;
}

/**
 * Get bandwidth optimization summary
 */
export function getBandwidthSummary(): {
  mode: string;
  audioKbps: number;
  videoAllowed: boolean;
  status: string;
} {
  const modeInfo = getNetworkModeInfo();
  const uiState = getUIStateInfo();

  return {
    mode: NetworkMode[modeInfo.mode],
    audioKbps: modeInfo.maxAudioBitrate,
    videoAllowed: modeInfo.videoAllowed,
    status: uiState.message
  };
}
