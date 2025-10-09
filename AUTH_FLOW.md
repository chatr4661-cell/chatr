# Chatr Authentication Flow

## Overview
Chatr uses a phone-based authentication system with PIN security for quick access. Sessions persist until logout.

## User Registration Flow

1. **Enter Phone Number**
   - User enters 10-digit phone number (NO country code required)
   - Example: `9876543210`
   - System normalizes by removing spaces/dashes

2. **Create PIN**
   - User creates a 4-digit PIN for this device
   - PIN is hashed and stored securely in `device_sessions` table
   - Device fingerprint is captured for device-specific authentication

3. **Profile Creation**
   - Username auto-generated as `User_<last4digits>`
   - User can update profile later
   - Dummy email created: `{phone}@chatr.local`

4. **Access Platform**
   - See all users on platform (Global Contacts)
   - Add contacts manually or sync from phone
   - Start messaging immediately

## Login Flow (Returning Users)

1. **Enter Phone Number**
   - User enters their registered phone number

2. **Enter PIN**
   - User enters their 4-digit PIN for this device
   - System verifies against stored hash for this device

3. **Session Restored**
   - User is logged in
   - Session persists until explicit logout

## Forgot PIN / Account Recovery

1. **User taps "Forgot PIN?"**
   - Offered "Recover via Google Sign-In" option

2. **Google Sign-In**
   - User signs in with Google account
   - System fetches their existing Chatr profile

3. **PIN Reset**
   - User can set up a new PIN for current device
   - Previous device PINs remain unchanged

## Session Management

- **Session Persistence**: Session stays active until user explicitly logs out
- **Multi-Device**: Each device has its own PIN
- **Auto-Login**: If session exists, user goes directly to app

## Contact Management

Users can add contacts via:
- 📱 **Phone Sync**: Auto-sync contacts from device (native apps)
- 📱 **WhatsApp**: Invite via WhatsApp with deep link
- 💬 **SMS**: Send SMS invitation
- 📧 **Email**: Send email invitation  
- ✈️ **Telegram**: Share via Telegram
- ✋ **Manual**: Enter phone/email/username directly

## Security Features

- ✅ PIN hashed with bcrypt (10 rounds)
- ✅ Device fingerprinting for device-specific auth
- ✅ Session tokens stored securely
- ✅ Phone numbers hashed for privacy (SHA-256)
- ✅ Rate limiting on login attempts (5 attempts, 15-min lockout)
- ✅ Row-Level Security (RLS) on all tables

## Database Changes

All previous user data has been cleared for fresh start. Database now:
- Removes country code requirements
- Simplified phone normalization (removes spaces/dashes only)
- Device-specific PIN storage
- Google OAuth recovery support
