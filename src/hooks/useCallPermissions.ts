import { useState, useCallback } from 'react';

export type CallType = 'voice' | 'video';

interface PermissionCheckResult {
  granted: boolean;
  error?: string;
}

export function useCallPermissions() {
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  
  /**
   * Check if we already have the required permissions
   */
  const hasPermissions = useCallback(async (callType: CallType): Promise<boolean> => {
    try {
      // Try to check via Permissions API first (more reliable)
      if (navigator.permissions) {
        const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (micPermission.state !== 'granted') return false;
        
        if (callType === 'video') {
          const camPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (camPermission.state !== 'granted') return false;
        }
        
        return true;
      }
    } catch (e) {
      // Permissions API not supported, we'll need to request
    }
    
    return false;
  }, []);

  /**
   * Request permissions and return result
   */
  const requestPermissions = useCallback(async (callType: CallType): Promise<PermissionCheckResult> => {
    setIsCheckingPermissions(true);
    
    try {
      const constraints = {
        audio: true,
        video: callType === 'video'
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Stop tracks immediately - we just needed to check
      stream.getTracks().forEach(track => track.stop());
      
      setIsCheckingPermissions(false);
      return { granted: true };
      
    } catch (error: any) {
      setIsCheckingPermissions(false);
      
      // Generate user-friendly error messages
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        return {
          granted: false,
          error: callType === 'video' 
            ? 'Camera and microphone access was blocked'
            : 'Microphone access was blocked'
        };
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        return {
          granted: false,
          error: callType === 'video'
            ? 'No camera or microphone found'
            : 'No microphone found'
        };
      } else if (error.name === 'NotReadableError') {
        return {
          granted: false,
          error: 'Device is being used by another app'
        };
      }
      
      return {
        granted: false,
        error: 'Could not access your device'
      };
    }
  }, []);

  return {
    hasPermissions,
    requestPermissions,
    isCheckingPermissions
  };
}
