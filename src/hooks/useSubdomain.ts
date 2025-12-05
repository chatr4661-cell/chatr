import { useMemo } from 'react';

export const useSubdomain = () => {
  const subdomain = useMemo(() => {
    const hostname = window.location.hostname;
    
    // Check for web.chatr.chat subdomain
    if (hostname === 'web.chatr.chat') {
      return 'web';
    }
    
    // Check for local development with subdomain simulation
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      const params = new URLSearchParams(window.location.search);
      if (params.get('subdomain') === 'web') {
        return 'web';
      }
    }
    
    // Check for any subdomain pattern
    const parts = hostname.split('.');
    if (parts.length > 2 && parts[0] === 'web') {
      return 'web';
    }
    
    return null;
  }, []);

  const isWebSubdomain = subdomain === 'web';

  return { subdomain, isWebSubdomain };
};
