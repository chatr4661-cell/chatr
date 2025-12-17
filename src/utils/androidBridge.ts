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
 * Sync auth state to native Android app
 * This enables background services, FCM, and native call UI
 */
export const syncAuthToNative = (
  state: 'SIGNED_IN' | 'SIGNED_OUT',
  userId: string | null,
  accessToken: string | null
) => {
  const data = JSON.stringify({
    state,
    userId,
    accessToken
  });

  console.log(`[NativeBridge] Syncing auth state: ${state}, userId: ${userId?.substring(0, 8)}...`);

  // Try NativeBridge.sendEvent first (newer interface)
  if (typeof window !== "undefined" && window.NativeBridge?.sendEvent) {
    try {
      window.NativeBridge.sendEvent('auth_state_changed', data);
      console.log('[NativeBridge] Auth state synced via NativeBridge.sendEvent');
      return true;
    } catch (e) {
      console.error('[NativeBridge] Failed to call NativeBridge.sendEvent:', e);
    }
  }

  // Try ChatrNative.postMessage (WebViewBridgeManager interface)
  if (typeof window !== "undefined" && window.ChatrNative?.postMessage) {
    try {
      const message = JSON.stringify({
        type: 'auth_state_changed',
        data: { state, userId, accessToken }
      });
      window.ChatrNative.postMessage(message);
      console.log('[NativeBridge] Auth state synced via ChatrNative.postMessage');
      return true;
    } catch (e) {
      console.error('[NativeBridge] Failed to call ChatrNative.postMessage:', e);
    }
  }

  console.log('[NativeBridge] No native bridge available (running in browser)');
  return false;
};

/**
 * Check if running inside native Android WebView
 */
export const isNativeApp = (): boolean => {
  return typeof window !== "undefined" && (
    !!window.Android || 
    !!window.NativeBridge || 
    !!window.ChatrNative
  );
};
