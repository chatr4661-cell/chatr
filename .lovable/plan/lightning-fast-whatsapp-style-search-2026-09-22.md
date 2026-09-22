# Lightning-fast WhatsApp-style search

## What will change
- Show matching chats and saved contacts immediately from local data as the user types.
- Show a valid entered phone number immediately, without waiting for the online user lookup.
- Load contacts alongside conversations instead of delaying them by one second.
- Shorten the online lookup delay and prevent older slow responses from replacing newer results.
- Cache the user’s contact list on-device so repeat visits feel instant, while refreshing it quietly.

## Verification
- Check full international numbers such as `+91…`, names, and partial numbers.
- Confirm the loading state never hides immediate local or unknown-number results.
- Run the TypeScript check and verify the search visually in desktop and mobile-sized views.

## Technical details
- Limit changes to the existing chat search component.
- Preserve the existing database search, permissions, and conversation-creation behavior.
