/**
 * HYBRID APP OPTIMIZATIONS
 * Specifically designed for WebView/native shell performance
 */

// Detect if running in native WebView
export const isNativeWebView = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    userAgent.includes('chatr') ||
    userAgent.includes('wv') ||
    (window as any).ChatrNative !== undefined ||
    document.documentElement.classList.contains('native-app')
  );
};

// Optimize for WebView rendering
export const optimizeForWebView = () => {
  if (!isNativeWebView()) return;

  // Disable hover effects on touch devices (reduces paint)
  const style = document.createElement('style');
  style.id = 'webview-optimizations';
  style.textContent = `
    /* Disable hover states in WebView */
    @media (hover: none) {
      *:hover {
        background-color: inherit !important;
      }
    }
    
    /* GPU acceleration for smooth scrolling */
    .scroll-container,
    [data-scroll],
    main,
    .page-content {
      transform: translateZ(0);
      -webkit-transform: translateZ(0);
      backface-visibility: hidden;
      -webkit-backface-visibility: hidden;
    }
    
    /* Reduce animation complexity */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.01ms !important;
      }
    }
    
    /* Optimize touch targets */
    button, a, [role="button"] {
      min-height: 44px;
      min-width: 44px;
    }
    
    /* Eliminate tap delay */
    * {
      touch-action: manipulation;
    }
  `;
  document.head.appendChild(style);

  // Notify native shell that web is ready
  if ((window as any).ChatrNative?.onWebReady) {
    (window as any).ChatrNative.onWebReady();
  }
};

// Pre-render critical DOM for instant display
export const prerenderCriticalDOM = () => {
  // Add skeleton immediately before React hydrates
  const root = document.getElementById('root');
  if (root && !root.hasChildNodes()) {
    root.innerHTML = `
      <div class="instant-skeleton" style="
        min-height: 100vh;
        background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%);
        display: flex;
        flex-direction: column;
      ">
        <!-- Header skeleton -->
        <div style="
          height: 56px;
          background: #fff;
          border-bottom: 1px solid #eee;
          display: flex;
          align-items: center;
          padding: 0 16px;
        ">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>
          <div style="flex: 1; margin-left: 12px;">
            <div style="width: 120px; height: 14px; border-radius: 7px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>
          </div>
        </div>
        
        <!-- Content skeleton -->
        <div style="flex: 1; padding: 16px;">
          ${Array(5).fill(0).map(() => `
            <div style="
              display: flex;
              align-items: center;
              padding: 12px 0;
              border-bottom: 1px solid #f5f5f5;
            ">
              <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>
              <div style="flex: 1; margin-left: 12px;">
                <div style="width: 60%; height: 12px; border-radius: 6px; margin-bottom: 8px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>
                <div style="width: 40%; height: 10px; border-radius: 5px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite;"></div>
              </div>
            </div>
          `).join('')}
        </div>
        
        <!-- Bottom nav skeleton -->
        <div style="
          height: 64px;
          background: #fff;
          border-top: 1px solid #eee;
          display: flex;
          justify-content: space-around;
          align-items: center;
          padding: 0 16px;
        ">
          ${Array(4).fill(0).map(() => `
            <div style="
              width: 24px;
              height: 24px;
              border-radius: 8px;
              background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
              background-size: 200% 100%;
              animation: shimmer 1.5s infinite;
            "></div>
          `).join('')}
        </div>
      </div>
      <style>
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      </style>
    `;
  }
};

// Bridge for native app communication
export const setupNativeBridge = () => {
  // Expose methods for native shell
  (window as any).ChatrWeb = {
    // Called by native to navigate
    navigate: (path: string) => {
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    },
    
    // Called by native to inject auth token
    setAuthToken: (token: string) => {
      localStorage.setItem('sb-auth-token', token);
      window.dispatchEvent(new CustomEvent('auth-token-updated'));
    },
    
    // Called by native to get current state
    getState: () => ({
      path: window.location.pathname,
      isAuthenticated: !!localStorage.getItem('sb-sbayuqgomlflmxgicplz-auth-token'),
    }),
    
    // Performance metrics for native monitoring
    getMetrics: () => {
      const timing = performance.timing;
      return {
        domReady: timing.domContentLoadedEventEnd - timing.navigationStart,
        loadComplete: timing.loadEventEnd - timing.navigationStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0,
      };
    },
  };
};

// Initialize all hybrid optimizations
export const initHybridOptimizations = () => {
  // Pre-render skeleton immediately
  prerenderCriticalDOM();
  
  // Setup native bridge
  setupNativeBridge();
  
  // Apply WebView optimizations after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', optimizeForWebView);
  } else {
    optimizeForWebView();
  }
};

// Auto-initialize
initHybridOptimizations();
