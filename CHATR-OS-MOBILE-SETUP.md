# CHATR OS - Mobile Deep Linking Setup

## ✅ What's Already Done

1. **Web Layer**
   - `/os-home` route created as the main OS entry point
   - Authenticated users automatically redirected to OS Home
   - Global gesture handler for AppSwitcher (swipe up from bottom)
   - Deep link manager integrated with Capacitor plugin
   - MiniAppsStore migrated to use `appLifecycleManager`

2. **Android Native**
   - `DeepLinkHandler.kt` plugin created
   - AndroidManifest.xml updated with `chatr://` and `chatrplus://` intent filters
   - Deep links will be forwarded to web layer automatically

3. **Capacitor Plugin**
   - TypeScript plugin interface created in `src/plugins/DeepLinkHandler/`
   - Web fallback implementation provided
   - Auto-registered with Capacitor

## 🔧 Setup Required (For Native Apps)

### After Exporting to GitHub:

1. **Initialize Capacitor** (if not done yet):
```bash
npm install
npx cap init
```

2. **Add Android Platform**:
```bash
npx cap add android
```

3. **Copy Native Files**:
   - The `DeepLinkHandler.kt` plugin needs to be copied to the Android project
   - AndroidManifest changes need to be synced

4. **Sync Capacitor**:
```bash
npx cap sync android
```

5. **Build & Test**:
```bash
npx cap run android
```

### Test Deep Linking:

On Android device/emulator, run:
```bash
adb shell am start -W -a android.intent.action.VIEW -d "chatr://app/mini-apps-store"
```

On iOS (once set up):
```bash
xcrun simctl openurl booted "chatr://app/mini-apps-store"
```

## 📱 Deep Link Format

```
chatr://[host]/[path]?[params]

Examples:
- chatr://app/mini-apps-store  → Launch mini apps store
- chatr://chat/123             → Open chat conversation
- chatr://browser/https://...  → Open URL in browser
- chatr://profile/456          → View user profile
```

## 🎯 What Works Now

✅ Web: Deep linking works via hash navigation
✅ Authentication redirects to OS Home
✅ AppSwitcher gesture (swipe up) works globally
✅ MiniAppsStore installs apps to CHATR OS layer
✅ Apps launch via `appLifecycleManager`

## 🚧 Still TODO (For Full Native Support)

- [ ] iOS deep linking configuration (Info.plist)
- [ ] Register Capacitor plugin properly in native code
- [ ] Test on physical devices
- [ ] Add Universal Links support (https:// fallback)
