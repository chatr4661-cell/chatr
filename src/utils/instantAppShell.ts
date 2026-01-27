/**
 * INSTANT APP SHELL - Sub-100ms perceived loading
 * Critical for achieving 10x faster loading in web and hybrid app
 */

// Preload critical resources before React mounts
export const preloadCriticalResources = () => {
  // Preconnect to critical origins
  const origins = [
    'https://sbayuqgomlflmxgicplz.supabase.co',
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ];

  origins.forEach(origin => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};

// Prefetch likely next pages based on current route
export const prefetchNextRoutes = (currentPath: string) => {
  const routeMap: Record<string, string[]> = {
    '/': ['/chat', '/auth', '/home'],
    '/auth': ['/home', '/chat', '/onboarding'],
    '/home': ['/chat', '/calls', '/profile', '/health', '/dhandha'],
    '/chat': ['/calls', '/profile', '/contacts'],
    '/calls': ['/chat', '/contacts'],
  };

  const nextRoutes = routeMap[currentPath] || [];
  
  // Use requestIdleCallback for non-blocking prefetch
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      nextRoutes.forEach(route => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = route;
        document.head.appendChild(link);
      });
    }, { timeout: 2000 });
  }
};

// Resource priority hints for faster loading
export const setResourcePriorities = () => {
  // Mark critical resources with fetchpriority
  const criticalScripts = document.querySelectorAll('script[type="module"]');
  criticalScripts.forEach(script => {
    script.setAttribute('fetchpriority', 'high');
  });
  
  // Defer non-critical images
  const images = document.querySelectorAll('img:not([loading])');
  images.forEach(img => {
    if (!img.hasAttribute('fetchpriority')) {
      img.setAttribute('loading', 'lazy');
      img.setAttribute('decoding', 'async');
    }
  });
};

// Initialize instant app shell optimizations
export const initInstantAppShell = () => {
  // Run critical optimizations immediately
  preloadCriticalResources();
  setResourcePriorities();
  
  // Set up route-based prefetching after initial load
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      prefetchNextRoutes(window.location.pathname);
    });
  }
};

// Export for use in index.html inline script
if (typeof window !== 'undefined') {
  (window as any).__initInstantAppShell = initInstantAppShell;
}
