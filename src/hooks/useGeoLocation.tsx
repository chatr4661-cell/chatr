import { useState, useEffect, useCallback } from 'react';
import { Geolocation } from '@capacitor/geolocation';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  city?: string;
  method: 'gps' | 'device' | 'ip' | 'manual';
}

interface UseGeoLocationReturn {
  location: GeoLocation | null;
  isLoading: boolean;
  error: string | null;
  requestLocation: () => Promise<void>;
  setManualLocation: (lat: number, lng: number, city?: string) => void;
}

export function useGeoLocation(): UseGeoLocationReturn {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Layer 1: HTML5 Geolocation API (High Accuracy)
  const getHTML5Location = useCallback(async (): Promise<GeoLocation | null> => {
    try {
      console.log('Attempting HTML5 geolocation...');
      
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }
        );
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        method: 'gps'
      };
    } catch (err) {
      console.error('HTML5 geolocation failed:', err);
      return null;
    }
  }, []);

  // Layer 2: Capacitor Device GPS
  const getDeviceLocation = useCallback(async (): Promise<GeoLocation | null> => {
    try {
      console.log('Attempting device GPS...');
      
      // Check permissions first
      const permission = await Geolocation.checkPermissions();
      
      if (permission.location === 'denied') {
        const requested = await Geolocation.requestPermissions();
        if (requested.location === 'denied') {
          return null;
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      });

      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        method: 'device'
      };
    } catch (err) {
      console.error('Device GPS failed:', err);
      return null;
    }
  }, []);

  // Layer 3: IP-based Geolocation (Free API)
  const getIPLocation = useCallback(async (): Promise<GeoLocation | null> => {
    try {
      console.log('Attempting IP geolocation...');
      
      // Try ipapi.co (free tier)
      const response = await fetch('https://ipapi.co/json/', {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        // Fallback to ip-api.com
        const fallbackResponse = await fetch('http://ip-api.com/json/', {
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!fallbackResponse.ok) return null;

        const fallbackData = await fallbackResponse.json();
        return {
          latitude: fallbackData.lat,
          longitude: fallbackData.lon,
          city: fallbackData.city,
          method: 'ip'
        };
      }

      const data = await response.json();
      
      console.log('IP geolocation result:', {
        latitude: data.latitude,
        longitude: data.longitude,
        city: data.city,
        region: data.region,
        country: data.country_name
      });
      
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        city: `${data.city}, ${data.region}`,
        method: 'ip'
      };
    } catch (err) {
      console.error('IP geolocation failed:', err);
      return null;
    }
  }, []);

  // 4-Layer Fallback System
  const requestLocation = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try Layer 1: HTML5 GPS
      let result = await getHTML5Location();
      
      if (!result) {
        // Try Layer 2: Device GPS
        result = await getDeviceLocation();
      }

      if (!result) {
        // Try Layer 3: IP Location
        result = await getIPLocation();
      }

      if (result) {
        setLocation(result);
        
        // Save to localStorage for caching
        const recentLocations = JSON.parse(localStorage.getItem('recent_locations') || '[]');
        recentLocations.unshift({
          ...result,
          timestamp: Date.now()
        });
        localStorage.setItem('recent_locations', JSON.stringify(recentLocations.slice(0, 5)));
      } else {
        setError('Unable to detect location. Please set manually.');
      }
    } catch (err) {
      console.error('Location detection failed:', err);
      setError('Location detection failed');
    } finally {
      setIsLoading(false);
    }
  }, [getHTML5Location, getDeviceLocation, getIPLocation]);

  // Layer 4: Manual Location
  const setManualLocation = useCallback((lat: number, lng: number, city?: string) => {
    const manualLoc: GeoLocation = {
      latitude: lat,
      longitude: lng,
      city,
      method: 'manual'
    };
    
    setLocation(manualLoc);
    setError(null);

    // Save to cache
    const recentLocations = JSON.parse(localStorage.getItem('recent_locations') || '[]');
    recentLocations.unshift({
      ...manualLoc,
      timestamp: Date.now()
    });
    localStorage.setItem('recent_locations', JSON.stringify(recentLocations.slice(0, 5)));
  }, []);

  // Auto-request location on mount
  useEffect(() => {
    // Try to load from cache first
    const cached = localStorage.getItem('recent_locations');
    if (cached) {
      const locations = JSON.parse(cached);
      if (locations.length > 0 && Date.now() - locations[0].timestamp < 300000) {
        // Use cached location if less than 5 minutes old (reduced from 1 hour)
        console.log('Using cached location:', locations[0]);
        setLocation(locations[0]);
        return;
      }
    }

    // Otherwise request fresh location
    console.log('Requesting fresh location...');
    requestLocation();
  }, [requestLocation]);

  return {
    location,
    isLoading,
    error,
    requestLocation,
    setManualLocation
  };
}
