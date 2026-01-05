/**
 * Emergency Call Hook
 * Handles E911/E112 calls with location data
 */

import { useState, useCallback, useEffect } from 'react';
import { E911Service, EmergencyLocation, PSAPInfo } from '@/services/emergency/E911Service';
import { useToast } from '@/hooks/use-toast';

interface EmergencyCallState {
  isEmergencyCall: boolean;
  location: EmergencyLocation | null;
  psap: PSAPInfo | null;
  callId: string | null;
  isLocating: boolean;
  error: string | null;
}

export function useEmergencyCall() {
  const { toast } = useToast();
  const [state, setState] = useState<EmergencyCallState>({
    isEmergencyCall: false,
    location: null,
    psap: null,
    callId: null,
    isLocating: false,
    error: null,
  });

  // Start location monitoring on mount
  useEffect(() => {
    E911Service.startLocationMonitoring();
    return () => {
      E911Service.stopLocationMonitoring();
    };
  }, []);

  /**
   * Check if number is emergency
   */
  const isEmergencyNumber = useCallback((phoneNumber: string): boolean => {
    return E911Service.isEmergencyNumber(phoneNumber);
  }, []);

  /**
   * Initiate emergency call
   */
  const initiateEmergencyCall = useCallback(async (
    phoneNumber: string,
    callerPhone: string,
    callerName: string
  ) => {
    if (!E911Service.isEmergencyNumber(phoneNumber)) {
      return { success: false, error: 'Not an emergency number' };
    }

    setState(prev => ({ ...prev, isLocating: true, error: null }));

    try {
      // Get location first
      const location = await E911Service.getCurrentLocation();
      setState(prev => ({ ...prev, location }));

      // Initiate the call
      const result = await E911Service.initiateEmergencyCall(
        callerPhone,
        callerName,
        phoneNumber
      );

      if (result.success) {
        setState(prev => ({
          ...prev,
          isEmergencyCall: true,
          psap: result.psap || null,
          callId: result.callId || null,
          isLocating: false,
        }));

        toast({
          title: '🚨 Emergency Call',
          description: `Connecting to ${result.psap?.name || 'Emergency Services'}`,
          variant: 'destructive',
        });

        return result;
      } else {
        throw new Error(result.error || 'Emergency call failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Emergency call failed';
      setState(prev => ({
        ...prev,
        isLocating: false,
        error: errorMessage,
      }));

      toast({
        title: 'Emergency Call Failed',
        description: 'Please dial emergency services directly',
        variant: 'destructive',
      });

      return { success: false, error: errorMessage };
    }
  }, [toast]);

  /**
   * End emergency call
   */
  const endEmergencyCall = useCallback(() => {
    setState({
      isEmergencyCall: false,
      location: null,
      psap: null,
      callId: null,
      isLocating: false,
      error: null,
    });
  }, []);

  /**
   * Update location during call
   */
  const updateLocation = useCallback(async () => {
    if (state.callId) {
      await E911Service.sendLocationUpdate(state.callId);
    }
  }, [state.callId]);

  /**
   * Get E911 registration status
   */
  const getRegistrationStatus = useCallback(() => {
    return E911Service.getRegistrationStatus();
  }, []);

  return {
    ...state,
    isEmergencyNumber,
    initiateEmergencyCall,
    endEmergencyCall,
    updateLocation,
    getRegistrationStatus,
  };
}
