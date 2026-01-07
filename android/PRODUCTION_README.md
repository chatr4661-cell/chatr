# CHATR+ Android Production Build Guide

## 🚀 Quick Start (5 Minutes to APK)

### Prerequisites
- Android Studio (Arctic Fox or later)
- JDK 17
- Node.js 18+

### Build Steps

```bash
# 1. Clone and install dependencies
git clone <your-repo>
cd chatr
npm install

# 2. Build web assets
npm run build

# 3. Sync to Android
npx cap sync android

# 4. Open in Android Studio
npx cap open android

# 5. Build APK
# In Android Studio: Build → Build Bundle(s)/APK(s) → Build APK(s)
```

---

## 📱 Features Included

### Calling (GSM-Like)
- ✅ Fullscreen incoming call UI over lock screen
- ✅ TelecomManager integration (Bluetooth, Car Kit)
- ✅ Audio routing (Speaker, Earpiece, Bluetooth)
- ✅ Call foreground service (keeps calls alive)
- ✅ WebRTC with 50-attempt recovery protocol

### Notifications
- ✅ FCM high-priority data messages
- ✅ Answer/Reject from notification
- ✅ Direct reply to messages
- ✅ Bypasses DND for calls
- ✅ Lock screen visibility

### Background Reliability
- ✅ Boot receiver (survives restart)
- ✅ Network recovery sync
- ✅ Battery optimization exemption
- ✅ Foreground services for active features

---

## 🔧 Configuration

### Firebase (Already Configured)
`google-services.json` is in `android/app/`

### Signing for Release
1. Generate keystore:
```bash
keytool -genkey -v -keystore chatr-release.keystore -alias chatr -keyalg RSA -keysize 2048 -validity 10000
```

2. Update `android/app/build.gradle.kts`:
```kotlin
signingConfigs {
    create("release") {
        storeFile = file("chatr-release.keystore")
        storePassword = "your-password"
        keyAlias = "chatr"
        keyPassword = "your-password"
    }
}

buildTypes {
    release {
        signingConfig = signingConfigs.getByName("release")
        // ... rest of config
    }
}
```

---

## 🏪 Play Store Submission

### Required Assets
- [ ] App icon (512x512)
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (phone + tablet)
- [ ] Privacy policy URL
- [ ] Short description (80 chars)
- [ ] Full description (4000 chars)

### Content Rating
- Communication app
- User-generated content
- In-app messaging

### Permissions Explanation
Include in Play Store listing:
- **Phone/Call**: For voice and video calling features
- **Microphone**: For voice calls and voice messages
- **Camera**: For video calls and photo sharing
- **Contacts**: To find friends using Chatr+
- **Location**: For location sharing features
- **Notifications**: For call and message alerts

---

## 🐛 Troubleshooting

### Build Fails
```bash
cd android
./gradlew clean
./gradlew assembleDebug --stacktrace
```

### FCM Not Working
1. Verify SHA-1 in Firebase Console
2. Re-download `google-services.json`
3. Check notification channels exist

### Calls Not Ringing
1. Check battery optimization disabled
2. Verify FCM token registered
3. Check CHANNEL_CALLS created

---

## 📊 Architecture

```
android/app/src/main/java/com/chatr/app/
├── ChatrApplication.kt      # App init, channels, TelecomManager
├── MainActivity.kt          # Capacitor bridge + native actions
├── IncomingCallActivity.kt  # Fullscreen call UI
├── services/
│   ├── ChatrFirebaseMessagingService.kt  # FCM handler
│   ├── ChatrConnectionService.kt         # TelecomManager
│   ├── CallForegroundService.kt          # Active call service
│   └── BackgroundSyncService.kt          # Message sync
└── receivers/
    ├── BootReceiver.kt                   # Device restart
    ├── NotificationActionReceiver.kt     # Notification actions
    └── NetworkChangeReceiver.kt          # Network recovery
```

---

## ✅ Ready for Play Store!

This build includes everything needed for a production-quality messaging app:
- Carrier-grade calling reliability
- Native-feeling UI
- Background notification handling
- System-level integration
