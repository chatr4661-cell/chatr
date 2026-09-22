# Migration roadmap

- [x] Inventory current database schema, migrations, functions, storage, auth, secrets, and app bindings
- [x] Define a non-destructive migration and cutover sequence
- [x] Assemble complete migration scripts, validation checks, and operator guide
- [x] Verify package completeness and safety

## Backend reconnection

- [x] Diagnose phone verification against the new `nuuuqazaoaozgblmvkzn` backend
- [ ] Reconnect the app safely without editing generated environment files — blocked until the new project is connected in Lovable
- [x] Confirm `firebase-phone-auth` is reachable on the selected backend
- [x] Harden web OTP formatting, reCAPTCHA reset, and Firebase error handling
- [x] Replace Android's rejected Firebase UID exchange with a verified Firebase ID token
- [ ] Verify real SMS delivery and completed sign-in with user-controlled numbers — requires live OTP tests after backend reconnection
## Chat search performance

- [x] Load and cache contacts immediately for instant local matching
- [x] Reduce online lookup delay and prevent stale results
- [x] Verify full international numbers appear immediately

