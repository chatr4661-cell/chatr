# Android ↔ Web Unified Signaling

## Problem Fixed
Android was using a broken WebSocket-based signaling that had a no-op `connect()` method, preventing SDP/ICE exchange between platforms.

## Solution: Unified `webrtc_signals` Table Approach

Both Android and Web now use the **same signaling path**:
- **Send signals**: INSERT into `webrtc_signals` table via REST API
- **Receive signals**: Poll `webrtc_signals` table (Android) / Realtime subscription (Web)

## Files Changed

### 1. `WebRTCSignalingClient.kt`
- Rewrote to use REST API to `webrtc_signals` table instead of WebSocket
- Polls every 500ms for incoming signals
- Sends signals via POST to Supabase REST API
- Added `setUserId()`, `setPartnerId()`, `setToken()` methods

### 2. `WebRTCManager.kt`
- Added `AuthRepository` dependency for getting current user ID
- Now sets `userId`, `partnerId`, and `token` before connecting signaling
- Updated `acceptCall()` to include `callerId` parameter

### 3. `CallViewModel.kt`
- Updated `connectSignaling()` to determine partner ID from call data
- Sets token from `AuthRepository.getAccessToken()`

### 4. `TelecomWebRtcBridge.kt`
- Added optional `partnerId` parameter to `initializeCall()`

### 5. `CallActivity.kt`
- Added `callerId` extraction from intent extras
- Passes caller info to `WebViewBridgeManager.setNativeCallAccepted()`

### 6. `WebViewBridgeManager.kt`
- Enhanced `setNativeCallAccepted()` to include all call info
- Now dispatches `nativeCallAction` event with `callerId` for WebRTC partner ID

## Signal Flow

```
App → Web Call:
1. Android initiates call → creates DB record
2. Android WebRTCManager sets partnerId, userId, token
3. Android sends OFFER to webrtc_signals table
4. Web receives via Realtime, sends ANSWER
5. Android polls and receives ANSWER
6. ICE exchange → Connected

Web → App Call:
1. Web initiates call → creates DB record, sends FCM
2. Android receives FCM → shows CallActivity
3. User answers → WebViewBridgeManager dispatches nativeCallAction
4. Web GlobalCallListener receives event with callerId
5. Web sends OFFER to webrtc_signals table
6. Android polls, receives OFFER, sends ANSWER
7. ICE exchange → Connected
```
