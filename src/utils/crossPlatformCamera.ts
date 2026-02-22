/**
 * Cross-Platform Camera Utility
 * Ensures front/rear camera switching works reliably across:
 * - Chrome, Safari, Edge, Firefox (desktop & mobile)
 * - iOS WKWebView (Capacitor)
 * - Android WebView (Capacitor)
 * - Native camera APIs
 */

import { Capacitor } from '@capacitor/core';

export type FacingMode = 'user' | 'environment';

interface CameraProfile {
  video: MediaTrackConstraints;
  label: string;
}

/**
 * Detect platform for camera strategy selection
 */
function detectPlatform(): 'ios-webview' | 'android-webview' | 'ios-safari' | 'android-chrome' | 'desktop' {
  const ua = navigator.userAgent;
  const isNative = Capacitor.isNativePlatform();
  
  if (isNative && Capacitor.getPlatform() === 'ios') return 'ios-webview';
  if (isNative && Capacitor.getPlatform() === 'android') return 'android-webview';
  if (/iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua)) return 'ios-safari';
  if (/Android/.test(ua)) return 'android-chrome';
  return 'desktop';
}

/**
 * Check if the device has multiple cameras (front + rear)
 */
export async function hasMultipleCameras(): Promise<boolean> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter(d => d.kind === 'videoinput');
    return videoInputs.length > 1;
  } catch {
    // If we can't enumerate, assume mobile has multiple cameras
    const platform = detectPlatform();
    return platform !== 'desktop';
  }
}

/**
 * Get the device ID for the opposite camera.
 * Used as a fallback when facingMode constraints aren't supported.
 */
async function getAlternateCameraDeviceId(currentTrack: MediaStreamTrack | null): Promise<string | null> {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoInputs = devices.filter(d => d.kind === 'videoinput');
    
    if (videoInputs.length < 2) return null;
    
    const currentDeviceId = currentTrack?.getSettings()?.deviceId;
    
    // Find a different camera
    const alternate = videoInputs.find(d => d.deviceId !== currentDeviceId);
    return alternate?.deviceId ?? null;
  } catch {
    return null;
  }
}

/**
 * Build progressive fallback camera profiles for the target facing mode.
 * Ordered from best quality to most compatible.
 */
function buildCameraProfiles(
  targetFacing: FacingMode,
  currentTrack: MediaStreamTrack | null,
  alternateDeviceId: string | null
): CameraProfile[] {
  const platform = detectPlatform();
  const profiles: CameraProfile[] = [];

  // iOS Safari/WKWebView: { exact } often fails, prefer ideal facingMode
  if (platform === 'ios-safari' || platform === 'ios-webview') {
    profiles.push(
      { video: { facingMode: targetFacing, width: { ideal: 1920 }, height: { ideal: 1080 } }, label: 'ios-ideal-1080p' },
      { video: { facingMode: targetFacing, width: { ideal: 1280 }, height: { ideal: 720 } }, label: 'ios-ideal-720p' },
      { video: { facingMode: targetFacing }, label: 'ios-basic' },
    );
  } else {
    // Android & Desktop: try exact first, then ideal
    profiles.push(
      { video: { facingMode: { exact: targetFacing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, label: 'exact-1080p' },
      { video: { facingMode: { exact: targetFacing }, width: { ideal: 1280 }, height: { ideal: 720 } }, label: 'exact-720p' },
      { video: { facingMode: targetFacing, width: { ideal: 1280 }, height: { ideal: 720 } }, label: 'ideal-720p' },
      { video: { facingMode: targetFacing, width: { ideal: 640 }, height: { ideal: 480 } }, label: 'ideal-480p' },
      { video: { facingMode: targetFacing }, label: 'basic' },
    );
  }

  // Last resort: use deviceId if facingMode fails entirely
  if (alternateDeviceId) {
    profiles.push(
      { video: { deviceId: { exact: alternateDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }, label: 'deviceId-720p' },
      { video: { deviceId: { exact: alternateDeviceId } }, label: 'deviceId-basic' },
    );
  }

  return profiles;
}

/**
 * Acquire a video track for the target facing mode with full cross-platform fallbacks.
 * Returns the new track or null if all attempts fail.
 */
export async function acquireCameraTrack(
  targetFacing: FacingMode,
  currentTrack: MediaStreamTrack | null
): Promise<{ track: MediaStreamTrack; actualFacing: FacingMode } | null> {
  const alternateDeviceId = await getAlternateCameraDeviceId(currentTrack);
  const profiles = buildCameraProfiles(targetFacing, currentTrack, alternateDeviceId);

  for (const profile of profiles) {
    try {
      console.log(`📷 [Camera] Trying profile: ${profile.label}`);
      const stream = await navigator.mediaDevices.getUserMedia({ video: profile.video });
      const track = stream.getVideoTracks()[0];
      
      if (track) {
        // Determine actual facing mode from track settings
        const settings = track.getSettings();
        const actualFacing = inferFacingMode(settings, targetFacing, profile);
        
        console.log(`✅ [Camera] Acquired with profile: ${profile.label}, facing: ${actualFacing}`);
        return { track, actualFacing };
      }
    } catch (err) {
      console.log(`⚠️ [Camera] Profile ${profile.label} failed:`, (err as Error).message);
    }
  }

  console.error('❌ [Camera] All camera profiles failed');
  return null;
}

/**
 * Infer the actual facing mode from track settings.
 * Some browsers don't report facingMode in settings, so we use heuristics.
 */
function inferFacingMode(
  settings: MediaTrackSettings,
  requestedFacing: FacingMode,
  profile: CameraProfile
): FacingMode {
  // If the browser reports it, trust it
  if (settings.facingMode === 'user' || settings.facingMode === 'environment') {
    return settings.facingMode as FacingMode;
  }
  
  // If we used deviceId, we switched away from current → assume target
  if ('deviceId' in (profile.video as any) && (profile.video as any).deviceId) {
    return requestedFacing;
  }
  
  // Otherwise trust the requested value
  return requestedFacing;
}

/**
 * Determine if the video should be mirrored based on facing mode.
 * Front camera = mirrored, Rear camera = not mirrored.
 */
export function shouldMirrorVideo(facing: FacingMode): boolean {
  return facing === 'user';
}

/**
 * Get the CSS transform for the video element based on facing mode.
 */
export function getCameraMirrorStyle(facing: FacingMode): React.CSSProperties {
  return {
    transform: facing === 'user' ? 'scaleX(-1)' : 'none',
  };
}
