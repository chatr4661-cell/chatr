# CHATR Android Native - Device Compatibility Matrix

## Tested Devices & Known Issues

### Tier 1: Full Support (Excellent)
These devices work reliably with minimal configuration.

| Device | OS Version | Status | Notes |
|--------|------------|--------|-------|
| Google Pixel 6/7/8 | Android 12+ | ✅ Full | Reference device, no issues |
| Motorola Edge/G series | Android 11+ | ✅ Full | Excellent background handling |
| Nokia (Android One) | Android 11+ | ✅ Full | Stock Android, reliable |

### Tier 2: Good Support (Minor Issues)
These devices work well with user-granted permissions.

| Device | OS Version | Status | Notes |
|--------|------------|--------|-------|
| Samsung Galaxy S21+ | Android 12+ | ⚠️ Good | Disable "Adaptive battery" for reliability |
| Samsung Galaxy A series | Android 11+ | ⚠️ Good | Add to "Never sleeping apps" |
| OnePlus 9/10/11 | Android 12+ | ⚠️ Good | Disable battery optimization |

### Tier 3: Requires Configuration
These devices need specific settings enabled.

| Device | OS Version | Status | Required Settings |
|--------|------------|--------|-------------------|
| Xiaomi/Redmi/POCO | MIUI 13+ | ⚠️ Config | Enable Autostart, Lock in recents |
| OPPO/Realme | ColorOS 12+ | ⚠️ Config | Enable Auto-start, Background activity |
| Vivo | Funtouch 12+ | ⚠️ Config | Enable High background power |
| Huawei | EMUI 12+ | ⚠️ Config | Manage manually, all toggles ON |

### Tier 4: Limited Support
These devices have known limitations.

| Device | OS Version | Status | Limitations |
|--------|------------|--------|-------------|
| Huawei (no GMS) | Any | ❌ Limited | No FCM, push may fail |
| Very old devices | Android < 10 | ❌ Limited | Missing Telecom APIs |

---

## Known Issues & Workarounds

### Issue: Calls don't ring when app is killed
**Affected**: Xiaomi, OPPO, Vivo, OnePlus, Huawei
**Solution**: 
1. Enable Autostart permission
2. Disable battery optimization
3. Lock app in recent apps (swipe down on card)

### Issue: Call notification doesn't show on lock screen
**Affected**: Samsung with One UI
**Solution**:
1. Settings → Lock Screen → Notifications → Show content
2. Enable "Show as always" for Chatr

### Issue: Audio cuts out during call
**Affected**: Devices with aggressive Doze
**Solution**:
1. Disable battery optimization for Chatr
2. Enable "Allow background activity"

### Issue: Bluetooth audio doesn't connect
**Affected**: Android 12+ devices
**Solution**:
1. Grant "Nearby devices" permission
2. Ensure Bluetooth connect permission granted

---

## Play Store Compliance Checklist

### Required Declarations

- [x] `FOREGROUND_SERVICE` - For ongoing calls
- [x] `FOREGROUND_SERVICE_PHONE_CALL` - Call type service
- [x] `USE_FULL_SCREEN_INTENT` - Incoming call UI
- [x] `READ_PHONE_STATE` - Call management
- [x] `ANSWER_PHONE_CALLS` - Accept calls programmatically
- [x] `MANAGE_OWN_CALLS` - Telecom framework

### Permission Justifications (for Play Console)

1. **Phone permissions**: Required to integrate with device's calling system and manage VoIP calls through Android Telecom Framework.

2. **Microphone**: Required to capture user's voice during audio and video calls.

3. **Camera**: Required for video calling functionality.

4. **Foreground Service**: Required to maintain active call connections when app is in background.

5. **Full Screen Intent**: Required to display incoming call UI when device is locked.

6. **Contacts**: Optional, used to display caller names and enable calling contacts.

7. **Notifications**: Required to alert users of incoming calls and messages.

### Privacy Policy Requirements

- Explain call data handling
- Explain audio/video data transmission
- Describe data encryption practices
- List third-party services (WebRTC, signaling server)
- Provide data deletion instructions

---

## Testing Checklist

### Core Functionality
- [ ] Outgoing audio call connects
- [ ] Incoming audio call rings
- [ ] Outgoing video call connects
- [ ] Incoming video call rings
- [ ] Call appears in system call log
- [ ] Bluetooth audio routing works
- [ ] Speaker toggle works
- [ ] Mute toggle works

### Background Behavior
- [ ] Call rings when app is minimized
- [ ] Call rings when app is killed
- [ ] Call rings on lock screen
- [ ] Call survives screen off
- [ ] Call survives network switch

### Edge Cases
- [ ] Call behavior during another call
- [ ] Call behavior during alarm
- [ ] Call behavior during media playback
- [ ] Call with low battery
- [ ] Call with poor network

---

## Minimum Requirements

- Android 10 (API 29) or higher
- Google Play Services (for FCM)
- Microphone hardware
- Camera hardware (for video calls)
- Internet connection

## Recommended

- Android 12 or higher
- 4GB+ RAM
- Stable WiFi or 4G/5G connection
