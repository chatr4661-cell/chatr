// Native bridge utilities for Android TelecomManager / iOS CallKit integration

/**
 * Native call state set by Android TelecomManager / iOS CallKit
 * Web UI checks this to auto-join calls accepted by native
 */
export interface NativeCallState {
  callId: string;
  accepted: boolean;
  acceptedAt?: number;
}

declare global {
  interface Window {
    Android?: {
      isAppInstalled: (packageName: string) => boolean;
      launchApp: (packageName: string, fallbackUrl: string) => void;
    };
    NativeBridge?: {
      sendEvent: (eventType: string, data: string) => void;
    };
    ChatrNative?: {
      postMessage: (message: string) => void;
    };
    NativeAuth?: {
      setAuthToken: (token: string) => void;
      setUserId: (userId: string) => void;
      setRefreshToken: (token: string) => void;
      clearAuth: () => void;
      getAuthToken: () => string | null;
      getUserId: () => string | null;
    };
    ChatrCall?: {
      onCallStateChanged: (callId: string, state: string) => void;
      onCallConnected: (callId: string) => void;
      onCallEnded: (callId: string) => void;
    };
    /** Set by native shell when user accepts via TelecomManager/CallKit */
    __CALL_STATE__?: NativeCallState;
  }
}

export const openMiniApp = (packageName: string, fallbackUrl: string) => {
  if (typeof window !== "undefined" && window.Android) {
    try {
      console.log(`[Bridge] Launching Native: ${packageName}`);
      window.Android.launchApp(packageName, fallbackUrl);
    } catch (e) {
      console.error("[Bridge] Failed to call Android:", e);
      window.location.href = fallbackUrl;
    }
  } else {
    console.log("[Bridge] Opening Web Fallback");
    window.open(fallbackUrl, "_blank");
  }
};

export const isAppInstalled = (packageName: string): boolean => {
  if (typeof window !== "undefined" && window.Android) {
    try {
      return window.Android.isAppInstalled(packageName);
    } catch (e) {
      console.error("[Bridge] Failed to check app:", e);
      return false;
    }
  }
  return false;
};

/**
 * Sync auth credentials to native Android app via NativeAuth bridge
 */
export const syncAuthToNative = (
  state: 'SIGNED_IN' | 'SIGNED_OUT',
  userId: string | null,
  accessToken: string | null,
  refreshToken: string | null = null
): boolean => {
  console.log(`[NativeAuth] Syncing auth state: ${state}, userId: ${userId?.substring(0, 8)}...`);

  if (typeof window !== "undefined" && window.NativeAuth) {
    try {
      if (state === 'SIGNED_IN' && accessToken && userId) {
        window.NativeAuth.setAuthToken(accessToken);
        window.NativeAuth.setUserId(userId);
        if (refreshToken) {
          window.NativeAuth.setRefreshToken(refreshToken);
        }
        console.log('[NativeAuth] Auth credentials synced to native SharedPreferences');
        return true;
      } else if (state === 'SIGNED_OUT') {
        window.NativeAuth.clearAuth();
        console.log('[NativeAuth] Auth cleared from native SharedPreferences');
        return true;
      }
    } catch (e) {
      console.error('[NativeAuth] Failed to call NativeAuth bridge:', e);
    }
  }

  if (typeof window !== "undefined" && window.NativeBridge?.sendEvent) {
    try {
      const data = JSON.stringify({ state, userId, accessToken, refreshToken });
      window.NativeBridge.sendEvent('auth_state_changed', data);
      console.log('[NativeAuth] Auth state synced via NativeBridge.sendEvent');
      return true;
    } catch (e) {
      console.error('[NativeAuth] Failed to call NativeBridge.sendEvent:', e);
    }
  }

  if (typeof window !== "undefined" && window.ChatrNative?.postMessage) {
    try {
      const message = JSON.stringify({
        type: 'auth_state_changed',
        data: { state, userId, accessToken, refreshToken }
      });
      window.ChatrNative.postMessage(message);
      console.log('[NativeAuth] Auth state synced via ChatrNative.postMessage');
      return true;
    } catch (e) {
      console.error('[NativeAuth] Failed to call ChatrNative.postMessage:', e);
    }
  }

  console.log('[NativeAuth] No native bridge available (running in browser)');
  return false;
};

export const isNativeApp = (): boolean => {
  return typeof window !== "undefined" && (
    !!window.Android || 
    !!window.NativeBridge || 
    !!window.ChatrNative ||
    !!window.NativeAuth
  );
};

export const hasNativeAuthBridge = (): boolean => {
  return typeof window !== "undefined" && !!window.NativeAuth;
};

/**
 * Notify native shell when WebRTC call state changes
 */
export const syncCallStateToNative = (
  callId: string,
  state: 'connecting' | 'connected' | 'ended' | 'failed'
): boolean => {
  console.log(`[NativeCall] Syncing call state: ${callId.slice(0, 8)} -> ${state}`);

  if (typeof window !== "undefined" && window.ChatrCall) {
    try {
      if (state === 'connected') {
        window.ChatrCall.onCallConnected(callId);
      } else if (state === 'ended') {
        window.ChatrCall.onCallEnded(callId);
      } else {
        window.ChatrCall.onCallStateChanged(callId, state);
      }
      console.log('[NativeCall] Call state synced via ChatrCall bridge');
      return true;
    } catch (e) {
      console.error('[NativeCall] ChatrCall bridge error:', e);
    }
  }

  if (typeof window !== "undefined" && window.NativeBridge?.sendEvent) {
    try {
      window.NativeBridge.sendEvent('call_state_changed', JSON.stringify({ callId, state }));
      console.log('[NativeCall] Call state synced via NativeBridge.sendEvent');
      return true;
    } catch (e) {
      console.error('[NativeCall] NativeBridge.sendEvent error:', e);
    }
  }

  if (typeof window !== "undefined" && window.ChatrNative?.postMessage) {
    try {
      window.ChatrNative.postMessage(JSON.stringify({
        type: 'call_state_changed',
        data: { callId, state }
      }));
      console.log('[NativeCall] Call state synced via ChatrNative.postMessage');
      return true;
    } catch (e) {
      console.error('[NativeCall] ChatrNative.postMessage error:', e);
    }
  }

  console.log('[NativeCall] No native call bridge available');
  return false;
};

/**
 * Check if native shell has already accepted a call
 * Used by web UI to skip the accept button and auto-join WebRTC
 */
export function isCallAcceptedByNative(callId?: string): boolean {
  const state = window.__CALL_STATE__;
  if (!state?.accepted) return false;
  
  if (callId && state.callId !== callId) return false;
  
  console.log(`[NativeCall] Call ${callId?.slice(0, 8) || 'any'} already accepted by native`);
  return true;
}

/**
 * Set native call state (called by native bridge when user accepts via TelecomManager/CallKit)
 */
export function setNativeCallAccepted(callId: string): void {
  window.__CALL_STATE__ = {
    callId,
    accepted: true,
    acceptedAt: Date.now()
  };
  console.log(`[NativeCall] Native accepted call: ${callId.slice(0, 8)}`);
}

/**
 * Clear native call state (called when call ends)
 */
export function clearNativeCallState(): void {
  window.__CALL_STATE__ = undefined;
  console.log('[NativeCall] Native call state cleared');
}
