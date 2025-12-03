import { useState, useEffect } from 'react';

interface Location {
  lat: number;
  lon: number;
}

interface UseUserLocationReturn {
  location: Location | null;
  city: string | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => Promise<void>;
}

export const useUserLocation = (): UseUserLocationReturn => {
  const [location, setLocation] = useState<Location | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported');
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        });
      });

      const { latitude, longitude } = position.coords;
      setLocation({ lat: latitude, lon: longitude });

      // Try to get city name via reverse geocoding
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
        );
        const data = await response.json();
        const cityName = data.address?.city || data.address?.town || data.address?.village || data.address?.state;
        setCity(cityName || 'Unknown');
      } catch {
        setCity('Unknown');
      }
    } catch (err) {
      // Fallback to IP-based location
      try {
        const response = await fetch('http://ip-api.com/json/');
        const data = await response.json();
        if (data.status === 'success') {
          setLocation({ lat: data.lat, lon: data.lon });
          setCity(data.city || 'Unknown');
        }
      } catch {
        setError('Could not detect location');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-detect location on mount
    requestLocation();
  }, []);

  return { location, city, loading, error, requestLocation };
};
