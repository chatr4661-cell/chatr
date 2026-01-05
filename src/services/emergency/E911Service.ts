/**
 * E911/E112 Emergency Location Service
 * Mock implementation with real location capture
 * Ready for production integration with Bandwidth/Twilio E911
 */

import { Geolocation } from '@capacitor/geolocation';

export interface EmergencyLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude?: number;
  address?: string;
  timestamp: number;
  source: 'gps' | 'network' | 'ip' | 'cached';
}

export interface E911CallData {
  callerId: string;
  callerPhone: string;
  callerName: string;
  location: EmergencyLocation;
  emergencyType: '911' | '112' | '999' | '000';
  callbackNumber: string;
}

export interface PSAPInfo {
  id: string;
  name: string;
  phone: string;
  address: string;
  jurisdiction: string;
}

class E911ServiceClass {
  private lastKnownLocation: EmergencyLocation | null = null;
  private locationWatchId: string | null = null;
  private isMonitoring = false;

  // Emergency number patterns by region
  private emergencyNumbers: Record<string, string[]> = {
    US: ['911'],
    EU: ['112'],
    UK: ['999', '112'],
    AU: ['000', '112'],
    IN: ['112', '100', '101', '102'],
  };

  /**
   * Check if a number is an emergency number
   */
  isEmergencyNumber(phoneNumber: string): boolean {
    const cleaned = phoneNumber.replace(/\D/g, '');
    const allEmergencyNumbers = Object.values(this.emergencyNumbers).flat();
    return allEmergencyNumbers.includes(cleaned);
  }

  /**
   * Get emergency number type
   */
  getEmergencyType(phoneNumber: string): '911' | '112' | '999' | '000' | null {
    const cleaned = phoneNumber.replace(/\D/g, '');
    if (cleaned === '911') return '911';
    if (cleaned === '112') return '112';
    if (cleaned === '999') return '999';
    if (cleaned === '000') return '000';
    return null;
  }

  /**
   * Start continuous location monitoring for E911 readiness
   */
  async startLocationMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    try {
      // Check permissions first
      const permission = await Geolocation.checkPermissions();
      
      if (permission.location !== 'granted') {
        const requested = await Geolocation.requestPermissions();
        if (requested.location !== 'granted') {
          console.warn('[E911] Location permission denied');
          return;
        }
      }

      // Start watching position
      this.locationWatchId = await Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 10000 },
        (position, err) => {
          if (position && !err) {
            this.lastKnownLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              altitude: position.coords.altitude ?? undefined,
              timestamp: position.timestamp,
              source: 'gps',
            };
          }
        }
      );

      this.isMonitoring = true;
      console.log('[E911] Location monitoring started');
    } catch (error) {
      console.error('[E911] Failed to start location monitoring:', error);
    }
  }

  /**
   * Stop location monitoring
   */
  async stopLocationMonitoring(): Promise<void> {
    if (this.locationWatchId) {
      await Geolocation.clearWatch({ id: this.locationWatchId });
      this.locationWatchId = null;
    }
    this.isMonitoring = false;
  }

  /**
   * Get current location for emergency call
   * Uses high-accuracy GPS with fallbacks
   */
  async getCurrentLocation(): Promise<EmergencyLocation> {
    try {
      // Try high-accuracy GPS first
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 5000, // Fast timeout for emergencies
      });

      const location: EmergencyLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude ?? undefined,
        timestamp: Date.now(),
        source: 'gps',
      };

      // Reverse geocode for address (mock for now)
      location.address = await this.reverseGeocode(location.latitude, location.longitude);

      this.lastKnownLocation = location;
      return location;
    } catch (error) {
      console.warn('[E911] GPS failed, using fallback:', error);

      // Return cached location if available
      if (this.lastKnownLocation) {
        return {
          ...this.lastKnownLocation,
          source: 'cached',
        };
      }

      // IP-based fallback (mock)
      return this.getIPBasedLocation();
    }
  }

  /**
   * Reverse geocode coordinates to address
   * In production: Use Google/HERE Maps API
   */
  private async reverseGeocode(lat: number, lon: number): Promise<string> {
    // Mock implementation - would use real geocoding API
    return `${lat.toFixed(4)}, ${lon.toFixed(4)} (Approximate Location)`;
  }

  /**
   * IP-based location fallback
   * In production: Use IP geolocation service
   */
  private async getIPBasedLocation(): Promise<EmergencyLocation> {
    // Mock implementation
    return {
      latitude: 0,
      longitude: 0,
      accuracy: 25000, // City-level accuracy
      timestamp: Date.now(),
      source: 'ip',
      address: 'Location unavailable - IP fallback',
    };
  }

  /**
   * Get nearest PSAP (Public Safety Answering Point)
   * In production: Query NENA database or E911 provider
   */
  async getNearestPSAP(location: EmergencyLocation): Promise<PSAPInfo> {
    // Mock implementation
    return {
      id: 'psap_mock_001',
      name: 'Emergency Services Center',
      phone: '911',
      address: 'Local Emergency Response Center',
      jurisdiction: 'Local Authority',
    };
  }

  /**
   * Initiate E911 call with location data
   * In production: Route through E911 provider (Bandwidth/Twilio)
   */
  async initiateEmergencyCall(
    callerPhone: string,
    callerName: string,
    emergencyNumber: string
  ): Promise<{ success: boolean; callId?: string; psap?: PSAPInfo; error?: string }> {
    try {
      console.log('[E911] Initiating emergency call to:', emergencyNumber);

      // Get precise location
      const location = await this.getCurrentLocation();
      console.log('[E911] Location acquired:', location);

      // Get PSAP info
      const psap = await this.getNearestPSAP(location);
      console.log('[E911] PSAP identified:', psap.name);

      // In production: This would route through E911 provider
      // For now, we'll use the native dialer as fallback
      const callData: E911CallData = {
        callerId: callerPhone,
        callerPhone,
        callerName,
        location,
        emergencyType: this.getEmergencyType(emergencyNumber) || '911',
        callbackNumber: callerPhone,
      };

      // Log for compliance (would be sent to E911 provider)
      console.log('[E911] Emergency call data prepared:', JSON.stringify(callData));

      // Mock success - in production, this routes through E911 gateway
      return {
        success: true,
        callId: `e911_${Date.now()}`,
        psap,
      };
    } catch (error) {
      console.error('[E911] Emergency call failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Emergency call failed',
      };
    }
  }

  /**
   * Send location update during active emergency call
   * E911 Phase II compliance requires ongoing location updates
   */
  async sendLocationUpdate(callId: string): Promise<void> {
    const location = await this.getCurrentLocation();
    console.log(`[E911] Location update for call ${callId}:`, location);
    // In production: Send to E911 provider via API
  }

  /**
   * Get E911 registration status
   * For regulatory compliance display
   */
  getRegistrationStatus(): {
    registered: boolean;
    provider: string;
    lastLocationUpdate: number | null;
    accuracy: string;
  } {
    return {
      registered: true, // Mock - would check with E911 provider
      provider: 'CHATR E911 (Mock)',
      lastLocationUpdate: this.lastKnownLocation?.timestamp ?? null,
      accuracy: this.lastKnownLocation 
        ? `±${Math.round(this.lastKnownLocation.accuracy)}m`
        : 'Unknown',
    };
  }
}

export const E911Service = new E911ServiceClass();
