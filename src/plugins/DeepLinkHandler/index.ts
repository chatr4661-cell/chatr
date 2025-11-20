import { registerPlugin } from '@capacitor/core';

export interface DeepLinkHandlerPlugin {
  /**
   * Get any pending deep link from app launch
   */
  getPendingDeepLink(): Promise<{ url?: string }>;

  /**
   * Register a deep link scheme (handled automatically on Android via manifest)
   */
  registerDeepLinkScheme(options: { scheme: string }): Promise<void>;

  /**
   * Listen for deep links
   */
  addListener(
    eventName: 'deepLinkReceived',
    listenerFunc: (data: { url: string }) => void
  ): Promise<any>;
}

const DeepLinkHandler = registerPlugin<DeepLinkHandlerPlugin>('DeepLinkHandler', {
  web: () => import('./web').then(m => new m.DeepLinkHandlerWeb()),
});

export default DeepLinkHandler;
