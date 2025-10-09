export interface QualityPreset {
  bitrate: number;
  resolution: { width: number; height: number };
  fps: number;
  label: string;
}

export const QUALITY_PRESETS = {
  ultra: { 
    bitrate: 8000000, // 8 Mbps - Superior to FaceTime
    resolution: { width: 1920, height: 1080 },
    fps: 60,
    label: '1080p Ultra @ 60fps'
  },
  high: { 
    bitrate: 5000000, // 5 Mbps
    resolution: { width: 1920, height: 1080 },
    fps: 30,
    label: '1080p High'
  },
  medium: { 
    bitrate: 2500000, // 2.5 Mbps
    resolution: { width: 1280, height: 720 },
    fps: 30,
    label: '720p'
  },
  low: { 
    bitrate: 1000000, // 1 Mbps
    resolution: { width: 640, height: 480 },
    fps: 24,
    label: '480p'
  }
} as const;

export type QualityLevel = keyof typeof QUALITY_PRESETS;

export const getOptimalVideoConstraints = (quality: QualityLevel = 'ultra', facingMode: 'user' | 'environment' = 'user') => {
  const preset = QUALITY_PRESETS[quality];
  
  return {
    width: { ideal: preset.resolution.width, max: 1920, min: 640 },
    height: { ideal: preset.resolution.height, max: 1080, min: 480 },
    frameRate: { ideal: preset.fps, max: 60 },
    aspectRatio: 16/9,
    facingMode: facingMode
  };
};

export const getOptimalAudioConstraints = () => ({
  echoCancellation: { ideal: true },
  noiseSuppression: { ideal: true },
  autoGainControl: { ideal: true },
  sampleRate: { ideal: 48000 },
  sampleSize: { ideal: 24 },
  channelCount: { ideal: 2 }, // Stereo for better quality
  // @ts-ignore - Browser-specific extensions
  googEchoCancellation: true,
  googNoiseSuppression: true,
  googHighpassFilter: true,
  googAutoGainControl: true,
  googTypingNoiseDetection: true,
  googBeamforming: true,
  googArrayGeometry: true
});

export const setBandwidth = async (
  pc: RTCPeerConnection, 
  quality: QualityLevel
) => {
  const preset = QUALITY_PRESETS[quality];
  const sender = pc.getSenders().find(s => s.track?.kind === 'video');
  
  if (sender) {
    const parameters = sender.getParameters();
    if (!parameters.encodings || parameters.encodings.length === 0) {
      parameters.encodings = [{}];
    }
    
    parameters.encodings[0].maxBitrate = preset.bitrate;
    parameters.encodings[0].maxFramerate = preset.fps;
    
    try {
      await sender.setParameters(parameters);
      console.log(`✅ Quality set to ${preset.label} (${preset.bitrate / 1000000}Mbps)`);
    } catch (error) {
      console.error('Failed to set bandwidth:', error);
    }
  }
};

export const setPreferredCodec = (
  pc: RTCPeerConnection,
  preferredCodec: 'VP9' | 'VP8' | 'H264' = 'VP9'
) => {
  const transceivers = pc.getTransceivers();
  
  transceivers.forEach((transceiver) => {
    if (transceiver.sender && transceiver.sender.track?.kind === 'video') {
      const capabilities = RTCRtpSender.getCapabilities('video');
      if (!capabilities) return;

      const codecs = capabilities.codecs.filter(codec => {
        if (preferredCodec === 'VP9' && codec.mimeType.includes('VP9')) return true;
        if (preferredCodec === 'VP8' && codec.mimeType.includes('VP8')) return true;
        if (preferredCodec === 'H264' && codec.mimeType.includes('H264')) return true;
        return false;
      });

      // Put preferred codec first
      const reorderedCodecs = [
        ...codecs,
        ...capabilities.codecs.filter(c => !codecs.includes(c))
      ];

      transceiver.setCodecPreferences(reorderedCodecs);
      console.log(`✅ Preferred codec set to ${preferredCodec}`);
    }
  });
};

export const enableSimulcast = (pc: RTCPeerConnection) => {
  const sender = pc.getSenders().find(s => s.track?.kind === 'video');
  
  if (sender) {
    const parameters = sender.getParameters();
    
    parameters.encodings = [
      { rid: 'high', maxBitrate: 2500000, scaleResolutionDownBy: 1 },   // 1080p
      { rid: 'medium', maxBitrate: 1000000, scaleResolutionDownBy: 2 }, // 540p
      { rid: 'low', maxBitrate: 300000, scaleResolutionDownBy: 4 }      // 270p
    ];
    
    sender.setParameters(parameters)
      .then(() => console.log('✅ Simulcast enabled'))
      .catch(err => console.error('Failed to enable simulcast:', err));
  }
};

export interface NetworkStats {
  bandwidth: number; // kbps
  packetLoss: number; // percentage
  rtt: number; // ms
  jitter: number; // ms
  fps: number;
  resolution: string;
}

export const getNetworkStats = async (pc: RTCPeerConnection): Promise<NetworkStats> => {
  const stats = await pc.getStats();
  let bandwidth = 0;
  let packetLoss = 0;
  let rtt = 0;
  let jitter = 0;
  let fps = 0;
  let resolution = '';
  
  stats.forEach(report => {
    if (report.type === 'inbound-rtp' && report.kind === 'video') {
      // Calculate bandwidth (bytes to kbps)
      if (report.bytesReceived && report.timestamp) {
        bandwidth = (report.bytesReceived * 8) / 1000;
      }
      
      // Calculate packet loss
      const packetsLost = report.packetsLost || 0;
      const packetsReceived = report.packetsReceived || 0;
      packetLoss = (packetsLost / (packetsReceived + packetsLost)) * 100 || 0;
      
      // Jitter
      jitter = (report.jitter || 0) * 1000; // Convert to ms
      
      // FPS
      fps = report.framesPerSecond || 0;
      
      // Resolution
      if (report.frameWidth && report.frameHeight) {
        resolution = `${report.frameWidth}x${report.frameHeight}`;
      }
    }
    
    if (report.type === 'candidate-pair' && report.state === 'succeeded') {
      rtt = (report.currentRoundTripTime || 0) * 1000; // Convert to ms
    }
  });
  
  return { bandwidth, packetLoss, rtt, jitter, fps, resolution };
};

export const getOptimalQuality = (stats: NetworkStats): QualityLevel => {
  const { packetLoss, rtt, bandwidth } = stats;
  
  // Poor network conditions
  if (packetLoss > 5 || rtt > 300 || bandwidth < 800) {
    return 'low';
  }
  
  // Moderate network conditions
  if (packetLoss > 2 || rtt > 150 || bandwidth < 2000) {
    return 'medium';
  }
  
  // Good network conditions
  if (packetLoss > 1 || rtt > 100 || bandwidth < 3500) {
    return 'high';
  }
  
  // Excellent network conditions
  return 'ultra';
};
