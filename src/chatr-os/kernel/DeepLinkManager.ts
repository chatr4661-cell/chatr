/**
 * CHATR OS - Deep Link Manager
 * 
 * Handles deep linking between apps and external sources.
 * Supports chatr:// protocol for inter-app navigation.
 * 
 * Week 1 - Core OS Infrastructure
 */

import { appLifecycleManager } from './AppLifecycleManager';
import { interAppCommunication } from './InterAppCommunication';

export interface DeepLinkRoute {
  scheme: string; // e.g., 'chatr'
  host: string; // e.g., 'app', 'browser', 'chat'
  path: string; // e.g., '/profile/123'
  params: Record<string, string>;
}

type DeepLinkHandler = (route: DeepLinkRoute) => Promise<void>;

class DeepLinkManager {
  private handlers: Map<string, DeepLinkHandler> = new Map();
  private initialized = false;

  /**
   * Initialize the deep link manager
   */
  async initialize() {
    console.log('🔗 CHATR OS: Initializing Deep Link Manager');
    
    // Register default handlers
    this.registerHandler('app', this.handleAppLink.bind(this));
    this.registerHandler('chat', this.handleChatLink.bind(this));
    this.registerHandler('browser', this.handleBrowserLink.bind(this));
    this.registerHandler('profile', this.handleProfileLink.bind(this));
    
    // Listen for URL changes in web
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', this.handleHashChange.bind(this));
    }
    
    this.initialized = true;
    console.log('✅ Deep Link Manager ready');
  }

  /**
   * Register a custom deep link handler
   */
  registerHandler(host: string, handler: DeepLinkHandler) {
    this.handlers.set(host, handler);
    console.log(`📝 Registered deep link handler: ${host}`);
  }

  /**
   * Parse a deep link URL
   */
  parseDeepLink(url: string): DeepLinkRoute | null {
    try {
      // Support both chatr:// and chatr:
      const cleanUrl = url.replace('chatr://', 'chatr:');
      const urlObj = new URL(cleanUrl);
      
      const params: Record<string, string> = {};
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      return {
        scheme: urlObj.protocol.replace(':', ''),
        host: urlObj.hostname || urlObj.pathname.split('/')[0],
        path: urlObj.pathname,
        params,
      };
    } catch (error) {
      console.error('Failed to parse deep link:', error);
      return null;
    }
  }

  /**
   * Navigate to a deep link
   */
  async navigate(url: string): Promise<boolean> {
    const route = this.parseDeepLink(url);
    if (!route) return false;

    const handler = this.handlers.get(route.host);
    if (!handler) {
      console.warn(`No handler registered for: ${route.host}`);
      return false;
    }

    try {
      await handler(route);
      console.log(`✅ Navigated to: ${url}`);
      return true;
    } catch (error) {
      console.error('Deep link navigation failed:', error);
      return false;
    }
  }

  /**
   * Generate a deep link URL
   */
  createLink(host: string, path?: string, params?: Record<string, string>): string {
    let url = `chatr://${host}`;
    if (path) url += path;
    
    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }
    
    return url;
  }

  /**
   * Handle app deep links (chatr://app/package-name)
   */
  private async handleAppLink(route: DeepLinkRoute) {
    const packageName = route.path.replace('/', '');
    
    if (!packageName) {
      throw new Error('Package name is required for app links');
    }

    // Check if app is installed
    const app = appLifecycleManager.getApp(packageName);
    if (!app) {
      console.error(`App not found: ${packageName}`);
      // Could redirect to app store here
      return;
    }

    // Launch the app
    await appLifecycleManager.launchApp(packageName);

    // Send intent data if provided
    if (Object.keys(route.params).length > 0) {
      await interAppCommunication.sendMessage(
        packageName,
        'intent',
        JSON.stringify(route.params)
      );
    }
  }

  /**
   * Handle chat deep links (chatr://chat/conversation-id)
   */
  private async handleChatLink(route: DeepLinkRoute) {
    const conversationId = route.path.replace('/', '');
    
    // Navigate to chat
    if (typeof window !== 'undefined') {
      window.location.href = `/chat/${conversationId}`;
    }
  }

  /**
   * Handle browser deep links (chatr://browser/url)
   */
  private async handleBrowserLink(route: DeepLinkRoute) {
    const urlToOpen = route.params.url || decodeURIComponent(route.path.replace('/', ''));
    
    // Navigate to browser
    if (typeof window !== 'undefined') {
      window.location.href = `/browser?url=${encodeURIComponent(urlToOpen)}`;
    }
  }

  /**
   * Handle profile deep links (chatr://profile/user-id)
   */
  private async handleProfileLink(route: DeepLinkRoute) {
    const userId = route.path.replace('/', '');
    
    // Navigate to profile
    if (typeof window !== 'undefined') {
      window.location.href = `/profile/${userId}`;
    }
  }

  /**
   * Handle hash changes (for web navigation)
   */
  private handleHashChange() {
    const hash = window.location.hash.substring(1);
    if (hash.startsWith('chatr://')) {
      this.navigate(hash);
    }
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('hashchange', this.handleHashChange.bind(this));
    }
    this.handlers.clear();
    console.log('🧹 Deep Link Manager destroyed');
  }
}

// Singleton instance
export const deepLinkManager = new DeepLinkManager();
