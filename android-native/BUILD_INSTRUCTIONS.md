# CHATR Native Android - Build Instructions

## ✅ Complete Native Android Project

This is a **100% native Android application** built with:
- ✅ Kotlin
- ✅ Jetpack Compose
- ✅ MVVM Architecture
- ✅ Hilt Dependency Injection
- ✅ Coroutines & Flow
- ✅ Firebase Auth (Email + Google + Phone)
- ✅ Firebase Cloud Messaging
- ✅ WebRTC Video/Audio Calling
- ✅ Retrofit API Client
- ✅ Room Database
- ✅ WorkManager Background Tasks
- ✅ Native ConnectionService for VoIP

**NO Capacitor, NO WebView, NO Hybrid Code**

---

## 📋 Prerequisites

1. **Android Studio** Hedgehog (2023.1.1) or newer
2. **JDK 17** or newer
3. **Android SDK 34** (Android 14)
4. **Gradle 8.2** (included via wrapper)

---

## 🚀 Quick Start

### 1. Open Project in Android Studio

```bash
# Navigate to android-native folder
cd android-native

# Open in Android Studio
# File → Open → Select 'android-native' folder
```

### 2. Wait for Gradle Sync

Android Studio will automatically:
- Download all dependencies (~5-10 minutes first time)
- Generate build files
- Index the project

### 3. Configure Firebase

**Required for authentication and push notifications:**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing
3. Add Android app with package name: `com.chatr.app`
4. Download `google-services.json`
5. Place file in `app/` directory

**Example file structure:**
```
android-native/
├── app/
│   ├── google-services.json  ← Place here
│   ├── build.gradle.kts
│   └── src/
```

Reference: `app/google-services.json.example`

### 4. Build & Run

#### Option A: Android Studio GUI
1. Click **"Run"** button (green play icon)
2. Or press **Shift + F10**
3. Select device/emulator

#### Option B: Command Line
```bash
# Make gradlew executable (Unix/Mac)
chmod +x gradlew

# Build debug APK
./gradlew assembleDebug

# Install on connected device
./gradlew installDebug

# Run app
adb shell am start -n com.chatr.app/.MainActivity
```

#### Windows:
```bash
# Build debug APK
gradlew.bat assembleDebug

# Install
gradlew.bat installDebug
```

---

## 🏗️ Project Structure

```
android-native/
├── gradle/
│   └── wrapper/
│       ├── gradle-wrapper.jar         ✅ Gradle wrapper binary
│       └── gradle-wrapper.properties  ✅ Gradle config
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/chatr/app/
│   │   │   │   ├── MainActivity.kt              # Entry point
│   │   │   │   ├── ChatrApplication.kt          # App initialization
│   │   │   │   ├── di/
│   │   │   │   │   └── AppModule.kt             # Hilt DI module
│   │   │   │   ├── data/
│   │   │   │   │   ├── api/
│   │   │   │   │   │   └── ChatrApi.kt          # Retrofit API
│   │   │   │   │   ├── models/                  # Data models
│   │   │   │   │   └── repository/              # Repository layer
│   │   │   │   ├── viewmodel/                   # ViewModels
│   │   │   │   ├── ui/
│   │   │   │   │   ├── screens/
│   │   │   │   │   │   ├── AuthScreen.kt       # Login/Signup
│   │   │   │   │   │   ├── ChatsScreen.kt      # Chat list
│   │   │   │   │   │   ├── CallsScreen.kt      # Call history
│   │   │   │   │   │   ├── ContactsScreen.kt   # Contacts
│   │   │   │   │   │   ├── SettingsScreen.kt   # Settings
│   │   │   │   │   │   ├── VideoCallScreen.kt  # Video call UI
│   │   │   │   │   │   ├── IncomingCallScreen.kt
│   │   │   │   │   │   └── OngoingCallScreen.kt
│   │   │   │   │   ├── components/
│   │   │   │   │   │   └── ChatrBottomNavigation.kt
│   │   │   │   │   ├── navigation/
│   │   │   │   │   │   └── NavGraph.kt
│   │   │   │   │   └── theme/
│   │   │   │   │       ├── Color.kt
│   │   │   │   │       ├── Theme.kt
│   │   │   │   │       └── Type.kt
│   │   │   │   ├── webrtc/                      # WebRTC calling
│   │   │   │   ├── call/                        # Call management
│   │   │   │   ├── contacts/                    # Contact sync
│   │   │   │   ├── notifications/               # FCM service
│   │   │   │   ├── security/                    # Encryption
│   │   │   │   └── service/
│   │   │   │       └── CallForegroundService.kt
│   │   │   └── AndroidManifest.xml
│   │   └── res/                                 # Resources
│   ├── build.gradle.kts                         # App build config
│   └── google-services.json                     # Firebase config
├── build.gradle.kts                             # Project build config
├── settings.gradle.kts                          # Project settings
├── gradle.properties                            # Gradle properties
├── gradlew                                      # Gradle wrapper (Unix)
├── gradlew.bat                                  # Gradle wrapper (Windows)
└── README.md
```

---

## 🔧 Build Commands

### Debug Build
```bash
./gradlew assembleDebug
# Output: app/build/outputs/apk/debug/app-debug.apk
```

### Release Build (Requires signing)
```bash
./gradlew assembleRelease
# Output: app/build/outputs/apk/release/app-release.apk
```

### Install on Device
```bash
./gradlew installDebug
```

### Run Tests
```bash
./gradlew test
./gradlew connectedAndroidTest
```

### Clean Build
```bash
./gradlew clean
./gradlew cleanBuildCache
```

### Check Dependencies
```bash
./gradlew dependencies
```

---

## 🔐 Firebase Configuration

### Enable Authentication Methods

1. **Email/Password:**
   - Firebase Console → Authentication → Sign-in method
   - Enable "Email/Password"

2. **Google Sign-In:**
   - Enable "Google" provider
   - Add SHA-1 fingerprint:
     ```bash
     keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
     ```

3. **Phone Authentication:**
   - Enable "Phone" provider
   - Configure SafetyNet (for production)

### Enable Cloud Messaging (FCM)

1. Firebase Console → Cloud Messaging
2. Server key will be in `google-services.json`
3. App automatically registers for FCM tokens

---

## 📱 Features Implemented

### ✅ Authentication
- Email/Password sign up and login
- Google Sign-In integration
- Phone number authentication
- Auto session management
- Secure token storage

### ✅ Messaging
- Real-time chat
- Message history
- Typing indicators
- Read receipts
- Push notifications

### ✅ Calling
- HD Audio calling
- HD Video calling (1080p capable)
- WebRTC peer-to-peer
- TURN/STUN server support
- Native ConnectionService integration
- Incoming call UI (works when app is killed)
- Picture-in-Picture for video calls
- Bluetooth audio routing
- Speaker/earpiece toggle

### ✅ Contacts
- Native contact sync
- Background sync with WorkManager
- Privacy-focused (hashed identifiers)
- Auto-detect users on CHATR

### ✅ Notifications
- FCM integration
- High-priority call notifications
- Message notifications with actions
- Notification channels

---

## 🎨 Design System

### Colors (matching web app)
- **Primary**: `#9b87f5` (Purple)
- **Background**: `#0a0a0a` (Dark)
- **Surface**: `#1a1a1a` (Darker)
- **Text**: `#FFFFFF` (White)

### Typography
- **Display**: Bold, 48sp
- **Headline**: SemiBold, 24sp
- **Body**: Regular, 16sp
- **Caption**: Regular, 14sp

---

## 🚨 Troubleshooting

### Gradle Sync Failed
```bash
# Clear Gradle cache
./gradlew clean
rm -rf .gradle
./gradlew build --refresh-dependencies
```

### SDK Not Found
1. Android Studio → SDK Manager
2. Install **Android 14 (API 34)**
3. Install **Build Tools 34.0.0**
4. Install **Android SDK Platform-Tools**

### Build Tools Version Error
```kotlin
// Update in app/build.gradle.kts
android {
    compileSdk = 34
    buildToolsVersion = "34.0.0"
}
```

### Firebase Issues
- Verify `google-services.json` is in `app/` directory
- Check package name matches: `com.chatr.app`
- Re-download if SHA-1 fingerprint changed

### WebRTC Not Working
- Grant camera and microphone permissions
- Check STUN/TURN server configuration
- Verify network connectivity
- Test on real device (not all emulators support camera)

### Hilt Compilation Errors
```bash
# Clean and rebuild
./gradlew clean
./gradlew build --refresh-dependencies
```

---

## 📦 APK Output

Debug APK location:
```
app/build/outputs/apk/debug/app-debug.apk
```

Release APK location:
```
app/build/outputs/apk/release/app-release-unsigned.apk
```

---

## 🔑 Release Signing (Production)

### 1. Create Keystore
```bash
keytool -genkey -v -keystore chatr-release.keystore \
  -alias chatr \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

### 2. Configure in `app/build.gradle.kts`
```kotlin
android {
    signingConfigs {
        create("release") {
            storeFile = file("../chatr-release.keystore")
            storePassword = "YOUR_PASSWORD"
            keyAlias = "chatr"
            keyPassword = "YOUR_PASSWORD"
        }
    }
    
    buildTypes {
        release {
            signingConfig = signingConfigs.getByName("release")
        }
    }
}
```

### 3. Build Signed APK
```bash
./gradlew assembleRelease
```

---

## 📊 Performance

- **APK Size**: ~25MB (debug), ~15MB (release with ProGuard)
- **Min SDK**: Android 8.0 (API 26)
- **Target SDK**: Android 14 (API 34)
- **Compile SDK**: 34

---

## 📄 License

Copyright © 2024 CHATR. All rights reserved.

---

## 🆘 Support

For issues or questions:
1. Check `README.md`
2. Review `android-native/NATIVE_BUILD_GUIDE.md`
3. Check Firebase Console logs
4. Review Android Logcat in Android Studio

---

**Happy Building! 🚀**
