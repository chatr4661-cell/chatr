// PWA Utility Functions

// Check if app is installed as PWA
export const isPWA = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};

// Check if device is online
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Add network status listeners
export const addNetworkListeners = (
  onOnline: () => void,
  onOffline: () => void
) => {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  
  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
};

// Request notification permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

// Show notification
export const showNotification = (title: string, options?: NotificationOptions) => {
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        icon: '/chatr-logo.png',
        badge: '/chatr-logo.png',
        ...options
      } as any);
    });
  }
};

// Install prompt handler
let deferredPrompt: any = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    (window as any).deferredPrompt = e;
    console.log('💾 Install prompt ready');
    window.dispatchEvent(new CustomEvent('chatr:installpromptready'));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    (window as any).deferredPrompt = null;
    console.log('🎉 Chatr+ installed');
    window.dispatchEvent(new CustomEvent('chatr:appinstalled'));
  });
}

export const setupInstallPrompt = () => {
  // Backwards compatibility shim
};

export const showInstallPrompt = async (): Promise<boolean> => {
  const prompt = (typeof window !== 'undefined' && (window as any).deferredPrompt) || deferredPrompt;
  if (!prompt) {
    console.log('Install prompt not available');
    return false;
  }
  
  prompt.prompt();
  const { outcome } = await prompt.userChoice;
  console.log(`User response to install prompt: ${outcome}`);
  
  if (typeof window !== 'undefined') {
    (window as any).deferredPrompt = null;
  }
  deferredPrompt = null;
  return outcome === 'accepted';
};

export const canInstallPWA = (): boolean => {
  return typeof window !== 'undefined' && (!!(window as any).deferredPrompt || !!deferredPrompt);
};

/**
 * Universal 1-Tap Native Install Trigger
 * - On Android / Desktop: Pops native browser WebAPK dialog immediately, or triggers direct APK download
 * - Handles in-app browsers (Instagram, WhatsApp) by breaking out to Chrome
 */
export const triggerOneTapInstall = async (): Promise<{ success: boolean; type: 'prompt' | 'ios' | 'fallback' }> => {
  if (typeof window === 'undefined') return { success: false, type: 'fallback' };

  let prompt = (window as any).deferredPrompt || deferredPrompt;

  // If prompt is not ready immediately, wait briefly in case Chrome is still finalizing manifest/SW
  if (!prompt) {
    prompt = await new Promise((resolve) => {
      const timer = setTimeout(() => resolve(null), 1200);
      const onReady = () => {
        clearTimeout(timer);
        window.removeEventListener('chatr:installpromptready', onReady);
        resolve((window as any).deferredPrompt || deferredPrompt);
      };
      window.addEventListener('chatr:installpromptready', onReady, { once: true });
    });
  }

  if (prompt) {
    try {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      deferredPrompt = null;
      (window as any).deferredPrompt = null;
      return { success: outcome === 'accepted', type: 'prompt' };
    } catch (e) {
      console.warn('Install prompt error:', e);
    }
  }

  const ua = navigator.userAgent.toLowerCase();
  const isAndroid = /android/i.test(ua);
  const isApple = /iphone|ipad|ipod/.test(ua);

  // In-app browser detection (WhatsApp, Instagram, FB)
  if (isAndroid) {
    const isInApp = /fban|fbav|instagram|whatsapp/.test(ua);
    if (isInApp) {
      window.location.href = `intent://${window.location.host}${window.location.pathname}#Intent;scheme=https;package=com.android.chrome;end`;
      return { success: true, type: 'prompt' };
    }

    // Never redirect to uncommitted/404 APK URLs; return fallback so UI shows Chrome menu guide
    return { success: false, type: 'fallback' };
  }

  if (isApple) {
    return { success: false, type: 'ios' };
  }

  return { success: false, type: 'fallback' };
};

// Cache management
export const clearCache = async () => {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('✅ All caches cleared');
  }
};

// IndexedDB for offline message queue
export class OfflineMessageQueue {
  private dbName = 'chatr-db';
  private version = 1;
  private storeName = 'pendingMessages';
  
  async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }
  
  async addMessage(message: any): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(message);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async getMessages(): Promise<any[]> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  async removeMessage(id: number): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
  
  async clear(): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}
