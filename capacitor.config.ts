import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.lovable.6d6a8a571c024ddcbd7f2c0ec6dd878a',
  appName: 'chatr',
  webDir: 'dist',
  server: {
    url: 'https://6d6a8a57-1c02-4ddc-bd7f-2c0ec6dd878a.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#10b981',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      iosSplashResourceName: 'Splash',
      launchAutoHide: true
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#10b981'
    },
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true
    },
    App: {
      // App state and lifecycle
    },
    Device: {
      // Device ID will be used for fingerprinting
    },
    Contacts: {
      // Enable contacts permission
    },
    BluetoothLe: {
      displayStrings: {
        scanning: "Scanning for nearby Chatr users...",
        cancel: "Cancel",
        availableDevices: "Available devices",
        noDeviceFound: "No device found"
      }
    }
  },
  // iOS specific configuration
  ios: {
    contentInset: 'automatic'
  }
};

export default config;
