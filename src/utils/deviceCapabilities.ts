/**
 * Device Capability Detection
 * 
 * Detects hardware capabilities for 4K video, codec support,
 * and stores results in device_capabilities table.
 */

import { supabase } from '@/integrations/supabase/client';

export interface DeviceCapability {
  cpuThreads: number;
  deviceMemoryGb: number;
  maxCameraWidth: number;
  maxCameraHeight: number;
  supports4K: boolean;
  supportsAV1: boolean;
  supportsVP9: boolean;
  supportsH264: boolean;
  gpuRenderer: string;
  platform: string;
}

// Cache to avoid repeated detection
let cachedCapabilities: DeviceCapability | null = null;

/**
 * Detect codec support via RTCRtpSender.getCapabilities
 */
function detectCodecSupport(): { vp9: boolean; av1: boolean; h264: boolean } {
  const caps = RTCRtpSender.getCapabilities?.('video');
  if (!caps) return { vp9: false, av1: false, h264: true };

  const codecs = caps.codecs.map(c => c.mimeType.toLowerCase());
  return {
    vp9: codecs.some(c => c.includes('vp9')),
    av1: codecs.some(c => c.includes('av1')),
    h264: codecs.some(c => c.includes('h264')),
  };
}

/**
 * Detect GPU renderer via WebGL
 */
function detectGPU(): string {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return 'unknown';

    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return 'unknown';

    return gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Detect maximum camera resolution without opening a persistent stream
 */
async function detectMaxCameraResolution(): Promise<{ width: number; height: number }> {
  // Try 4K first, fall back progressively
  const resolutions = [
    { width: 3840, height: 2160 },
    { width: 2560, height: 1440 },
    { width: 1920, height: 1080 },
    { width: 1280, height: 720 },
  ];

  for (const res of resolutions) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { exact: res.width },
          height: { exact: res.height },
        },
      });
      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings();
      track.stop();
      stream.getTracks().forEach(t => t.stop());
      return { width: settings.width || res.width, height: settings.height || res.height };
    } catch {
      // Resolution not supported, try lower
    }
  }

  return { width: 1280, height: 720 }; // Default to 720p
}

/**
 * Full device capability detection
 */
export async function detectDeviceCapabilities(): Promise<DeviceCapability> {
  if (cachedCapabilities) return cachedCapabilities;

  const cpuThreads = navigator.hardwareConcurrency || 4;
  const deviceMemoryGb = (navigator as any).deviceMemory || 4;
  const codecSupport = detectCodecSupport();
  const gpuRenderer = detectGPU();

  // Only probe camera resolution if we have permission already
  // Otherwise default to 1080p to avoid permission prompts
  let maxCamera = { width: 1920, height: 1080 };
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const hasLabel = devices.some(d => d.kind === 'videoinput' && d.label);
    if (hasLabel) {
      maxCamera = await detectMaxCameraResolution();
    }
  } catch {
    // Permission denied or not available
  }

  // 4K requires: 8+ threads, 8+ GB RAM, camera supports 4K, VP9 or AV1
  const supports4K =
    cpuThreads >= 8 &&
    deviceMemoryGb >= 6 &&
    maxCamera.width >= 3840 &&
    (codecSupport.vp9 || codecSupport.av1);

  const capabilities: DeviceCapability = {
    cpuThreads,
    deviceMemoryGb,
    maxCameraWidth: maxCamera.width,
    maxCameraHeight: maxCamera.height,
    supports4K,
    supportsAV1: codecSupport.av1,
    supportsVP9: codecSupport.vp9,
    supportsH264: codecSupport.h264,
    gpuRenderer,
    platform: navigator.platform || 'unknown',
  };

  cachedCapabilities = capabilities;
  return capabilities;
}

/**
 * Persist device capabilities to database
 */
export async function persistDeviceCapabilities(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const caps = await detectDeviceCapabilities();

    await (supabase.from('device_capabilities') as any).upsert({
      user_id: user.id,
      cpu_threads: caps.cpuThreads,
      device_memory_gb: caps.deviceMemoryGb,
      max_camera_width: caps.maxCameraWidth,
      max_camera_height: caps.maxCameraHeight,
      supports_4k: caps.supports4K,
      supports_av1: caps.supportsAV1,
      supports_vp9: caps.supportsVP9,
      supports_h264: caps.supportsH264,
      gpu_renderer: caps.gpuRenderer,
      platform: caps.platform,
      user_agent: navigator.userAgent,
      last_detected_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    console.log('✅ [DeviceCaps] Persisted:', {
      supports4K: caps.supports4K,
      codecs: `VP9:${caps.supportsVP9} AV1:${caps.supportsAV1} H264:${caps.supportsH264}`,
      camera: `${caps.maxCameraWidth}x${caps.maxCameraHeight}`,
    });
  } catch (e) {
    console.warn('⚠️ [DeviceCaps] Failed to persist:', e);
  }
}

/**
 * Get optimal codec order based on device + platform
 */
export function getOptimalCodecOrder(caps?: DeviceCapability): ('VP9' | 'AV1' | 'VP8' | 'H264')[] {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isSafari = /Safari/i.test(navigator.userAgent) && !/Chrome/i.test(navigator.userAgent);

  // Safari/iOS: H264 is hardware-accelerated, VP9/AV1 are software
  if (isSafari) {
    return ['H264', 'VP8', 'VP9'];
  }

  // Android WebView: VP8 is safest, VP9 can freeze on some devices
  if (isAndroid) {
    if (caps?.supportsVP9 && (caps.cpuThreads >= 6)) {
      return ['VP9', 'VP8', 'H264'];
    }
    return ['VP8', 'H264', 'VP9'];
  }

  // Desktop Chrome/Edge: VP9 > AV1 > H264
  if (caps?.supportsAV1 && caps.cpuThreads >= 8) {
    return ['AV1', 'VP9', 'H264'];
  }

  if (caps?.supportsVP9) {
    return ['VP9', 'H264', 'VP8'];
  }

  return ['H264', 'VP8'];
}

/**
 * Apply preferred codec to peer connection transceivers
 */
export function applyOptimalCodecs(pc: RTCPeerConnection, caps?: DeviceCapability): void {
  const order = getOptimalCodecOrder(caps);
  const allCodecs = RTCRtpSender.getCapabilities?.('video')?.codecs;
  if (!allCodecs) return;

  const transceivers = pc.getTransceivers();
  for (const transceiver of transceivers) {
    if (transceiver.sender.track?.kind !== 'video' && transceiver.receiver.track?.kind !== 'video') {
      continue;
    }

    const sorted: any[] = [];
    for (const preferred of order) {
      const matching = allCodecs.filter(c =>
        c.mimeType.toLowerCase().includes(preferred.toLowerCase())
      );
      sorted.push(...matching);
    }
    // Add remaining codecs
    const remaining = allCodecs.filter(c => !sorted.includes(c));
    sorted.push(...remaining);

    if (sorted.length > 0 && transceiver.setCodecPreferences) {
      try {
        transceiver.setCodecPreferences(sorted);
        console.log(`🎬 [Codec] Applied order: ${order.join(' → ')}`);
      } catch (e) {
        console.warn('⚠️ [Codec] setCodecPreferences failed:', e);
      }
    }
  }
}
