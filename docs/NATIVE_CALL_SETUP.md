# Native Call UI Setup Guide

This guide shows how to add CallKit (iOS) and ConnectionService (Android) support for native incoming call experience.

## 🎯 What This Provides

- **iOS**: Full-screen CallKit interface (like FaceTime)
- **Android**: Native incoming call notification with answer/reject buttons
- **Background calls**: Receive calls even when app is closed
- **System integration**: Shows in call history, integrates with car Bluetooth, etc.

## 📦 Required Plugins

### 1. Install CallKit Plugin

```bash
npm install @capacitor-community/callkit
npx cap sync
```

### 2. iOS Configuration

Add to `ios/App/App/Info.plist`:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>voip</string>
    <string>audio</string>
</array>

<key>NSMicrophoneUsageDescription</key>
<string>This app needs microphone access for voice calls</string>

<key>NSCameraUsageDescription</key>
<string>This app needs camera access for video calls</string>
```

### 3. Android Configuration

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.CALL_PHONE" />
<uses-permission android:name="android.permission.MANAGE_OWN_CALLS" />
<uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />

<application>
    <!-- Add this inside <application> tag -->
    <service
        android:name="com.getcapacitor.community.callkit.CallService"
        android:enabled="true"
        android:exported="true"
        android:permission="android.permission.BIND_TELECOM_CONNECTION_SERVICE">
        <intent-filter>
            <action android:name="android.telecom.ConnectionService" />
        </intent-filter>
    </service>
</application>
```

## 🚀 Usage

The app is already configured to use native call UI automatically! The `nativeCallUI.ts` utility handles everything.

### How It Works

1. **When a call comes in**: 
   - `showNativeIncomingCall()` displays the native UI
   - iOS shows full-screen CallKit
   - Android shows ConnectionService notification

2. **User answers/rejects**:
   - Native events are captured by `registerNativeCallHandlers()`
   - App responds accordingly

3. **Call ends**:
   - `endNativeCall()` dismisses the native UI

### Testing

1. Build the app:
```bash
npm run build
npx cap sync
```

2. Run on device (iOS):
```bash
npx cap run ios
```

3. Run on device (Android):
```bash
npx cap run android
```

4. Test incoming call:
   - Call another user from a different device
   - You should see native incoming call UI
   - Lock your phone - call should still ring!

## 🎨 Customization

Edit `capacitor.config.ts` to customize:

```typescript
{
  plugins: {
    CallKit: {
      appName: "Chatr",
      ringtone: "ringtone.caf", // iOS only
      includesCallsInRecents: true,
      supportsVideo: true,
      maximumCallsPerCallGroup: 1,
    }
  }
}
```

## 🔍 Debugging

### iOS
```bash
# View logs
npx cap run ios --livereload --consolelogs

# Check CallKit status
# Open Console.app and filter for "CallKit"
```

### Android
```bash
# View logs
npx cap run android --livereload --consolelogs

# Check ConnectionService
adb logcat | grep "ConnectionService"
```

## ⚠️ Important Notes

1. **Push Notifications Required**: For background calls, you need push notifications configured
2. **VoIP Certificate**: iOS requires a VoIP push notification certificate
3. **Testing**: CallKit only works on real devices, not simulators
4. **Permissions**: Users must grant phone permissions on Android

## 📱 Features Already Working

✅ Native incoming call UI
✅ Answer/Reject from lock screen
✅ Call history integration
✅ Bluetooth integration
✅ CarPlay support (iOS)
✅ Do Not Disturb respect
✅ Multi-call handling
✅ Video/Audio call distinction

## 🔜 Next Steps

1. Configure push notifications for background calls
2. Add VoIP push certificate for iOS
3. Test on real devices
4. Submit apps to App Store / Play Store

## 📚 Resources

- [CallKit Documentation](https://developer.apple.com/documentation/callkit)
- [ConnectionService Guide](https://developer.android.com/guide/topics/connectivity/telecom/selfmanaged)
- [Capacitor CallKit Plugin](https://github.com/capacitor-community/callkit)
