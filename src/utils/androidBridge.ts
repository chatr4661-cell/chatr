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
  }
}

export const openMiniApp = (packageName: string, fallbackUrl: string) => {
  // Check if we are running inside the Chatr Android App
  if (typeof window !== "undefined" && window.Android) {
    try {
      console.log(`[Bridge] Launching Native: ${packageName}`);
      window.Android.launchApp(packageName, fallbackUrl);
    } catch (e) {
      console.error("[Bridge] Failed to call Android:", e);
      window.location.href = fallbackUrl;
    }
  } else {
    // Fallback for Desktop/iOS users
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
 * This enables native screens to access authenticated Supabase data
 */
export const syncAuthToNative = (
  state: 'SIGNED_IN' | 'SIGNED_OUT',
  userId: string | null,
  accessToken: string | null,
  refreshToken: string | null = null
): boolean => {
  console.log(`[NativeAuth] Syncing auth state: ${state}, userId: ${userId?.substring(0, 8)}...`);

  // Try NativeAuth bridge first (WebAuthBridge interface)
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

  // Fallback: Try NativeBridge.sendEvent
  if (typeof window !== "undefined" && window.NativeBridge?.sendEvent) {
    try {
      const data = JSON.stringify({
        state,
        userId,
        accessToken,
        refreshToken
      });
      window.NativeBridge.sendEvent('auth_state_changed', data);
      console.log('[NativeAuth] Auth state synced via NativeBridge.sendEvent');
      return true;
    } catch (e) {
      console.error('[NativeAuth] Failed to call NativeBridge.sendEvent:', e);
    }
  }

  // Fallback: Try ChatrNative.postMessage
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

/**
 * Check if running inside native Android WebView with NativeAuth bridge
 */
export const isNativeApp = (): boolean => {
  return typeof window !== "undefined" && (
    !!window.Android || 
    !!window.NativeBridge || 
    !!window.ChatrNative ||
    !!window.NativeAuth
  );
};

/**
 * Check if NativeAuth bridge is specifically available
 */
export const hasNativeAuthBridge = (): boolean => {
  return typeof window !== "undefined" && !!window.NativeAuth;
};

/**
 * Notify native shell when WebRTC call state changes
 * This syncs connection status to Android TelecomManager UI
 */
export const syncCallStateToNative = (
  callId: string,
  state: 'connecting' | 'connected' | 'ended' | 'failed'
): boolean => {
  console.log(`[NativeCall] Syncing call state: ${callId.slice(0, 8)} -> ${state}`);

  // Try ChatrCall bridge first (direct native bridge)
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

  // Fallback: NativeBridge.sendEvent
  if (typeof window !== "undefined" && window.NativeBridge?.sendEvent) {
    try {
      window.NativeBridge.sendEvent('call_state_changed', JSON.stringify({ callId, state }));
      console.log('[NativeCall] Call state synced via NativeBridge.sendEvent');
      return true;
    } catch (e) {
      console.error('[NativeCall] NativeBridge.sendEvent error:', e);
    }
  }

  // Fallback: ChatrNative.postMessage
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
