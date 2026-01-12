/**
 * Graceful Degradation Controller
 * 
 * Implements automatic fallback chain:
 * VIDEO → AUDIO → LOW-BIT AUDIO → TEXT → STORE & FORWARD
 * 
 * Calls must NEVER hard-fail due to bandwidth.
 * They should downgrade silently and recover automatically.
 */

import { NetworkMode, getNetworkModeInfo, onNetworkModeChange } from './nativeNetworkBridge';
import { getVideoPolicy, executeKillSwitch } from './videoKillSwitch';
import { getAudioConfig, applyAudioOptimization } from './audioOptimization';

export enum MediaQuality {
  HD_VIDEO = 5,     // 1080p video + HD audio
  SD_VIDEO = 4,     // 480p video + audio
  AUDIO_HD = 3,     // High quality audio only
  AUDIO_LOW = 2,    // Low bitrate audio (survival mode)
  TEXT_ONLY = 1,    // Text messaging fallback
  STORE_FORWARD = 0 // Store & forward (offline)
}

export interface DegradationState {
  currentQuality: MediaQuality;
  targetQuality: MediaQuality;
  isDegrading: boolean;
  isRecovering: boolean;
  lastChange: number;
  reason: string;
  fallbackCount: number;
}

export interface DegradationConfig {
  onQualityChange?: (newQuality: MediaQuality, reason: string) => void;
  onDegradeStart?: (from: MediaQuality, to: MediaQuality) => void;
  onRecoveryStart?: (from: MediaQuality, to: MediaQuality) => void;
  onFallbackToText?: () => void;
  onOfflineMode?: () => void;
  minRecoveryTimeMs?: number; // Minimum time before attempting recovery
}

// State
let state: DegradationState = {
  currentQuality: MediaQuality.AUDIO_HD,
  targetQuality: MediaQuality.AUDIO_HD,
  isDegrading: false,
  isRecovering: false,
  lastChange: Date.now(),
  reason: 'Initial',
  fallbackCount: 0
};

let config: DegradationConfig = {};
let degradationTimer: NodeJS.Timeout | null = null;
let recoveryTimer: NodeJS.Timeout | null = null;
let peerConnection: RTCPeerConnection | null = null;

const MIN_RECOVERY_TIME = 10000; // 10 seconds before attempting recovery
const DEGRADATION_STEP_DELAY = 2000; // 2 seconds between degradation steps

/**
 * Initialize graceful degradation controller
 */
export function initializeGracefulDegradation(
  pc: RTCPeerConnection | null,
  userConfig: DegradationConfig = {}
): () => void {
  console.log('🔄 [Degradation] Initializing...');
  
  peerConnection = pc;
  config = { ...userConfig, minRecoveryTimeMs: MIN_RECOVERY_TIME };
  
  // Set initial quality based on network
  updateQualityFromNetwork();
  
  // Monitor network changes
  const unsubscribe = onNetworkModeChange((modeInfo) => {
    const targetQuality = getTargetQualityForMode(modeInfo.mode);
    
    if (targetQuality < state.currentQuality) {
      // Network degraded - start degradation
      startDegradation(targetQuality, `Network changed to ${NetworkMode[modeInfo.mode]}`);
    } else if (targetQuality > state.currentQuality) {
      // Network improved - start recovery
      startRecovery(targetQuality, `Network improved to ${NetworkMode[modeInfo.mode]}`);
    }
  });
  
  console.log('🔄 [Degradation] Initialized. Current quality:', MediaQuality[state.currentQuality]);
  
  return () => {
    unsubscribe();
    cleanup();
  };
}

/**
 * Update peer connection reference
 */
export function updatePeerConnection(pc: RTCPeerConnection | null): void {
  peerConnection = pc;
}

/**
 * Get target quality for a network mode
 */
function getTargetQualityForMode(mode: NetworkMode): MediaQuality {
  switch (mode) {
    case NetworkMode.MODE_0_OFFLINE:
      return MediaQuality.STORE_FORWARD;
    case NetworkMode.MODE_1_ULTRA_LOW:
      return MediaQuality.AUDIO_LOW;
    case NetworkMode.MODE_2_LOW:
      return MediaQuality.AUDIO_LOW;
    case NetworkMode.MODE_3_NORMAL:
      return MediaQuality.AUDIO_HD;
    case NetworkMode.MODE_4_HIGH:
      return MediaQuality.HD_VIDEO;
    default:
      return MediaQuality.AUDIO_HD;
  }
}

/**
 * Update quality from current network state
 */
function updateQualityFromNetwork(): void {
  const modeInfo = getNetworkModeInfo();
  const targetQuality = getTargetQualityForMode(modeInfo.mode);
  
  state.currentQuality = targetQuality;
  state.targetQuality = targetQuality;
  state.reason = `Network mode: ${NetworkMode[modeInfo.mode]}`;
}

/**
 * Start degradation process
 */
function startDegradation(target: MediaQuality, reason: string): void {
  if (state.isDegrading) return;
  if (target >= state.currentQuality) return;
  
  console.log(`⬇️ [Degradation] Starting: ${MediaQuality[state.currentQuality]} → ${MediaQuality[target]}`);
  console.log(`⬇️ [Degradation] Reason: ${reason}`);
  
  state.isDegrading = true;
  state.isRecovering = false;
  state.targetQuality = target;
  state.fallbackCount++;
  
  // Cancel any recovery in progress
  if (recoveryTimer) {
    clearTimeout(recoveryTimer);
    recoveryTimer = null;
  }
  
  config.onDegradeStart?.(state.currentQuality, target);
  
  // Execute degradation steps
  executeDegradationStep();
}

/**
 * Execute one degradation step
 */
function executeDegradationStep(): void {
  if (!state.isDegrading || state.currentQuality <= state.targetQuality) {
    state.isDegrading = false;
    return;
  }
  
  const previousQuality = state.currentQuality;
  const nextQuality = previousQuality - 1;
  
  // Apply the degradation
  applyQualityLevel(nextQuality as MediaQuality);
  
  state.currentQuality = nextQuality as MediaQuality;
  state.lastChange = Date.now();
  state.reason = `Degraded from ${MediaQuality[previousQuality]}`;
  
  console.log(`⬇️ [Degradation] Step: ${MediaQuality[previousQuality]} → ${MediaQuality[nextQuality]}`);
  
  config.onQualityChange?.(state.currentQuality, state.reason);
  
  // Special callbacks
  if (state.currentQuality === MediaQuality.TEXT_ONLY) {
    config.onFallbackToText?.();
  } else if (state.currentQuality === MediaQuality.STORE_FORWARD) {
    config.onOfflineMode?.();
  }
  
  // Schedule next step if needed
  if (state.currentQuality > state.targetQuality) {
    degradationTimer = setTimeout(executeDegradationStep, DEGRADATION_STEP_DELAY);
  } else {
    state.isDegrading = false;
    console.log(`⬇️ [Degradation] Complete. Final quality: ${MediaQuality[state.currentQuality]}`);
  }
}

/**
 * Start recovery process
 */
function startRecovery(target: MediaQuality, reason: string): void {
  if (state.isRecovering) return;
  if (target <= state.currentQuality) return;
  
  // Wait minimum time before recovery
  const timeSinceLastChange = Date.now() - state.lastChange;
  if (timeSinceLastChange < (config.minRecoveryTimeMs || MIN_RECOVERY_TIME)) {
    console.log('⬆️ [Degradation] Recovery delayed - too soon after last change');
    
    recoveryTimer = setTimeout(() => {
      startRecovery(target, reason);
    }, (config.minRecoveryTimeMs || MIN_RECOVERY_TIME) - timeSinceLastChange);
    
    return;
  }
  
  console.log(`⬆️ [Degradation] Starting recovery: ${MediaQuality[state.currentQuality]} → ${MediaQuality[target]}`);
  console.log(`⬆️ [Degradation] Reason: ${reason}`);
  
  state.isRecovering = true;
  state.isDegrading = false;
  state.targetQuality = target;
  
  // Cancel any degradation in progress
  if (degradationTimer) {
    clearTimeout(degradationTimer);
    degradationTimer = null;
  }
  
  config.onRecoveryStart?.(state.currentQuality, target);
  
  // Execute recovery steps
  executeRecoveryStep();
}

/**
 * Execute one recovery step
 */
function executeRecoveryStep(): void {
  if (!state.isRecovering || state.currentQuality >= state.targetQuality) {
    state.isRecovering = false;
    return;
  }
  
  const previousQuality = state.currentQuality;
  const nextQuality = previousQuality + 1;
  
  // Apply the recovery
  applyQualityLevel(nextQuality as MediaQuality);
  
  state.currentQuality = nextQuality as MediaQuality;
  state.lastChange = Date.now();
  state.reason = `Recovered from ${MediaQuality[previousQuality]}`;
  
  console.log(`⬆️ [Degradation] Step: ${MediaQuality[previousQuality]} → ${MediaQuality[nextQuality]}`);
  
  config.onQualityChange?.(state.currentQuality, state.reason);
  
  // Schedule next step if needed
  if (state.currentQuality < state.targetQuality) {
    recoveryTimer = setTimeout(executeRecoveryStep, DEGRADATION_STEP_DELAY);
  } else {
    state.isRecovering = false;
    console.log(`⬆️ [Degradation] Recovery complete. Final quality: ${MediaQuality[state.currentQuality]}`);
  }
}

/**
 * Apply a specific quality level
 */
async function applyQualityLevel(quality: MediaQuality): Promise<void> {
  console.log(`🔄 [Degradation] Applying quality level: ${MediaQuality[quality]}`);
  
  switch (quality) {
    case MediaQuality.HD_VIDEO:
      // Enable HD video + audio
      // Video settings handled by videoKillSwitch
      if (peerConnection) {
        await applyAudioOptimization(peerConnection);
      }
      break;
      
    case MediaQuality.SD_VIDEO:
      // Reduce video quality
      if (peerConnection) {
        await reduceVideoBitrate(peerConnection, 300); // 300 kbps
      }
      break;
      
    case MediaQuality.AUDIO_HD:
      // Disable video, keep HD audio
      executeKillSwitch('Downgrading to audio only');
      if (peerConnection) {
        await applyAudioOptimization(peerConnection);
      }
      break;
      
    case MediaQuality.AUDIO_LOW:
      // Low bitrate audio (survival mode)
      executeKillSwitch('Network too weak for video');
      if (peerConnection) {
        await applyLowBitrateAudio(peerConnection);
      }
      break;
      
    case MediaQuality.TEXT_ONLY:
      // Disable all media, switch to text
      if (peerConnection) {
        disableAllMedia(peerConnection);
      }
      break;
      
    case MediaQuality.STORE_FORWARD:
      // Offline - queue messages
      if (peerConnection) {
        disableAllMedia(peerConnection);
      }
      break;
  }
}

/**
 * Reduce video bitrate on peer connection
 */
async function reduceVideoBitrate(pc: RTCPeerConnection, maxKbps: number): Promise<void> {
  const senders = pc.getSenders();
  
  for (const sender of senders) {
    if (!sender.track || sender.track.kind !== 'video') continue;
    
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      
      params.encodings[0].maxBitrate = maxKbps * 1000;
      params.encodings[0].maxFramerate = 15;
      
      await sender.setParameters(params);
    } catch (e) {
      console.warn('[Degradation] Failed to reduce video bitrate:', e);
    }
  }
}

/**
 * Apply low bitrate audio settings
 */
async function applyLowBitrateAudio(pc: RTCPeerConnection): Promise<void> {
  const senders = pc.getSenders();
  
  for (const sender of senders) {
    if (!sender.track || sender.track.kind !== 'audio') continue;
    
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      
      params.encodings[0].maxBitrate = 12000; // 12 kbps
      params.encodings[0].priority = 'high';
      params.encodings[0].networkPriority = 'high';
      
      await sender.setParameters(params);
    } catch (e) {
      console.warn('[Degradation] Failed to apply low bitrate audio:', e);
    }
  }
}

/**
 * Disable all media tracks
 */
function disableAllMedia(pc: RTCPeerConnection): void {
  const senders = pc.getSenders();
  
  for (const sender of senders) {
    if (sender.track) {
      sender.track.enabled = false;
    }
  }
  
  console.log('[Degradation] All media disabled');
}

/**
 * Force degradation to a specific level
 */
export function forceDegradeTo(quality: MediaQuality, reason: string): void {
  if (quality < state.currentQuality) {
    startDegradation(quality, reason);
  }
}

/**
 * Force recovery to a specific level
 */
export function forceRecoverTo(quality: MediaQuality, reason: string): void {
  if (quality > state.currentQuality) {
    startRecovery(quality, reason);
  }
}

/**
 * Get current degradation state
 */
export function getDegradationState(): DegradationState {
  return { ...state };
}

/**
 * Get user-friendly quality description
 */
export function getQualityDescription(quality?: MediaQuality): string {
  const q = quality ?? state.currentQuality;
  
  switch (q) {
    case MediaQuality.HD_VIDEO:
      return 'HD Video';
    case MediaQuality.SD_VIDEO:
      return 'Standard Video';
    case MediaQuality.AUDIO_HD:
      return 'Voice Call';
    case MediaQuality.AUDIO_LOW:
      return 'Voice Optimized (Low Signal)';
    case MediaQuality.TEXT_ONLY:
      return 'Text Only';
    case MediaQuality.STORE_FORWARD:
      return 'Offline (Messages Queued)';
    default:
      return 'Unknown';
  }
}

/**
 * Check if we're in fallback mode
 */
export function isInFallbackMode(): boolean {
  return state.currentQuality < MediaQuality.AUDIO_HD;
}

/**
 * Get number of fallbacks that occurred
 */
export function getFallbackCount(): number {
  return state.fallbackCount;
}

/**
 * Reset fallback counter
 */
export function resetFallbackCount(): void {
  state.fallbackCount = 0;
}

/**
 * Cleanup
 */
function cleanup(): void {
  if (degradationTimer) {
    clearTimeout(degradationTimer);
    degradationTimer = null;
  }
  
  if (recoveryTimer) {
    clearTimeout(recoveryTimer);
    recoveryTimer = null;
  }
  
  state.isDegrading = false;
  state.isRecovering = false;
}
