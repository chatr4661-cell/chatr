/**
 * Audio Optimization for Ultra-Low Bandwidth
 * 
 * Hard-enforces Opus codec settings based on network mode:
 * - MODE_1: 8-12 kbps, mono, DTX enabled, FEC enabled
 * - MODE_2: 16-24 kbps, mono, DTX enabled
 * - MODE_3+: Auto bitrate
 * 
 * These limits are HARD-ENFORCED regardless of web behavior.
 */

import { NetworkMode, getNetworkModeInfo, onNetworkModeChange } from './nativeNetworkBridge';

export interface AudioOptimizationConfig {
  maxBitrate: number; // kbps
  useDTX: boolean; // Discontinuous transmission
  useFEC: boolean; // Forward error correction
  useStereo: boolean;
  sampleRate: number;
  packetTime: number; // ms per packet
  cbr: boolean; // Constant bitrate
}

// Audio configurations per network mode
const AUDIO_CONFIGS: Record<NetworkMode, AudioOptimizationConfig> = {
  [NetworkMode.MODE_0_OFFLINE]: {
    maxBitrate: 0,
    useDTX: true,
    useFEC: true,
    useStereo: false,
    sampleRate: 8000,
    packetTime: 60,
    cbr: false
  },
  [NetworkMode.MODE_1_ULTRA_LOW]: {
    maxBitrate: 12, // 8-12 kbps - satellite survival
    useDTX: true, // Critical for low bandwidth - silence suppression
    useFEC: true, // Forward error correction for packet loss
    useStereo: false, // Mono only
    sampleRate: 16000, // Narrowband
    packetTime: 60, // Larger packets = fewer headers
    cbr: true // Constant bitrate for predictability
  },
  [NetworkMode.MODE_2_LOW]: {
    maxBitrate: 24, // 16-24 kbps
    useDTX: true,
    useFEC: true,
    useStereo: false,
    sampleRate: 16000,
    packetTime: 40,
    cbr: true
  },
  [NetworkMode.MODE_3_NORMAL]: {
    maxBitrate: 32,
    useDTX: true,
    useFEC: true,
    useStereo: false,
    sampleRate: 24000,
    packetTime: 20,
    cbr: false
  },
  [NetworkMode.MODE_4_HIGH]: {
    maxBitrate: 64, // High quality
    useDTX: false,
    useFEC: false,
    useStereo: true, // Stereo for high quality
    sampleRate: 48000,
    packetTime: 20,
    cbr: false
  }
};

/**
 * Get audio configuration for current network mode
 */
export function getAudioConfig(): AudioOptimizationConfig {
  const modeInfo = getNetworkModeInfo();
  return AUDIO_CONFIGS[modeInfo.mode];
}

/**
 * Apply audio optimization to a peer connection
 */
export async function applyAudioOptimization(
  peerConnection: RTCPeerConnection,
  forceConfig?: AudioOptimizationConfig
): Promise<void> {
  const config = forceConfig || getAudioConfig();
  
  console.log('🔊 [AudioOptimization] Applying config:', {
    maxBitrate: config.maxBitrate,
    DTX: config.useDTX,
    FEC: config.useFEC,
    stereo: config.useStereo
  });
  
  const senders = peerConnection.getSenders();
  
  for (const sender of senders) {
    if (!sender.track || sender.track.kind !== 'audio') continue;
    
    try {
      const params = sender.getParameters();
      
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      
      // Set max bitrate (hard limit)
      params.encodings[0].maxBitrate = config.maxBitrate * 1000; // kbps to bps
      
      // Priority settings
      params.encodings[0].priority = config.maxBitrate < 20 ? 'high' : 'medium';
      params.encodings[0].networkPriority = 'high'; // Audio always high priority
      
      await sender.setParameters(params);
      
      console.log('🔊 [AudioOptimization] Applied bitrate limit:', config.maxBitrate, 'kbps');
    } catch (e) {
      console.warn('⚠️ [AudioOptimization] Failed to set parameters:', e);
    }
  }
}

/**
 * Get SDP with Opus optimization
 * Modifies SDP to enforce Opus codec settings
 */
export function optimizeOpusSDP(sdp: string, config?: AudioOptimizationConfig): string {
  const audioConfig = config || getAudioConfig();
  
  // Find and modify Opus fmtp line
  const lines = sdp.split('\r\n');
  const modifiedLines: string[] = [];
  
  let opusPayloadType: string | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Find Opus payload type
    if (line.includes('a=rtpmap:') && line.toLowerCase().includes('opus')) {
      const match = line.match(/a=rtpmap:(\d+)\s+opus/i);
      if (match) {
        opusPayloadType = match[1];
      }
    }
    
    // Modify Opus fmtp line
    if (opusPayloadType && line.startsWith(`a=fmtp:${opusPayloadType}`)) {
      const fmtpParams: string[] = [];
      
      // DTX (Discontinuous Transmission) - silence suppression
      fmtpParams.push(`usedtx=${audioConfig.useDTX ? '1' : '0'}`);
      
      // FEC (Forward Error Correction)
      fmtpParams.push(`useinbandfec=${audioConfig.useFEC ? '1' : '0'}`);
      
      // Stereo
      fmtpParams.push(`stereo=${audioConfig.useStereo ? '1' : '0'}`);
      
      // Max average bitrate
      fmtpParams.push(`maxaveragebitrate=${audioConfig.maxBitrate * 1000}`);
      
      // Max playback rate (sample rate)
      fmtpParams.push(`maxplaybackrate=${audioConfig.sampleRate}`);
      
      // Sprop max capture rate
      fmtpParams.push(`sprop-maxcapturerate=${audioConfig.sampleRate}`);
      
      // CBR (Constant Bitrate)
      if (audioConfig.cbr) {
        fmtpParams.push('cbr=1');
      }
      
      // Packet time (ptime)
      fmtpParams.push(`ptime=${audioConfig.packetTime}`);
      fmtpParams.push(`maxptime=${audioConfig.packetTime}`);
      
      line = `a=fmtp:${opusPayloadType} ${fmtpParams.join('; ')}`;
      
      console.log('🔊 [AudioOptimization] Modified Opus fmtp:', line);
    }
    
    modifiedLines.push(line);
  }
  
  return modifiedLines.join('\r\n');
}

/**
 * Get media constraints optimized for current network
 */
export function getOptimizedAudioConstraints(): MediaTrackConstraints {
  const config = getAudioConfig();
  
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: config.sampleRate,
    sampleSize: 16,
    channelCount: config.useStereo ? 2 : 1
  };
}

/**
 * Monitor and auto-adjust audio quality based on network changes
 */
export function setupAudioOptimizationMonitor(
  getPeerConnection: () => RTCPeerConnection | null
): () => void {
  const unsubscribe = onNetworkModeChange(async (modeInfo) => {
    const pc = getPeerConnection();
    if (!pc) return;
    
    console.log('🔊 [AudioOptimization] Network mode changed, re-applying optimization');
    await applyAudioOptimization(pc);
    
    // If in ultra-low mode, consider ICE restart with new constraints
    if (modeInfo.mode === NetworkMode.MODE_1_ULTRA_LOW) {
      console.log('🔊 [AudioOptimization] Ultra-low mode - voice-only optimization active');
    }
  });
  
  return unsubscribe;
}

/**
 * Validate audio can be established on current network
 */
export function canEstablishAudio(): boolean {
  const modeInfo = getNetworkModeInfo();
  return modeInfo.mode !== NetworkMode.MODE_0_OFFLINE;
}

/**
 * Get estimated audio quality description
 */
export function getAudioQualityDescription(): string {
  const modeInfo = getNetworkModeInfo();
  
  switch (modeInfo.mode) {
    case NetworkMode.MODE_0_OFFLINE:
      return 'No connection';
    case NetworkMode.MODE_1_ULTRA_LOW:
      return 'Voice optimized (low bandwidth)';
    case NetworkMode.MODE_2_LOW:
      return 'Standard voice quality';
    case NetworkMode.MODE_3_NORMAL:
      return 'Good voice quality';
    case NetworkMode.MODE_4_HIGH:
      return 'HD voice quality';
    default:
      return 'Unknown';
  }
}
