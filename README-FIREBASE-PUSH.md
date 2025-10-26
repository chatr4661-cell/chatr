# Firebase Push Notifications Setup Guide

## Overview
Chatr+ now includes WhatsApp-style push notifications that work even when the app is closed. This guide explains how to complete the setup.

## Features
✅ Foreground notifications (app open)
✅ Background notifications (app minimized)
✅ Closed app notifications
✅ Click to open specific conversation
✅ Inline reply actions
✅ Vibration patterns
✅ Sound alerts
✅ Notification badges

## Setup Steps

### 1. Generate VAPID Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `chatr-91067`
3. Navigate to **Project Settings** → **Cloud Messaging**
4. Under **Web Configuration**, find **Web Push certificates**
5. Click **Generate key pair**
6. Copy the generated VAPID key

### 2. Update the Code

Replace `YOUR_VAPID_KEY` in `src/hooks/useChatPushNotifications.tsx` with your actual VAPID key:

```typescript
const token = await getToken(messaging, {
  vapidKey: 'YOUR_ACTUAL_VAPID_KEY_HERE'
});
```

### 3. Add Firebase Server Key Secret

The edge function needs your Firebase Server Key:

1. Get your Server Key from Firebase Console → **Project Settings** → **Cloud Messaging** → **Server key**
2. Add it as a secret in Lovable:
   - Name: `FIREBASE_SERVER_KEY`
   - Value: Your server key

### 4. Deploy Edge Function

The `send-chat-notification` edge function is already created and will be deployed automatically.

## How It Works

### Message Flow

1. **User sends message** → Message stored in Supabase
2. **Supabase trigger** → Calls `send-chat-notification` edge function
3. **Edge function** → Fetches receiver's FCM token from Firestore
4. **FCM sends push** → Notification delivered to user's device
5. **User clicks notification** → Opens app to specific conversation

### Notification States

- **App Open (Foreground)**: Toast notification + Browser notification
- **App Minimized (Background)**: Service worker notification with actions
- **App Closed**: Service worker notification with actions

### Features

- **Smart Filtering**: No notification if already viewing that conversation
- **Vibration**: WhatsApp-style vibration pattern (200-100-200ms)
- **Actions**: "Open Chat" and "Reply" buttons
- **Deep Links**: Opens specific conversation when clicked
- **Persistent**: `requireInteraction: true` keeps notification visible

## Testing

### Test Push Notifications

1. Open the app in two different browsers/devices
2. Sign in with different users
3. Send a message from User A
4. User B should receive notification instantly

### Test Background Notifications

1. Minimize the browser tab
2. Send a message
3. Notification should appear from service worker

### Test Closed App Notifications

1. Close the browser/app completely
2. Send a message from another device
3. Notification should still appear (requires FCM setup)

## Firestore Structure

The hook saves FCM tokens to Firestore:

```
users/
  {userId}/
    fcmToken: "string"
    lastUpdated: "ISO timestamp"
```

## Troubleshooting

### No Notifications Appearing

1. Check notification permissions: `Notification.permission === "granted"`
2. Verify FCM token is being generated (check console logs)
3. Ensure service worker is registered (check DevTools → Application → Service Workers)
4. Check Firebase Cloud Messaging is enabled in Firebase Console

### Service Worker Not Working

1. Ensure `firebase-messaging-sw.js` is in the `public/` folder
2. Check service worker registration in browser DevTools
3. Verify HTTPS (service workers require HTTPS in production)

### Notifications Not Persistent

1. Check `requireInteraction: true` is set in notification options
2. Verify notification actions are properly configured

## Security Notes

- FCM tokens are stored in Firestore with user-level access
- Edge function validates user authentication
- Only authenticated users can send/receive notifications
- Tokens are refreshed automatically when needed

## Next Steps

1. Add notification sounds (already configured: `/notification.mp3`)
2. Customize notification icons per conversation
3. Add notification categories (messages, calls, groups)
4. Implement notification preferences (mute, custom sounds)
5. Add read receipts via notifications

## Resources

- [Firebase Cloud Messaging Docs](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Web Push Notifications](https://web.dev/push-notifications-overview/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
