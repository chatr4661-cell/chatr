# Background Location Tracking Setup

This guide explains how to enable continuous GPS tracking even when the app is in the background or closed.

## 🎯 Features

- Continuous location tracking (even in background)
- Battery-optimized updates
- Auto-save to database
- Distance-based updates (only when user moves)
- High accuracy GPS

## 📦 Required Configuration

### iOS Setup

Add to `ios/App/App/Info.plist`:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>location</string>
</array>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>This app needs access to your location even in the background to show you nearby friends and enable location features</string>

<key>NSLocationWhenInUseUsageDescription</key>
<string>This app needs access to your location to show you nearby friends and enable location features</string>

<key>NSLocationAlwaysUsageDescription</key>
<string>This app needs background location access to keep you connected with nearby friends</string>
```

### Android Setup

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

<application>
    <!-- Add foreground service for Android -->
    <service
        android:name=".LocationService"
        android:enabled="true"
        android:exported="false"
        android:foregroundServiceType="location" />
</application>
```

## 🚀 Usage

The app already has background location tracking implemented via `useBackgroundLocation` hook!

### How to Use

```typescript
import { useBackgroundLocation } from '@/hooks/useBackgroundLocation';

function MyComponent() {
  const { location, isTracking, startTracking, stopTracking } = useBackgroundLocation(
    userId,
    {
      enableBackground: true,
      updateInterval: 60000, // 1 minute
      distanceFilter: 50, // Update every 50 meters
    }
  );

  return (
    <div>
      <p>Latitude: {location?.latitude}</p>
      <p>Longitude: {location?.longitude}</p>
      <button onClick={startTracking}>Start Tracking</button>
      <button onClick={stopTracking}>Stop Tracking</button>
    </div>
  );
}
```

### Configuration Options

```typescript
{
  enableBackground: true,      // Enable background tracking
  updateInterval: 60000,       // Update every 60 seconds
  distanceFilter: 50,          // Update if user moves 50 meters
}
```

## 📊 Database Schema

Location data is saved to:

1. **profiles table** (current location):
```sql
- location_lat: DECIMAL
- location_long: DECIMAL
- location_accuracy: DECIMAL
- location_updated_at: TIMESTAMP
```

2. **user_locations table** (history):
```sql
- user_id: UUID
- latitude: DECIMAL
- longitude: DECIMAL
- accuracy: DECIMAL
- altitude: DECIMAL (optional)
- speed: DECIMAL (optional)
- heading: DECIMAL (optional)
- created_at: TIMESTAMP
```

## 🔋 Battery Optimization

The implementation uses smart strategies to save battery:

1. **Distance-based updates**: Only updates when user moves significantly
2. **Adjustable intervals**: Default 1 minute, can be increased
3. **High accuracy only when needed**: Uses standard accuracy in background
4. **Automatic pause**: Stops when user is stationary

## 🧪 Testing

### Test on iOS
```bash
# Build and run
npx cap run ios

# Simulate location in Xcode:
# Debug > Simulate Location > Custom Location
```

### Test on Android
```bash
# Build and run
npx cap run android

# Simulate location in Android Studio:
# Run > Edit Configurations > Extended controls > Location
```

### Test background mode
1. Start location tracking
2. Lock the phone
3. Check database - location should update every minute
4. Open app again - location should be current

## ⚠️ Important Notes

1. **Permissions**: User must grant "Always Allow" location permission
2. **Battery**: Explain to users why you need background location
3. **Privacy**: Be transparent about data usage
4. **iOS Review**: Apple reviews background location usage carefully
5. **Android 10+**: Background location requires separate permission

## 🎯 Real-World Use Cases

✅ Show nearby friends on map
✅ Local business recommendations
✅ Safety features (share live location)
✅ Location-based reminders
✅ Travel tracking
✅ Fitness tracking

## 📱 UI Recommendations

Add these to your app:
1. Location permission explanation screen
2. Toggle to enable/disable tracking
3. Visual indicator when tracking is active
4. Battery usage information
5. Data usage transparency

## 🔜 Advanced Features

Consider adding:
- Geofencing (trigger events when entering/leaving areas)
- Location history visualization
- Privacy zones (don't track at home/work)
- Smart tracking (more frequent when moving, less when stationary)

## 📚 Resources

- [Capacitor Geolocation](https://capacitorjs.com/docs/apis/geolocation)
- [iOS Background Location](https://developer.apple.com/documentation/corelocation/getting_the_user_s_location)
- [Android Background Location](https://developer.android.com/training/location/background)
