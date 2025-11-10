import { useEffect, useState, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { supabase } from '@/integrations/supabase/client';
import { LocalNotifications } from '@capacitor/local-notifications';
import { toast } from 'sonner';

interface Geofence {
  id: string;
  name: string;
  type: string;
  center_lat: number;
  center_lng: number;
  radius_meters: number;
  trigger_on_enter: boolean;
  trigger_on_exit: boolean;
  notification_title: string | null;
  notification_body: string | null;
}

interface UserLocation {
  lat: number;
  lng: number;
}

/**
 * Geofencing hook - monitors user location and triggers notifications
 * when entering or exiting geofence zones
 */
export const useGeofencing = (userId?: string) => {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [activeZones, setActiveZones] = useState<Set<string>>(new Set());
  const [isMonitoring, setIsMonitoring] = useState(false);
  const watchIdRef = useRef<string | null>(null);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Check if location is inside geofence
  const isInsideGeofence = (
    userLoc: UserLocation,
    geofence: Geofence
  ): boolean => {
    const distance = calculateDistance(
      userLoc.lat,
      userLoc.lng,
      geofence.center_lat,
      geofence.center_lng
    );
    return distance <= geofence.radius_meters;
  };

  // Trigger notification
  const triggerNotification = async (
    geofence: Geofence,
    eventType: 'enter' | 'exit'
  ) => {
    if (!userId) return;

    const title =
      geofence.notification_title ||
      `${eventType === 'enter' ? 'Entered' : 'Left'} ${geofence.name}`;
    const body =
      geofence.notification_body ||
      `You have ${eventType === 'enter' ? 'entered' : 'left'} the ${geofence.type} zone`;

    try {
      // Request notification permissions if needed
      const permission = await LocalNotifications.requestPermissions();
      
      if (permission.display === 'granted') {
        await LocalNotifications.schedule({
          notifications: [
            {
              title,
              body,
              id: Math.floor(Math.random() * 100000),
              schedule: { at: new Date(Date.now() + 100) },
              sound: 'default',
              smallIcon: 'ic_stat_icon_config_sample',
              iconColor: '#FF6B6B',
            },
          ],
        });
      }

      // Also show toast for web
      if (!Capacitor.isNativePlatform()) {
        toast.info(title, { description: body });
      }

      console.log(`🔔 Geofence ${eventType}: ${geofence.name}`);
    } catch (error) {
      console.error('Failed to trigger notification:', error);
    }
  };

  // Log geofence event
  const logGeofenceEvent = async (
    geofence: Geofence,
    eventType: 'enter' | 'exit',
    location: UserLocation
  ) => {
    if (!userId) return;

    try {
      await supabase.from('geofence_events').insert({
        geofence_id: geofence.id,
        user_id: userId,
        event_type: eventType,
        lat: location.lat,
        lng: location.lng,
      });
    } catch (error) {
      console.error('Failed to log geofence event:', error);
    }
  };

  // Check geofences against current location
  const checkGeofences = useCallback(
    async (location: UserLocation) => {
      if (!userId || geofences.length === 0) return;

      const newActiveZones = new Set<string>();

      for (const geofence of geofences) {
        const inside = isInsideGeofence(location, geofence);
        const wasInside = activeZones.has(geofence.id);

        if (inside) {
          newActiveZones.add(geofence.id);

          // Trigger enter event
          if (!wasInside && geofence.trigger_on_enter) {
            await triggerNotification(geofence, 'enter');
            await logGeofenceEvent(geofence, 'enter', location);
          }
        } else if (wasInside && geofence.trigger_on_exit) {
          // Trigger exit event
          await triggerNotification(geofence, 'exit');
          await logGeofenceEvent(geofence, 'exit', location);
        }
      }

      setActiveZones(newActiveZones);
    },
    [geofences, activeZones, userId]
  );

  // Fetch geofences from database
  const fetchGeofences = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('geofences')
        .select('*')
        .eq('active', true);

      if (error) throw error;

      setGeofences(data || []);
      console.log(`📍 Loaded ${data?.length || 0} active geofences`);
    } catch (error) {
      console.error('Failed to fetch geofences:', error);
    }
  }, []);

  // Start monitoring location
  const startMonitoring = useCallback(async () => {
    if (!userId || isMonitoring || !Capacitor.isNativePlatform()) return;

    try {
      // Request location permissions
      const permission = await Geolocation.requestPermissions();
      if (permission.location !== 'granted') {
        toast.error('Location permission required for geofencing');
        return;
      }

      // Watch position
      watchIdRef.current = await Geolocation.watchPosition(
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 },
        (position, err) => {
          if (err) {
            console.error('Geolocation error:', err);
            return;
          }

          if (position) {
            const location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            checkGeofences(location);
          }
        }
      );

      setIsMonitoring(true);
      console.log('✅ Geofencing monitoring started');
    } catch (error) {
      console.error('Failed to start geofencing:', error);
    }
  }, [userId, isMonitoring, checkGeofences]);

  // Stop monitoring
  const stopMonitoring = useCallback(async () => {
    if (watchIdRef.current) {
      await Geolocation.clearWatch({ id: watchIdRef.current });
      watchIdRef.current = null;
      setIsMonitoring(false);
      console.log('🛑 Geofencing monitoring stopped');
    }
  }, []);

  // Initialize
  useEffect(() => {
    if (userId) {
      fetchGeofences();
    }
  }, [userId, fetchGeofences]);

  // Start monitoring when geofences are loaded
  useEffect(() => {
    if (geofences.length > 0 && userId && !isMonitoring) {
      startMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [geofences.length, userId, isMonitoring, startMonitoring, stopMonitoring]);

  // Subscribe to geofence changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('geofences-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'geofences',
        },
        () => {
          console.log('🔄 Geofences updated, refreshing...');
          fetchGeofences();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchGeofences]);

  return {
    geofences,
    activeZones: Array.from(activeZones),
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    refetchGeofences: fetchGeofences,
  };
};
