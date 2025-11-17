/**
 * CRITICAL: Performance optimizations for native Android feel
 */

// Preload critical assets
export const preloadCriticalAssets = () => {
  // Preload common icons and images
  const criticalImages = [
    '/chatr-logo.png',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
  ];

  criticalImages.forEach(src => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = src;
    document.head.appendChild(link);
  });
};

// Enable hardware acceleration for smooth animations
export const enableHardwareAcceleration = () => {
  const style = document.createElement('style');
  style.textContent = `
    * {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Hardware acceleration for common animated elements */
    .animate-in,
    .animate-out,
    [data-state="open"],
    [data-state="closed"],
    .transition-all,
    .transition-transform,
    .transition-opacity {
      will-change: transform, opacity;
      transform: translateZ(0);
      backface-visibility: hidden;
      perspective: 1000px;
    }
    
    /* Smooth scrolling */
    * {
      -webkit-overflow-scrolling: touch;
      scroll-behavior: smooth;
    }
    
    /* Better text rendering */
    body {
      text-rendering: optimizeLegibility;
      -webkit-text-size-adjust: 100%;
    }
  `;
  document.head.appendChild(style);
};

// Optimize images for faster loading
export const optimizeImages = () => {
  // Add loading="lazy" to all images
  const images = document.querySelectorAll('img:not([loading])');
  images.forEach(img => {
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
  });
};

// Reduce bundle size with code splitting
export const lazyLoadHeavyComponents = () => {
  // Helper for lazy loading - returns dynamic import functions
  return {
    AIAssistant: () => import('@/pages/AIAssistant'),
    MiniAppsStore: () => import('@/pages/MiniAppsStore'),
    ChatrWorld: () => import('@/pages/ChatrWorld'),
    LocalHealthcare: () => import('@/pages/LocalHealthcare'),
    LocalJobs: () => import('@/pages/LocalJobs'),
    Communities: () => import('@/pages/Communities')
  };
};

// Initialize all performance optimizations
export const initPerformanceOptimizations = () => {
  console.log('🚀 [Performance] Initializing optimizations...');
  
  // Run immediately
  preloadCriticalAssets();
  enableHardwareAcceleration();
  
  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', optimizeImages);
  } else {
    optimizeImages();
  }
  
  console.log('✅ [Performance] Optimizations complete');
};
