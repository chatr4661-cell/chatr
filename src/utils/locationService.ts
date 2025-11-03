import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  countryCode?: string;
}

export interface IPLocationData {
  ip: string;
  city: string;
  country: string;
  countryCode: string;
}

/**
 * Get current GPS coordinates using Capacitor Geolocation
 */
export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    // Check if running on native platform
    if (!Capacitor.isNativePlatform()) {
      console.log('Geolocation: Not on native platform, skipping GPS');
      return null;
    }

    // Request permissions
    const permission = await Geolocation.requestPermissions();
    if (permission.location !== 'granted') {
      console.log('Geolocation permission denied');
      return null;
    }

    // Get current position with high accuracy
    const position = await Geolocation.getCurrentPosition({ 
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    });

    const { latitude, longitude } = position.coords;
    console.log('GPS Location obtained:', { latitude, longitude });
    
    return { latitude, longitude };
  } catch (error) {
    console.error('Error getting GPS location:', error);
    return null;
  }
}

/**
 * Reverse geocode coordinates to city/country using Nominatim (free, no API key)
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<LocationData> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'Chatr.Chat/1.0'
        }
      }
    );

    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }

    const data = await response.json();
    const address = data.address || {};

    return {
      latitude,
      longitude,
      city: address.city || address.town || address.village || address.suburb || 'Unknown',
      country: address.country || 'Unknown',
      countryCode: address.country_code?.toUpperCase() || ''
    };
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return {
      latitude,
      longitude,
      city: 'Unknown',
      country: 'Unknown'
    };
  }
}

/**
 * Get IP-based location (fallback when GPS is unavailable)
 */
export async function getIPLocation(): Promise<IPLocationData | null> {
  try {
    const response = await fetch('https://ipapi.co/json/');
    
    if (!response.ok) {
      throw new Error('IP location API failed');
    }

    const data = await response.json();
    
    return {
      ip: data.ip || 'Unknown',
      city: data.city || 'Unknown',
      country: data.country_name || 'Unknown',
      countryCode: data.country_code || ''
    };
  } catch (error) {
    console.error('IP location error:', error);
    return null;
  }
}

/**
 * Get complete location data (tries GPS first, falls back to IP)
 */
export async function getCompleteLocation(): Promise<LocationData | null> {
  // Try GPS first
  const gpsCoords = await getCurrentLocation();
  
  if (gpsCoords) {
    const locationData = await reverseGeocode(gpsCoords.latitude, gpsCoords.longitude);
    console.log('Complete GPS location:', locationData);
    return locationData;
  }

  // Fallback to IP-based location
  const ipLocation = await getIPLocation();
  
  if (ipLocation) {
    console.log('Fallback to IP location:', ipLocation);
    return {
      latitude: 0,
      longitude: 0,
      city: ipLocation.city,
      country: ipLocation.country,
      countryCode: ipLocation.countryCode
    };
  }

  return null;
}

/**
 * Format location string for display
 */
export function formatLocationString(
  city?: string, 
  country?: string, 
  precision: 'exact' | 'city' | 'off' = 'city'
): string {
  if (precision === 'off' || (!city && !country)) {
    return '';
  }

  if (precision === 'city') {
    return city && country ? `${city}, ${country}` : city || country || '';
  }

  // For 'exact', we would show more details (currently same as city)
  return city && country ? `${city}, ${country}` : city || country || '';
}

/**
 * Get time since last seen
 */
export function getLastSeenText(lastSeenAt?: string): string {
  if (!lastSeenAt) return 'Last seen recently';

  const now = new Date();
  const lastSeen = new Date(lastSeenAt);
  const diffMs = now.getTime() - lastSeen.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Active now';
  if (diffMins < 60) return `Active ${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `Active ${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `Active ${diffDays}d ago`;
}