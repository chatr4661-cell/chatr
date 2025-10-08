import { Device } from '@capacitor/device';

/**
 * Get a unique device fingerprint
 * This combines multiple device identifiers for better uniqueness
 */
export const getDeviceFingerprint = async (): Promise<string> => {
  try {
    const info = await Device.getId();
    const deviceInfo = await Device.getInfo();
    
    // Combine device ID with platform and model for better uniqueness
    const fingerprint = `${info.identifier}-${deviceInfo.platform}-${deviceInfo.model}`;
    
    // Hash it for privacy
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(fingerprint)
    );
    
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
  } catch (error) {
    console.error('Error getting device fingerprint:', error);
    // Fallback to browser fingerprint for web
    return getBrowserFingerprint();
  }
};

/**
 * Fallback browser fingerprint for web platforms
 */
const getBrowserFingerprint = (): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
    return canvas.toDataURL();
  }
  
  // Last resort fallback
  return `web-${navigator.userAgent}-${screen.width}x${screen.height}`;
};

/**
 * Get device name for display
 */
export const getDeviceName = async (): Promise<string> => {
  try {
    const info = await Device.getInfo();
    return `${info.manufacturer} ${info.model}`.trim() || 'Unknown Device';
  } catch (error) {
    return navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Device';
  }
};

/**
 * Get device type
 */
export const getDeviceType = async (): Promise<string> => {
  try {
    const info = await Device.getInfo();
    return info.platform; // 'ios', 'android', 'web'
  } catch (error) {
    return 'web';
  }
};
