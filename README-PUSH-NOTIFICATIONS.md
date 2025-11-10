# Push Notifications - Complete Setup Guide

## Overview
This app now has comprehensive push notification support that works even when the app is closed, on web, Android, and iOS.

## Features
✅ Push notifications work when app is closed or in background  
✅ Web support via Firebase Cloud Messaging (FCM)  
✅ Native Android & iOS support via Capacitor  
✅ Real-time notifications via Supabase  
✅ User notification preferences (toggle types on/off)  
✅ Background sync and auto-updates  
✅ Deep linking to specific screens  
✅ Sound and vibration customization  

## Architecture

### 1. Database Tables
- **device_tokens**: Stores FCM tokens for all devices
- **notification_preferences**: User settings for notification types

### 2. Edge Functions
- **send-push-notification**: Generic push notification sender
- **send-chat-notification**: Specialized for chat messages

### 3. Client-Side Hooks
- **useFirebaseMessaging**: Web FCM token management
- **usePushNotifications**: Native Capacitor notifications
- **useChatPushNotifications**: Chat-specific notifications

### 4. Service Worker
- `public/firebase-messaging-sw.js`: Handles background notifications
- Registered automatically on app start
- Shows notifications even when browser/app is closed

## Setup Instructions

### Step 1: Firebase Configuration
1. Get your Firebase Web Config from Firebase Console
2. Update `src/firebase.ts` with your config
3. Get your VAPID key from Firebase Console → Project Settings → Cloud Messaging
4. Update `.env` with `VITE_FIREBASE_VAPID_KEY=your_vapid_key`

### Step 2: Server Key (Already Done)
The FIREBASE_SERVER_KEY secret has been configured in Lovable Cloud.

### Step 3: Test Notifications
1. Go to `/settings` in your app
2. Click "Enable Notifications" button
3. Grant permission when prompted
4. Click "Send Test Notification"

## Notification Types
Users can toggle these notification types in Settings:

| Type | Description | Default |
|------|-------------|---------|
| Chat Messages | New messages from contacts | ✅ On |
| Call Notifications | Incoming voice/video calls | ✅ On |
| Group Messages | Messages in group chats | ✅ On |
| Transaction Alerts | Payment and wallet updates | ✅ On |
| App Updates | New features and improvements | ✅ On |
| Marketing & Offers | Promotional content | ❌ Off |

## How Notifications Work

### Web Flow
1. User grants notification permission
2. FCM token is generated
3. Token saved to `device_tokens` table
4. Service worker listens for background messages
5. Notifications appear even when browser is closed

### Native Flow (Capacitor)
1. App requests notification permission
2. Device token is generated
3. Token saved to `device_tokens` table
4. Native OS handles notification display
5. Works even when app is fully closed

### Sending Notifications
```typescript
// From your code, call the edge function
await supabase.functions.invoke('send-push-notification', {
  body: {
    userId: 'user-uuid',
    title: 'New Message',
    body: 'You have a new message from John',
    notificationType: 'chat', // chat, call, group, transaction, update, marketing
    data: {
      conversationId: 'conv-id',
      messageId: 'msg-id',
      click_action: '/chat/conv-id'
    }
  }
});
```

## Testing Checklist

### Web Testing
- [ ] Grant notification permission
- [ ] Send test notification from Settings
- [ ] Close browser completely
- [ ] Send notification from another device/user
- [ ] Verify notification appears
- [ ] Click notification - should open app to correct screen

### Android Testing
1. Build app: `npx cap build android`
2. Run on device: `npx cap run android`
3. Grant notification permission
4. Close app completely (swipe away from recent apps)
5. Send notification from another device
6. Verify notification appears in system tray
7. Tap notification - should open app

### iOS Testing
1. Build app: `npx cap build ios`
2. Run on device: `npx cap run ios`
3. Grant notification permission
4. Close app completely
5. Send notification from another device
6. Verify notification appears
7. Tap notification - should open app

## Notification Behavior

### App Open (Foreground)
- Shows in-app toast notification
- Plays sound (if enabled)
- Does not show system notification

### App Minimized (Background)
- Shows system notification
- Plays sound (if enabled)
- Vibrates (if enabled)
- Badge counter updates

### App Closed
- Service worker handles notification
- System notification displayed
- Sound and vibration work
- Badge counter updates
- Notification persists until tapped

## Deep Linking
Notifications can open specific screens:

```typescript
data: {
  click_action: '/chat/conversation-id',  // Opens specific chat
  // or
  click_action: '/notifications',         // Opens notifications page
  // or
  click_action: '/wallet',               // Opens wallet
}
```

## Troubleshooting

### Notifications Not Appearing
1. Check permission is granted: `Notification.permission === 'granted'`
2. Check service worker is registered: Open DevTools → Application → Service Workers
3. Check FCM token is saved: Query `device_tokens` table
4. Check user preferences: Query `notification_preferences` table
5. Check browser console for errors

### Android Issues
- Ensure battery optimization is disabled for the app
- Check notification channel settings in system settings
- Verify Firebase config in `google-services.json`

### iOS Issues
- Ensure APNs certificate is configured in Firebase
- Check notification permissions in iOS settings
- Verify provisioning profile includes push notifications

### Web Issues
- Check VAPID key is correct
- Verify service worker is running
- Clear browser cache and re-register service worker
- Check Firebase project has Web Push certificates

## Background Sync
The app also supports background contact sync and message sync when notifications are enabled.

## Security
- Device tokens are encrypted at rest
- RLS policies ensure users can only access their own tokens
- Notification preferences are user-specific
- Firebase Server Key is stored securely as a secret

## Performance
- Service worker is optimized for battery life
- Notifications are throttled to prevent spam
- Background tasks use efficient scheduling
- Token refresh happens automatically

## Analytics
Track notification metrics:
- Delivery rate
- Open rate
- Notification type preferences
- Time-to-open

## Future Enhancements
- Rich media notifications (images, videos)
- Inline reply for chat messages
- Notification grouping
- Scheduled notifications
- Location-based notifications
- Smart notification timing (ML-based)
