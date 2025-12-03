import { useState, useEffect } from 'react';

interface Location {
  lat: number;
  lon: number;
  city?: string;
  source: 'gps' | 'ip' | 'default';
}

export function useChatrLocation() {
  const [location, setLocation] = useState<Location | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLocation = async () => {
      // Try GPS first
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000 // 5 minutes cache
            });
          });

          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            source: 'gps'
          });
          setLoading(false);
          return;
        } catch (gpsError) {
          console.log('GPS failed, trying IP fallback:', gpsError);
        }
      }

      // Fallback to IP-based location
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        if (data.latitude && data.longitude) {
          setLocation({
            lat: data.latitude,
            lon: data.longitude,
            city: data.city,
            source: 'ip'
          });
          setLoading(false);
          return;
        }
      } catch (ipError) {
        console.log('IP geolocation failed:', ipError);
      }

      // Final fallback - default to India center (New Delhi)
      setLocation({
        lat: 28.6139,
        lon: 77.2090,
        city: 'New Delhi',
        source: 'default'
      });
      setError('Could not detect location, using default');
      setLoading(false);
    };

    fetchLocation();
  }, []);

  return { location, loading, error };
}
