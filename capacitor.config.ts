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
    BarcodeScanner: {
      targetedFormats: ['QR_CODE', 'EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'CODE_39', 'CODE_128']
    },
    NativeBiometric: {
      useFallback: true,
      fallbackTitle: 'Use Passcode',
      fallbackButtonLabel: 'Cancel',
      biometryTitle: 'Chatr+ Login',
      biometrySubTitle: 'Authenticate to access your account'
    },
    SpeechRecognition: {
      language: 'en-US',
      maxResults: 5,
      popup: false,
      partialResults: true
    },
    FirebaseAnalytics: {
      enabled: true,
      automaticDataCollectionEnabled: true
    },
    FirebaseCrashlytics: {
      enabled: true,
      automaticDataCollectionEnabled: true
    },
    BackgroundTask: {
      enableLogs: true
    }
  },
  // iOS specific configuration
  ios: {
    contentInset: 'automatic'
  }
};

export default config;
