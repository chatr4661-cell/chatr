import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  getCurrentLocation, 
  getIPLocation, 
  reverseGeocode,
  LocationData,
  IPLocationData 
} from '@/utils/locationService';

interface LocationStatus {
  city: string;
  country: string;
  countryCode: string;
  ip: string;
  latitude?: number;
  longitude?: number;
  isLoading: boolean;
  error: string | null;
}

export function useLocationStatus(userId: string | undefined) {
  const [status, setStatus] = useState<LocationStatus>({
    city: '',
    country: '',
    countryCode: '',
    ip: '',
    isLoading: false,
    error: null
  });

  const [isEnabled, setIsEnabled] = useState(true);
  const [precision, setPrecision] = useState<'exact' | 'city' | 'off'>('city');

  // Load user's location preferences
  useEffect(() => {
    if (!userId) return;

    const loadPreferences = async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('location_sharing_enabled, location_precision')
        .eq('id', userId)
        .single();

      if (profile) {
        setIsEnabled(profile.location_sharing_enabled ?? true);
        setPrecision((profile.location_precision as 'exact' | 'city' | 'off') || 'city');
      }
    };

    loadPreferences();
  }, [userId]);

  // Update location periodically
  useEffect(() => {
    if (!userId || !isEnabled || precision === 'off') return;

    const updateLocation = async () => {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        let locationData: LocationData | null = null;
        let ipData: IPLocationData | null = null;

        // Try GPS first
        const gpsCoords = await getCurrentLocation();
        
        if (gpsCoords) {
          locationData = await reverseGeocode(gpsCoords.latitude, gpsCoords.longitude);
        }

        // Get IP location as fallback or additional data
        ipData = await getIPLocation();

        // Prepare update data
        const updateData: any = {
          location_updated_at: new Date().toISOString()
        };

        if (locationData) {
          updateData.location_latitude = locationData.latitude;
          updateData.location_longitude = locationData.longitude;
          updateData.location_city = locationData.city;
          updateData.location_country = locationData.country;
        } else if (ipData) {
          updateData.location_city = ipData.city;
          updateData.location_country = ipData.country;
        }

        if (ipData) {
          updateData.location_ip = ipData.ip;
        }

        // Update database
        const { error: updateError } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', userId);

        if (updateError) {
          console.error('Error updating location:', updateError);
          setStatus(prev => ({ 
            ...prev, 
            isLoading: false, 
            error: 'Failed to update location' 
          }));
          return;
        }

        // Update local state
        setStatus({
          city: locationData?.city || ipData?.city || '',
          country: locationData?.country || ipData?.country || '',
          countryCode: locationData?.countryCode || ipData?.countryCode || '',
          ip: ipData?.ip || '',
          latitude: locationData?.latitude,
          longitude: locationData?.longitude,
          isLoading: false,
          error: null
        });

        console.log('Location updated successfully:', updateData);
      } catch (error) {
        console.error('Location update failed:', error);
        setStatus(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }));
      }
    };

    // Initial update
    updateLocation();

    // Update every 5 minutes
    const interval = setInterval(updateLocation, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [userId, isEnabled, precision]);

  const updatePreferences = async (enabled: boolean, prec: 'exact' | 'city' | 'off') => {
    if (!userId) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        location_sharing_enabled: enabled,
        location_precision: prec
      })
      .eq('id', userId);

    if (!error) {
      setIsEnabled(enabled);
      setPrecision(prec);
    }
  };

  return {
    status,
    isEnabled,
    precision,
    updatePreferences
  };
}