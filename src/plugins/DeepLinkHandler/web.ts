import { WebPlugin } from '@capacitor/core';
import type { DeepLinkHandlerPlugin } from './index';

export class DeepLinkHandlerWeb extends WebPlugin implements DeepLinkHandlerPlugin {
  async getPendingDeepLink(): Promise<{ url?: string }> {
    // Web version uses hash or query params
    const hash = window.location.hash.substring(1);
    if (hash.startsWith('chatr://')) {
      return { url: hash };
    }
    
    const params = new URLSearchParams(window.location.search);
    const deepLink = params.get('deeplink');
    if (deepLink) {
      return { url: deepLink };
    }
    
    return {};
  }

  async registerDeepLinkScheme(): Promise<void> {
    // Not needed for web
    console.log('Deep link scheme registration not needed for web');
  }
}
