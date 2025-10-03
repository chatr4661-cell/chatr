import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.lovable.6d6a8a571c024ddcbd7f2c0ec6dd878a',
  appName: 'HealthMessenger',
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
      launchShowDuration: 2000,
      backgroundColor: '#10b981',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    }
  }
};

export default config;
