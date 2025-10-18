# Google Authentication Setup Guide

## Overview
Google login is now enabled in Chatr+ with the following features:
- ✅ One Google account → One Chatr account
- ✅ Works seamlessly with phone-based authentication
- ✅ Automatic profile creation via database trigger
- ✅ Full integration with mini apps and all features
- ✅ Secure session management

## How It Works

### 1. **User Flow**
```
User clicks "Continue with Google" 
→ Redirects to Google OAuth 
→ User authorizes 
→ Redirects back to Chatr 
→ Session created automatically 
→ Profile created by database trigger 
→ User can access all features (chat, mini apps, etc.)
```

### 2. **Database Integration**
The `handle_new_user()` trigger automatically creates a profile when a Google user signs up:

```sql
-- Extracts user data from Google OAuth
- Email: from Google account
- Username: from Google full_name or email
- Avatar: from Google profile picture
- Google ID: stored for reference
```

### 3. **Session Management**
- Sessions work identically for both phone and Google users
- Mini apps use `supabase.auth.getUser()` which works for all auth types
- SSO tokens work across authentication methods

## Technical Details

### Authentication Flow

**Phone Auth:**
```typescript
Phone → Verify → Create PIN → Account Created
```

**Google Auth:**
```typescript
Google Button → OAuth → Auto Profile Creation → Logged In
```

### Profile Creation
The database trigger `handle_new_user()` ensures:
- ✅ Profile is created automatically
- ✅ Username defaults to Google name or email
- ✅ Avatar URL from Google profile
- ✅ Email stored and verified
- ✅ Google provider ID tracked

### Mini Apps Integration
All mini apps work seamlessly because they use:
```typescript
const { data: { user } } = await supabase.auth.getUser();
```

This returns the authenticated user regardless of auth method.

## Security Features

### One Account Per Google Email
- Google emails are unique by design
- Database enforces uniqueness on `profiles.email`
- Prevents multiple accounts with same Google account

### Session Security
- Sessions expire after inactivity
- Refresh tokens handled automatically
- Secure storage in localStorage

### Provider Tracking
- System knows which auth method was used
- Can implement provider-specific features later
- Audit trail for security

## Configuration Required

### In Lovable Cloud Backend:
1. Go to Users → Auth Settings
2. Enable Google provider
3. Configure:
   - ✅ Site URL: `https://chatr.chat`
   - ✅ Redirect URLs: `https://chatr.chat/auth`

### For Testing:
- Google OAuth requires HTTPS in production
- Use staging URLs for testing
- Verify redirect URLs match exactly

## User Experience

### First Time Google Users
1. Click "Continue with Google"
2. Choose Google account
3. Authorize Chatr+
4. Automatically logged in
5. Can use all features immediately

### Returning Google Users
1. Click "Continue with Google"
2. Instantly logged in (if session exists)
3. No additional steps needed

### Mixed Auth (Phone + Google)
- Users can have ONE account per phone number
- Users can have ONE account per Google email
- These are separate accounts (by design)

## Debugging

### Console Logs
The app logs auth events:
```
[AUTH] Google sign-in initiated
[AUTH] Active session found
[AUTH] Profile found: username@example.com
```

### Common Issues

**"Sign in failed"**
- Check Google OAuth is enabled in backend
- Verify redirect URLs are correct
- Ensure HTTPS in production

**"No profile found"**
- Database trigger should create profile automatically
- Check if `handle_new_user()` trigger exists
- Verify RLS policies allow profile creation

**Mini apps not working**
- Verify user session with `supabase.auth.getUser()`
- Check console for auth errors
- Ensure user is authenticated

## Future Enhancements

### Potential Features
- [ ] Link phone number to Google account
- [ ] Switch between auth methods
- [ ] Account recovery via Google
- [ ] Multi-device sync with Google
- [ ] Google Drive backup integration

### Security Improvements
- [ ] Two-factor authentication
- [ ] Login attempt monitoring
- [ ] Suspicious activity alerts
- [ ] Session device management

## Testing Checklist

- [ ] Google sign-in button appears
- [ ] Clicking redirects to Google
- [ ] Authorization screen shows
- [ ] Redirect back to app works
- [ ] Profile created automatically
- [ ] User can access chat
- [ ] Mini apps work correctly
- [ ] Session persists on refresh
- [ ] Logout works properly
- [ ] Can sign in again

## Support

For issues:
1. Check console logs for `[AUTH]` messages
2. Verify session: `supabase.auth.getSession()`
3. Check profile: Query `profiles` table
4. Test with different Google accounts
5. Verify redirect URLs in backend settings
