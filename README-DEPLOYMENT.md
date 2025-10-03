# HealthMessenger - iOS & Android Deployment Guide

## Overview
HealthMessenger is configured with Capacitor for native iOS and Android deployment.

## Prerequisites
- Node.js and npm installed
- Git account connected to Lovable
- For iOS: Mac with Xcode
- For Android: Android Studio

## Configuration
- **App ID**: `app.lovable.6d6a8a571c024ddcbd7f2c0ec6dd878a`
- **App Name**: HealthMessenger
- **Hot Reload URL**: https://6d6a8a57-1c02-4ddc-bd7f-2c0ec6dd878a.lovableproject.com

## Deployment Steps

### 1. Export to GitHub
1. Click "Export to GitHub" in Lovable
2. Clone your repository locally

### 2. Install Dependencies
```bash
cd your-project
npm install
```

### 3. Build the Project
```bash
npm run build
```

### 4. Add Native Platforms

For iOS:
```bash
npx cap add ios
npx cap update ios
```

For Android:
```bash
npx cap add android
npx cap update android
```

### 5. Sync Changes
After any code updates from GitHub:
```bash
npm run build
npx cap sync
```

### 6. Open Native IDEs

For iOS:
```bash
npx cap run ios
# Or manually: npx cap open ios
```

For Android:
```bash
npx cap run android
# Or manually: npx cap open android
```

## Native Features Included
- ✅ Camera access (profile pictures, documents)
- ✅ Geolocation (emergency services)
- ✅ Haptic feedback (emergency button)
- ✅ Push notifications (appointment reminders)
- ✅ Themed splash screen (green brand colors)
- ✅ Status bar styling

## App Store Submission

### iOS (App Store Connect)
1. Configure signing in Xcode
2. Set app version and build number
3. Create app icons (required sizes in `public/`)
4. Update `ios/App/App/Info.plist` with permissions descriptions
5. Archive and upload via Xcode

### Android (Google Play Console)
1. Configure signing in Android Studio
2. Set version in `android/app/build.gradle`
3. Create app icons and feature graphic
4. Update `android/app/src/main/AndroidManifest.xml` with permissions
5. Build signed APK/Bundle and upload

## Important Notes
- Hot reload works in development via the configured server URL
- Disable server URL before production builds
- Update privacy policy URLs in stores
- Configure proper OAuth redirect URLs for authentication
- Test thoroughly on physical devices before submission

## Support
For issues, refer to:
- Capacitor docs: https://capacitorjs.com
- Lovable Capacitor guide: https://docs.lovable.dev/capacitor
