# Fix PWA host split and stale service worker

## What will change
- Make the web manifest explicitly same-origin by using `./` URLs and a path-based app ID, so it works on both the apex and `www` host without invalid cross-origin resolution.
- Remove the duplicate inline service-worker registrar and keep one guarded registration path in the React app.
- Prevent service-worker registration on `www.chatr.chat`, unregister any legacy `www` worker, and redirect the browser to the canonical `https://chatr.chat` host before registration.
- Replace the existing app-shell cache worker with a one-release cleanup worker that removes only CHATR/Workbox app caches and unregisters itself, eliminating stale HTML/chunk failures permanently while preserving messaging workers.

## Verification
- Build the production bundle and inspect the generated manifest and HTML.
- Test the app at desktop and mobile viewport sizes.
- Confirm the manifest has no scope/action warnings and no `/sw.js` redirect registration attempt.

## Technical details
- Preserve push/messaging worker files and notification behavior; only the stale app-shell worker at `/sw.js` is retired.
- Keep installability through the manifest and icons; offline app-shell caching is removed because it caused stale deployments.
