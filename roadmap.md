# Migration roadmap

- [x] Inventory current database schema, migrations, functions, storage, auth, secrets, and app bindings
- [x] Define a non-destructive migration and cutover sequence
- [x] Assemble complete migration scripts, validation checks, and operator guide
- [x] Verify package completeness and safety

## Backend reconnection

- [x] Diagnose phone verification against the new `nuuuqazaoaozgblmvkzn` backend
- [ ] Reconnect the app safely without editing generated environment files — blocked until the new project is connected in Lovable
- [ ] Deploy `firebase-phone-auth` and verify OTP sign-in — blocked because the function returns 404 on the new backend
- [ ] Verify Firebase OTP delivery works for every valid E.164 phone number, not only the reported account
