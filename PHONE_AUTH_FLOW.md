# Phone Authentication & Onboarding Flow - Chatr+

## Overview
Complete guide for the phone authentication system with PIN creation, account signup, rewards integration, and user onboarding.

## User Flow

### 1. Enter Phone Number
- User enters their phone number with country code
- System validates phone number format (10-15 digits)
- Checks if user exists in database
- Determines if new user or existing user

### 2. Create/Enter PIN
**For New Users:**
- User creates a 6-digit PIN
- Must confirm PIN by entering again
- PINs must match to proceed

**For Existing Users:**
- User enters their existing 6-digit PIN
- System validates PIN against stored credentials

### 3. Account Creation (New Users Only)
When a new user creates their account:

**Automatic Steps:**
1. ✅ User account created in Supabase Auth
   - Email: `{phone_number}@chatr.local`
   - Password: 6-digit PIN (securely hashed)

2. ✅ Profile created via database trigger (`handle_new_user`)
   - Profile entry in `profiles` table
   - Phone number stored
   - Username set to phone number

3. ✅ Welcome rewards awarded via trigger (`award_welcome_coins`)
   - 100 Chatr Coins added to `user_points` table
   - Transaction recorded in `point_transactions`
   - Welcome message: "Welcome to Chatr! 🎉 Here are your first 100 Chatr Coins!"

### 4. Onboarding Process
After successful account creation, new users see the onboarding dialog:

**Step 1: Profile Setup**
- Upload profile photo (camera or gallery)
- Enter full name (required)
- Add status message (optional, default: "Hey there! I'm using chatr.chat")

**Step 2: Referral Code (Optional)**
- Enter referral code to earn 500 bonus coins
- Referrer gets 50 coins, new user gets 25 bonus coins
- Can skip this step

**Step 3: Contact Sync (Optional)**
- Sync phone contacts to find friends on Chatr
- Requires contacts permission
- Can skip and do later

**Completion:**
- `onboarding_completed` flag set to `true`
- `profile_completed_at` timestamp recorded
- User redirected to chat interface

### 5. Login Process (Existing Users)
- Enter phone number
- Enter 6-digit PIN
- System validates credentials
- Redirects to chat (skips onboarding if already completed)

## Database Schema

### profiles table
```sql
- id: UUID (primary key, references auth.users)
- phone_number: TEXT (unique, indexed)
- username: TEXT
- avatar_url: TEXT
- full_name: TEXT
- status_message: TEXT
- onboarding_completed: BOOLEAN (default: false)
- profile_completed_at: TIMESTAMP
```

### user_points table
```sql
- user_id: UUID (references profiles.id)
- balance: INTEGER (current coins)
- lifetime_earned: INTEGER (total earned)
```

### point_transactions table
```sql
- user_id: UUID
- amount: INTEGER
- transaction_type: ENUM ('earn', 'spend')
- source: TEXT (e.g., 'signup_bonus', 'referral')
- description: TEXT
- created_at: TIMESTAMP
```

## Triggers & Functions

### handle_new_user() Trigger
**Fires on:** INSERT to auth.users table
**Purpose:** Automatically create user profile

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE PROCEDURE handle_new_user();
```

### award_welcome_coins() Trigger
**Fires on:** INSERT to profiles table
**Purpose:** Award 100 welcome coins to new users

```sql
-- Awards coins and records transaction
INSERT INTO user_points (user_id, balance, lifetime_earned)
VALUES (NEW.id, 100, 100);

INSERT INTO point_transactions (...)
VALUES (..., 'signup_bonus', 'Welcome to Chatr!');
```

## Rewards Integration

### Welcome Bonus
- **Amount:** 100 Chatr Coins
- **Trigger:** Automatic on account creation
- **Source:** `signup_bonus`
- **Description:** "Welcome to Chatr! 🎉 Here are your first 100 Chatr Coins!"

### Referral Rewards
- **Referrer:** 50 coins
- **New User:** 25 bonus coins (in addition to 100 welcome coins)
- **Total for new user with referral:** 125 coins
- **Processed by:** `process-referral` edge function

### Points Usage
Users can spend Chatr Coins on:
- Mini apps purchases
- Premium features
- Stickers and themes
- In-app services
- Donations to content creators

## Security Features

### Input Validation
- Phone number validated with zod schema
- Only numeric digits allowed in PIN
- PIN must be exactly 6 digits
- Phone number: 10-15 digits

### PIN Security
- PIN stored as hashed password in Supabase Auth
- Never logged or exposed in plain text
- Secure comparison on login

### Phone Number Normalization
- Country code prefixed
- Stored in normalized format
- Indexed for fast lookup

## Error Handling

### Account Creation Failures
1. **User already exists:**
   - Automatically switches to login flow
   - Shows "Account Found, logging you in..."

2. **Profile creation failed:**
   - Manual profile creation as fallback
   - Ensures user can still access app

3. **Invalid phone number:**
   - Shows validation error
   - Clear message about format requirements

4. **PIN mismatch:**
   - Returns to PIN creation step
   - Clears both PIN entries
   - Shows "PINs Don't Match" message

## Testing Checklist

### New User Flow
- [ ] Enter valid phone number
- [ ] Create 6-digit PIN
- [ ] Confirm PIN matches
- [ ] Account created successfully
- [ ] 100 welcome coins awarded
- [ ] Onboarding dialog appears
- [ ] Can complete onboarding
- [ ] Can skip onboarding
- [ ] Redirects to chat after completion

### Existing User Flow
- [ ] Enter registered phone number
- [ ] Enter correct PIN
- [ ] Login successful
- [ ] No onboarding shown
- [ ] Redirects to chat

### Error Cases
- [ ] Invalid phone number format shows error
- [ ] PIN mismatch shows error and resets
- [ ] Network errors handled gracefully
- [ ] Duplicate account detection works

## Common Issues & Solutions

### Issue: Account created but no coins
**Solution:** Check `award_welcome_coins()` trigger is active
```sql
-- Verify trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_profile_created';
```

### Issue: Onboarding not showing
**Solution:** Check `onboarding_completed` flag
```sql
UPDATE profiles 
SET onboarding_completed = false 
WHERE id = 'user-id';
```

### Issue: Phone number format issues
**Solution:** Use `normalizePhoneNumber()` utility
- Ensures consistent format: `+919876543210`
- Removes spaces and special characters

### Issue: Friends can't create accounts
**Possible causes:**
1. Network connectivity issues
2. Supabase auth configuration (check email auto-confirm)
3. Trigger failures (check logs)
4. RLS policies blocking inserts

**Debug steps:**
1. Check auth logs for sign-up events
2. Verify triggers are active
3. Check RLS policies on `profiles` table
4. Enable email auto-confirm in Supabase dashboard

## Next Steps

1. **Add SMS verification** (optional enhancement)
2. **Implement forgot PIN** flow
3. **Add biometric authentication** for quick login
4. **Track onboarding completion rates**
5. **A/B test referral incentives**

## Resources
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Database Triggers](https://supabase.com/docs/guides/database/postgres/triggers)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
