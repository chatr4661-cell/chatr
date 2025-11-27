import { App } from '@capacitor/app';

/**
 * Deep Link Handler for Chatr+
 * Handles all incoming deep links from:
 * - chatr:// custom scheme
 * - https://chatr.chat universal links
 * - Android App Links
 */

export interface DeepLinkRoute {
  path: string;
  queryParams?: Record<string, string>;
}

/**
 * Parse deep link URL to route
 */
export const parseDeepLink = (url: string): DeepLinkRoute | null => {
  try {
    console.log('[DeepLink] Parsing URL:', url);

    // Remove scheme and host
    let path = url
      .replace(/^(chatr:\/\/|https?:\/\/(www\.)?chatr\.chat)/, '')
      .replace(/^\/+/, '/'); // Ensure starts with /

    // Extract query parameters
    const urlObj = new URL(url.includes('://') ? url : `https://chatr.chat${url}`);
    const queryParams: Record<string, string> = {};
    
    urlObj.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // Remove query string from path
    path = path.split('?')[0];

    // Default to home if empty
    if (!path || path === '/') {
      path = '/';
    }

    console.log('[DeepLink] Parsed route:', { path, queryParams });

    return {
      path,
      queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    };
  } catch (error) {
    console.error('[DeepLink] Parse error:', error);
    return null;
  }
};

/**
 * Navigate to deep link route
 */
export const navigateToDeepLink = (route: DeepLinkRoute): void => {
  let targetUrl = route.path;

  // Add query parameters
  if (route.queryParams) {
    const params = new URLSearchParams(route.queryParams);
    targetUrl += `?${params.toString()}`;
  }

  console.log('[DeepLink] Navigating to:', targetUrl);

  // Use window.location for navigation
  // React Router will handle the route
  window.location.href = targetUrl;
};

/**
 * Initialize deep link listener
 * Call this in your app initialization
 */
export const initDeepLinkListener = async (): Promise<(() => void)> => {
  console.log('[DeepLink] Initializing listener');

  const listener = await App.addListener('appUrlOpen', (event) => {
    console.log('[DeepLink] Received:', event.url);

    const route = parseDeepLink(event.url);
    
    if (route) {
      // Small delay to ensure app is ready
      setTimeout(() => {
        navigateToDeepLink(route);
      }, 100);
    }
  });

  // Return cleanup function
  return () => {
    console.log('[DeepLink] Removing listener');
    listener.remove();
  };
};

/**
 * Route mapping for validation
 */
export const VALID_ROUTES = [
  '/',
  '/auth',
  '/chat',
  '/chat/:conversationId',
  '/profile/:userId',
  '/contacts',
  '/global-contacts',
  '/call-history',
  '/smart-inbox',
  '/stories',
  '/communities',
  '/create-community',
  '/health',
  '/wellness-tracking',
  '/health-passport',
  '/lab-reports',
  '/medicine-reminders',
  '/care',
  '/booking',
  '/provider-portal',
  '/provider-register',
  '/allied-healthcare',
  '/local-healthcare',
  '/marketplace',
  '/home-services',
  '/native-apps',
  '/app-statistics',
  '/developer-portal',
  '/local-jobs',
  '/ai-agents',
  '/ai-agents/chat/:agentId',
  '/ai-assistant',
  '/ai-browser',
  '/official-accounts',
  '/tutors',
  '/points',
  '/rewards',
  '/growth',
  '/ambassador',
  '/youth',
  '/youth-feed',
  '/settings',
  '/account',
  '/privacy',
  '/notifications',
  '/notification-settings',
  '/device-management',
  '/geofences',
  '/geofence-history',
  '/qr-payment',
  '/qr-login',
  '/download',
  '/install',
  '/onboarding',
  '/emergency',
  '/emergency-services',
  '/wellness-circles',
  '/expert-sessions',
  '/admin',
  '/about',
  '/help',
  '/contact',
  '/terms',
  '/privacy-policy',
  '/refund',
  '/disclaimer',
] as const;

/**
 * Validate if route is supported
 */
export const isValidRoute = (path: string): boolean => {
  // Exact match
  if (VALID_ROUTES.includes(path as any)) {
    return true;
  }

  // Dynamic route match (e.g., /chat/123, /profile/user456)
  const dynamicMatch = VALID_ROUTES.some(route => {
    const pattern = route.replace(/:[^/]+/g, '[^/]+');
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(path);
  });

  return dynamicMatch;
};

/**
 * Example deep link URLs that work:
 * 
 * chatr://chat
 * chatr://chat/conv-123
 * chatr://profile/user-456
 * chatr://ai-agents/chat/agent-789
 * 
 * https://chatr.chat/chat
 * https://chatr.chat/chat/conv-123
 * https://chatr.chat/profile/user-456
 * https://chatr.chat/ai-browser?url=https://example.com
 * 
 * https://www.chatr.chat/health
 * https://www.chatr.chat/local-jobs
 */
