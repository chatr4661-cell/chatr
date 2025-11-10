import { Capacitor } from '@capacitor/core';

/**
 * Native Call UI Integration
 * Provides CallKit (iOS) and ConnectionService (Android) support
 * for native incoming call experience
 */

interface CallKitPlugin {
  setupCallKit: () => Promise<void>;
  reportIncomingCall: (options: IncomingCallOptions) => Promise<void>;
  endCall: (callId: string) => Promise<void>;
  updateCallStatus: (callId: string, status: string) => Promise<void>;
}

interface IncomingCallOptions {
  uuid: string;
  handle: string;
  handleType: 'generic' | 'number' | 'email';
  hasVideo: boolean;
  callerName: string;
  avatarUrl?: string;
}

/**
 * Check if native call UI is available
 */
export const isNativeCallUIAvailable = (): boolean => {
  return Capacitor.isNativePlatform() && (Capacitor.getPlatform() === 'ios' || Capacitor.getPlatform() === 'android');
};

/**
 * Initialize native call UI (CallKit for iOS, ConnectionService for Android)
 */
export const setupNativeCallUI = async (): Promise<void> => {
  if (!isNativeCallUIAvailable()) {
    console.log('Native call UI not available on this platform');
    return;
  }

  try {
    const platform = Capacitor.getPlatform();
    console.log(`🎯 Setting up native call UI for ${platform}`);

    // Check if CallKit plugin is available
    if ((window as any).CallKit) {
      const CallKit = (window as any).CallKit as CallKitPlugin;
      await CallKit.setupCallKit();
      console.log('✅ CallKit/ConnectionService initialized');
    } else {
      console.warn('⚠️ CallKit plugin not found. Install @capacitor-community/callkit');
      console.log('Run: npm install @capacitor-community/callkit');
    }
  } catch (error) {
    console.error('Failed to setup native call UI:', error);
  }
};

/**
 * Show native incoming call screen
 * iOS: CallKit full-screen interface
 * Android: ConnectionService notification
 */
export const showNativeIncomingCall = async (options: {
  callId: string;
  callerName: string;
  callerPhone?: string;
  callerAvatar?: string;
  isVideo: boolean;
}): Promise<void> => {
  if (!isNativeCallUIAvailable() || !(window as any).CallKit) {
    console.log('Using web-based incoming call UI');
    return;
  }

  try {
    const CallKit = (window as any).CallKit as CallKitPlugin;
    
    await CallKit.reportIncomingCall({
      uuid: options.callId,
      handle: options.callerPhone || options.callerName,
      handleType: options.callerPhone ? 'number' : 'generic',
      hasVideo: options.isVideo,
      callerName: options.callerName,
      avatarUrl: options.callerAvatar,
    });

    console.log('✅ Native incoming call UI displayed');
  } catch (error) {
    console.error('Failed to show native incoming call:', error);
  }
};

/**
 * End native call UI
 */
export const endNativeCall = async (callId: string): Promise<void> => {
  if (!isNativeCallUIAvailable() || !(window as any).CallKit) {
    return;
  }

  try {
    const CallKit = (window as any).CallKit as CallKitPlugin;
    await CallKit.endCall(callId);
    console.log('✅ Native call ended');
  } catch (error) {
    console.error('Failed to end native call:', error);
  }
};

/**
 * Update call status in native UI
 */
export const updateNativeCallStatus = async (
  callId: string,
  status: 'connecting' | 'connected' | 'ended'
): Promise<void> => {
  if (!isNativeCallUIAvailable() || !(window as any).CallKit) {
    return;
  }

  try {
    const CallKit = (window as any).CallKit as CallKitPlugin;
    await CallKit.updateCallStatus(callId, status);
  } catch (error) {
    console.error('Failed to update native call status:', error);
  }
};

/**
 * Listen for native call events (answer/reject from CallKit)
 */
export const registerNativeCallHandlers = (handlers: {
  onAnswer: (callId: string) => void;
  onReject: (callId: string) => void;
  onEnd: (callId: string) => void;
}): (() => void) => {
  if (!isNativeCallUIAvailable() || !(window as any).CallKit) {
    return () => {};
  }

  const handleCallAnswer = (event: any) => {
    console.log('📞 User answered call from CallKit:', event.detail.callId);
    handlers.onAnswer(event.detail.callId);
  };

  const handleCallReject = (event: any) => {
    console.log('📵 User rejected call from CallKit:', event.detail.callId);
    handlers.onReject(event.detail.callId);
  };

  const handleCallEnd = (event: any) => {
    console.log('☎️ Call ended from CallKit:', event.detail.callId);
    handlers.onEnd(event.detail.callId);
  };

  window.addEventListener('callkit:answer', handleCallAnswer);
  window.addEventListener('callkit:reject', handleCallReject);
  window.addEventListener('callkit:end', handleCallEnd);

  return () => {
    window.removeEventListener('callkit:answer', handleCallAnswer);
    window.removeEventListener('callkit:reject', handleCallReject);
    window.removeEventListener('callkit:end', handleCallEnd);
  };
};
