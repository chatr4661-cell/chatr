import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

/**
 * Request battery optimization exemption for background reliability
 * Critical for push notifications and calls when app is closed
 */
export const useBatteryOptimization = () => {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const requestBatteryOptimizationExemption = async () => {
      try {
        // Android-specific: Request to disable battery optimization
        // This allows the app to run background services reliably
        if (Capacitor.getPlatform() === 'android') {
          // Check if already exempted
          const isIgnoring = await checkBatteryOptimization();
          
          if (!isIgnoring) {
            // Show user-friendly explanation
            toast.info('Enable background access for calls & messages', {
              description: 'Allow Chatr to run in background for reliable notifications',
              duration: 5000,
              action: {
                label: 'Enable',
                onClick: async () => {
                  await requestExemption();
                }
              }
            });
          }
        }
      } catch (error) {
        console.error('Battery optimization request failed:', error);
      }
    };

    requestBatteryOptimizationExemption();
  }, []);
};

// Native bridge to check battery optimization status
const checkBatteryOptimization = async (): Promise<boolean> => {
  try {
    const AndroidBridge = (window as any).AndroidBridge;
    if (AndroidBridge?.isIgnoringBatteryOptimizations) {
      return await AndroidBridge.isIgnoringBatteryOptimizations();
    }
    return false;
  } catch {
    return false;
  }
};

// Request exemption from battery optimization
const requestExemption = async () => {
  try {
    const AndroidBridge = (window as any).AndroidBridge;
    if (AndroidBridge?.requestBatteryOptimizationExemption) {
      await AndroidBridge.requestBatteryOptimizationExemption();
    }
  } catch (error) {
    console.error('Failed to request exemption:', error);
  }
};
