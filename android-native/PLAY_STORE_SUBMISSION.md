# CHATR Android - Play Store Submission Guide

## Pre-Submission Checklist

### 1. App Configuration

- [ ] Version code incremented
- [ ] Version name set (e.g., "1.0.0")
- [ ] App signing configured
- [ ] ProGuard/R8 rules verified
- [ ] Debug flags disabled
- [ ] Logging reduced for production

### 2. Required Assets

#### Screenshots (Required)
- Phone: 1080x1920 or 1440x2560
- 7" Tablet: 1200x1920
- 10" Tablet: 1800x2560

**Required Screenshots:**
1. Home/Chat list screen
2. Active chat screen
3. Incoming call screen
4. Video call screen
5. Contacts screen

#### Graphics
- [ ] Hi-res icon: 512x512 PNG
- [ ] Feature graphic: 1024x500 PNG
- [ ] Promo video (optional): YouTube link

### 3. Store Listing

#### Title
```
Chatr - Secure Calls & Messages
```

#### Developer Name
```
Talentxcel Services Pvt Ltd
```

#### Short Description (80 chars max)
```
HD calls, secure messaging & wellness tracking — smart communication.
```

#### Full Description
```
Chatr — A product of Talentxcel Services Pvt Ltd

Chatr delivers reliable VoIP calling that actually works.

Chatr is a VoIP communication app and does not replace your 
mobile carrier or emergency calling services.

📞 RELIABLE CALLS
• Calls ring even when your phone is locked or app is closed
• Integrates with your phone's native calling system
• Appears in your device's call history
• Works with Bluetooth headphones and car audio

🎥 HD VIDEO CALLS
• Crystal-clear video with adaptive quality
• Switch between front and rear cameras
• Works on WiFi and mobile data

💬 SECURE MESSAGING
• Secure, encrypted conversations
• Share photos, videos, and files
• See when messages are delivered and read
• Typing indicators

🔒 PRIVACY FIRST
• Your data stays private
• No ads, no tracking
• Open source WebRTC technology

⚡ DESIGNED FOR REAL PHONES
• Battery-optimized for all-day use
• Works on all Android devices
• Minimal storage footprint

Download Chatr today and experience calling that just works.

---
© 2026 Talentxcel Services Pvt Ltd. All rights reserved.
```

### 4. Content Rating

Complete the IARC questionnaire with these answers:
- Violence: None
- Sexuality: None
- Language: None
- Controlled Substances: None
- User-Generated Content: Yes (messaging)

Expected Rating: **Everyone** or **Teen**

### 5. Privacy & Permissions

#### Data Safety Form

**Data Collected:**
| Data Type | Collected | Shared | Purpose |
|-----------|-----------|--------|---------|
| Phone number | Yes | No | Account identification |
| Contacts | Optional | No | Find friends |
| Audio | Yes | No | Voice calls |
| Video | Yes | No | Video calls |
| Messages | Yes | No | Deliver and sync user conversations |

**Security Practices:**
- [x] Data encrypted in transit
- [x] Data encrypted at rest
- [x] Users can request data deletion

#### Permission Declarations

For each permission, provide justification:

**Phone (READ_PHONE_STATE, CALL_PHONE, ANSWER_PHONE_CALLS)**
```
Chatr uses Android's Telecom Framework to present and manage 
incoming and outgoing VoIP calls. The app does not place 
cellular calls or access carrier services.
```

**Microphone (RECORD_AUDIO)**
```
Required to capture the user's voice during audio and video calls. 
Audio is transmitted in real-time to the call participant and is 
not stored on our servers.
```

**Camera (CAMERA)**
```
Required for video calling functionality. Video is transmitted in 
real-time and is not stored or recorded without user consent.
```

**Contacts (READ_CONTACTS)**
```
Optional permission that helps users find and connect with people 
they know. Contact data is processed locally and used only to 
display names in the app's contact list. Users can fully use 
Chatr without granting contacts permission.
```

**Notifications (POST_NOTIFICATIONS)**
```
Required to notify users of incoming calls and messages. Without 
this permission, users may miss important calls.
```

**Foreground Service (FOREGROUND_SERVICE_PHONE_CALL)**
```
Required to maintain active call connections when the app is in 
the background. This ensures calls don't disconnect when users 
switch apps.
```

**Full Screen Intent (USE_FULL_SCREEN_INTENT)**
```
Required to display the incoming call screen when the device is 
locked, ensuring users don't miss important calls.
```

### 6. App Bundle

Build signed release AAB:
```bash
./gradlew bundleRelease
```

Output: `app/build/outputs/bundle/release/app-release.aab`

### 7. Testing Tracks

**Recommended rollout:**
1. Internal testing (team only)
2. Closed testing (500-1000 users)
3. Open testing (public beta)
4. Production (staged rollout 10% → 50% → 100%)

---

## Common Rejection Reasons & Fixes

### 1. Permission Declarations
**Issue**: Missing justification for sensitive permissions
**Fix**: Complete Data Safety form with detailed explanations

### 2. Foreground Service
**Issue**: Improper use of foreground service
**Fix**: Ensure service only runs during active calls

### 3. Full Screen Intent
**Issue**: Missing USE_FULL_SCREEN_INTENT declaration
**Fix**: Add to manifest and explain in store listing

### 4. Background Location
**Issue**: Requesting location without clear need
**Fix**: Remove location permissions if not needed for calls

### 5. Phone Permission
**Issue**: Missing BIND_TELECOM_CONNECTION_SERVICE
**Fix**: Ensure proper Telecom integration is documented

---

## Post-Launch Monitoring

- Monitor crash reports in Play Console
- Track ANR rate (target: <0.47%)
- Track crash rate (target: <1.09%)
- Respond to user reviews within 24 hours
- Monitor device compatibility reports
