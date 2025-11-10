import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'com.chatr.app',
  appName: 'Chatr+',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    url: 'https://6d6a8a57-1c02-4ddc-bd7f-2c0ec6dd878a.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
      // Android: High priority for critical notifications
      iconColor: '#6200ee',
      sound: 'notification.mp3'
    },
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#6200ee',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      androidSplashResourceName: 'splash',
      iosSplashResourceName: 'Splash',
      launchAutoHide: true
    },
    StatusBar: {
      style: 'light',
      backgroundColor: '#6200ee'
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
