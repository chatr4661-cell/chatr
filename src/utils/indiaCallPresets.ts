/**
 * India-First Call Presets
 * 
 * Optimized WebRTC configurations for different network conditions:
 * - INDIA_SURVIVAL: For 2G, basements, rural areas (default)
 * - INDIA_STANDARD: For 3G/moderate networks
 * - INDIA_QUALITY: For 4G/good networks with video
 */

import { NetworkQuality } from './networkClassification';

export interface CallPreset {
  name: string;
  description: string;
  
  // ICE configuration
  iceServers: RTCIceServer[];
  iceTransportPolicy: RTCIceTransportPolicy;
  
  // Connection tuning
  bundlePolicy: RTCBundlePolicy;
  rtcpMuxPolicy: RTCRtcpMuxPolicy;
  iceCandidatePoolSize: number;
  
  // Timeouts
  connectionTimeoutMs: number;
  iceDisconnectToleranceMs: number;
  maxReconnectAttempts: number;
  
  // Media constraints
  audio: MediaTrackConstraints;
  video: MediaTrackConstraints | false;
  
  // Bitrate limits (kbps)
  maxAudioBitrate: number;
  maxVideoBitrate: number;
}

// Base ICE servers (free tier)
const BASE_ICE_SERVERS: RTCIceServer[] = [
  // STUN servers
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  
  // TURN servers (metered.ca free tier)
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turns:openrelay.metered.ca:443'
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },
  {
    urls: [
      'turn:a.relay.metered.ca:80',
      'turn:a.relay.metered.ca:443',
    ],
    username: 'e8dd65c92ae9a3b9bfcbeb6e',
    credential: 'uWdWNmkhvyqTW1QP'
  }
];

/**
 * SURVIVAL PRESET - Default for India
 * 
 * Optimized for: 2G, basements, elevators, rural
 * Strategy: TURN-only, low bitrate, long timeouts
 */
export const INDIA_SURVIVAL: CallPreset = {
  name: 'INDIA_SURVIVAL',
  description: 'Optimized for hostile networks (2G, basements, rural)',
  
  iceServers: BASE_ICE_SERVERS,
  iceTransportPolicy: 'relay', // TURN-only for reliability
  
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  iceCandidatePoolSize: 10,
  
  connectionTimeoutMs: 45000, // 45s timeout
  iceDisconnectToleranceMs: 12000, // 12s elevator survival
  maxReconnectAttempts: 5,
  
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 16000, // Lower for bandwidth
    channelCount: 1, // Mono
  },
  video: false, // Audio-only in survival mode
  
  maxAudioBitrate: 12, // 12 kbps Opus
  maxVideoBitrate: 0,
};

/**
 * STANDARD PRESET - Moderate networks
 * 
 * Optimized for: 3G, mixed conditions
 * Strategy: Allow P2P, moderate quality
 */
export const INDIA_STANDARD: CallPreset = {
  name: 'INDIA_STANDARD',
  description: 'Balanced for moderate networks (3G)',
  
  iceServers: BASE_ICE_SERVERS,
  iceTransportPolicy: 'all', // Allow P2P
  
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  iceCandidatePoolSize: 15,
  
  connectionTimeoutMs: 30000,
  iceDisconnectToleranceMs: 8000, // 8s tolerance
  maxReconnectAttempts: 3,
  
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 24000,
    channelCount: 1,
  },
  video: {
    width: { ideal: 480, max: 640 },
    height: { ideal: 360, max: 480 },
    frameRate: { ideal: 15, max: 20 },
    facingMode: 'user',
  },
  
  maxAudioBitrate: 24,
  maxVideoBitrate: 300, // 300 kbps
};

/**
 * QUALITY PRESET - Good networks
 * 
 * Optimized for: 4G, WiFi, urban
 * Strategy: Full quality, fast connection
 */
export const INDIA_QUALITY: CallPreset = {
  name: 'INDIA_QUALITY',
  description: 'High quality for good networks (4G, WiFi)',
  
  iceServers: BASE_ICE_SERVERS,
  iceTransportPolicy: 'all',
  
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require',
  iceCandidatePoolSize: 20,
  
  connectionTimeoutMs: 20000,
  iceDisconnectToleranceMs: 5000,
  maxReconnectAttempts: 2,
  
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000, // Full quality
    channelCount: 2, // Stereo
  },
  video: {
    width: { ideal: 1280, min: 640 },
    height: { ideal: 720, min: 480 },
    frameRate: { ideal: 30, min: 15 },
    facingMode: 'user',
    aspectRatio: { ideal: 16/9 },
  },
  
  maxAudioBitrate: 48,
  maxVideoBitrate: 1500, // 1.5 Mbps
};

/**
 * Get appropriate preset based on network quality
 */
export function getCallPreset(networkQuality: NetworkQuality, isVideo: boolean): CallPreset {
  switch (networkQuality) {
    case 'HOSTILE':
      console.log('📱 [Preset] Using INDIA_SURVIVAL (hostile network)');
      return INDIA_SURVIVAL;
      
    case 'MODERATE':
      if (isVideo) {
        console.log('📱 [Preset] Using INDIA_STANDARD (moderate + video)');
        return INDIA_STANDARD;
      }
      console.log('📱 [Preset] Using INDIA_SURVIVAL (moderate + audio)');
      return { ...INDIA_SURVIVAL, name: 'INDIA_SURVIVAL_MODERATE' };
      
    case 'GOOD':
      console.log('📱 [Preset] Using INDIA_QUALITY (good network)');
      return INDIA_QUALITY;
      
    default:
      // Default to survival mode (India-first)
      console.log('📱 [Preset] Using INDIA_SURVIVAL (default)');
      return INDIA_SURVIVAL;
  }
}

/**
 * Get RTCConfiguration from preset
 */
export function getWebRTCConfig(preset: CallPreset): RTCConfiguration {
  return {
    iceServers: preset.iceServers,
    iceTransportPolicy: preset.iceTransportPolicy,
    bundlePolicy: preset.bundlePolicy,
    rtcpMuxPolicy: preset.rtcpMuxPolicy,
    iceCandidatePoolSize: preset.iceCandidatePoolSize,
  };
}

/**
 * Get media constraints from preset
 */
export function getMediaConstraints(preset: CallPreset, wantVideo: boolean): MediaStreamConstraints {
  return {
    audio: preset.audio,
    video: wantVideo && preset.video ? preset.video : false,
  };
}

/**
 * Apply bitrate limits to peer connection
 */
export async function applyBitrateLimits(
  pc: RTCPeerConnection, 
  preset: CallPreset
): Promise<void> {
  const senders = pc.getSenders();
  
  for (const sender of senders) {
    if (!sender.track) continue;
    
    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }
    
    if (sender.track.kind === 'audio') {
      params.encodings[0].maxBitrate = preset.maxAudioBitrate * 1000; // kbps to bps
    } else if (sender.track.kind === 'video') {
      params.encodings[0].maxBitrate = preset.maxVideoBitrate * 1000;
    }
    
    try {
      await sender.setParameters(params);
    } catch (e) {
      console.warn('⚠️ [Preset] Failed to set bitrate:', e);
    }
  }
}
