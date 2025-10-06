# Mobile Wellness Integration Guide

## Automatic Health Data Recording on iOS & Android

This guide explains how to integrate automatic wellness data recording using Capacitor plugins.

### Prerequisites

This app uses Capacitor for mobile capabilities. The following plugins are already installed:
- `@capacitor/core`
- `@capacitor/android`
- `@capacitor/ios`

### Required Plugins for Wellness Tracking

Install these additional Capacitor plugins:

```bash
npm install @capacitor-community/health
npm install @capacitor/motion
npm install @capacitor/local-notifications
```

### iOS Setup

1. **Add permissions to `ios/App/App/Info.plist`:**

```xml
<key>NSHealthShareUsageDescription</key>
<string>This app needs access to your health data to track wellness metrics</string>
<key>NSHealthUpdateUsageDescription</key>
<string>This app needs to update your health data</string>
<key>NSMotionUsageDescription</key>
<string>This app tracks your activity to monitor wellness</string>
<key>UIBackgroundModes</key>
<array>
    <string>location</string>
    <string>processing</string>
</array>
```

2. **Enable HealthKit capability in Xcode:**
   - Open project in Xcode
   - Select target → Signing & Capabilities
   - Click "+ Capability" → Add "HealthKit"

### Android Setup

1. **Add permissions to `android/app/src/main/AndroidManifest.xml`:**

```xml
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION"/>
<uses-permission android:name="android.permission.BODY_SENSORS"/>
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
```

2. **Add Google Fit API:**
   - Add to `build.gradle`:
```gradle
implementation 'com.google.android.gms:play-services-fitness:21.1.0'
implementation 'com.google.android.gms:play-services-auth:20.7.0'
```

### Implementation

#### 1. Create Wellness Data Service

```typescript
// src/services/WellnessDataService.ts
import { Capacitor } from '@capacitor/core';
import { Health } from '@capacitor-community/health';

export class WellnessDataService {
  async requestPermissions() {
    if (Capacitor.getPlatform() === 'ios' || Capacitor.getPlatform() === 'android') {
      const permissions = await Health.requestPermissions({
        read: ['steps', 'distance', 'calories', 'heart_rate', 'sleep'],
        write: []
      });
      return permissions;
    }
    return null;
  }

  async getStepsToday() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const result = await Health.queryData({
      type: 'steps',
      startDate: today.toISOString(),
      endDate: new Date().toISOString()
    });
    
    return result.data;
  }

  async syncWellnessData() {
    // Sync all wellness metrics
    const [steps, heartRate, sleep] = await Promise.all([
      this.getStepsToday(),
      this.getHeartRateToday(),
      this.getSleepToday()
    ]);

    return {
      steps,
      heartRate,
      sleep,
      timestamp: new Date().toISOString()
    };
  }

  // Background sync setup
  async setupBackgroundSync() {
    if (Capacitor.getPlatform() === 'ios') {
      // iOS Background Task
      await Health.enableBackgroundDelivery({
        type: 'steps',
        frequency: 'immediate'
      });
    } else if (Capacitor.getPlatform() === 'android') {
      // Android WorkManager
      // Implement periodic sync
    }
  }
}
```

#### 2. Automatic Data Recording

```typescript
// src/hooks/useWellnessSync.ts
import { useEffect, useState } from 'react';
import { WellnessDataService } from '@/services/WellnessDataService';
import { supabase } from '@/integrations/supabase/client';

export const useWellnessSync = () => {
  const [syncing, setSyncing] = useState(false);
  const service = new WellnessDataService();

  useEffect(() => {
    // Request permissions on mount
    service.requestPermissions();

    // Setup background sync
    service.setupBackgroundSync();

    // Sync every hour
    const interval = setInterval(async () => {
      await syncToDatabase();
    }, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(interval);
  }, []);

  const syncToDatabase = async () => {
    setSyncing(true);
    try {
      const data = await service.syncWellnessData();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        await supabase.from('wellness_tracking').insert({
          user_id: user.id,
          date: new Date().toISOString().split('T')[0],
          steps: data.steps,
          heart_rate: data.heartRate,
          sleep_hours: data.sleep,
          synced_at: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Wellness sync error:', error);
    } finally {
      setSyncing(false);
    }
  };

  return { syncToDatabase, syncing };
};
```

### Usage in Wellness Component

```typescript
import { useWellnessSync } from '@/hooks/useWellnessSync';

export const WellnessPage = () => {
  const { syncToDatabase, syncing } = useWellnessSync();

  return (
    <div>
      <Button onClick={syncToDatabase} disabled={syncing}>
        {syncing ? 'Syncing...' : 'Sync Now'}
      </Button>
      {/* Rest of wellness UI */}
    </div>
  );
};
```

### Testing

1. **Build for mobile:**
```bash
npm run build
npx cap sync
npx cap open ios
# or
npx cap open android
```

2. **Test on device:**
   - Grant permissions when prompted
   - Verify data appears in app
   - Check background sync works

### Notes

- Health data sync works best on physical devices
- iOS requires App Store approval for HealthKit
- Android requires Google Fit API setup
- Background sync may be limited by OS battery optimization
- Always handle permission denials gracefully

### Production Checklist

- [ ] Privacy policy mentions health data usage
- [ ] Terms of service updated
- [ ] HIPAA compliance if storing health data
- [ ] Data encryption at rest and in transit
- [ ] User consent flow implemented
- [ ] Data deletion on account removal
