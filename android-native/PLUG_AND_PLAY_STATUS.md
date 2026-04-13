# CHATR Android Native — Plug & Play Guide

## ✅ 100% READY — Just 3 Steps

### Step 1: Clone & Open
```bash
git clone <your-github-repo>
cd android-native
```
Open `android-native/` folder in **Android Studio** (Arctic Fox or newer).

### Step 2: Add Firebase
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project → Add Android app → Package: `com.chatr.app`
3. Download `google-services.json`
4. Place it in `android-native/app/google-services.json`

### Step 3: Build & Run
Click ▶️ **Run** in Android Studio. That's it!

---

## What's Pre-Configured

| Component | Status | Details |
|-----------|--------|---------|
| **Supabase Backend** | ✅ Pre-filled | URL + Anon Key in `SupabaseConfig.kt` |
| **Auth (Phone OTP)** | ✅ Ready | Firebase OTP → Supabase session |
| **Realtime Messaging** | ✅ Ready | Supabase Realtime channels |
| **WebRTC Calling** | ✅ Ready | 4K video, STUN/TURN, ICE restart |
| **Push Notifications** | ✅ Ready | FCM with call/message channels |
| **System Dialer** | ✅ Ready | TelecomManager CALL_PROVIDER |
| **Offline Caching** | ✅ Ready | Room DB + DataStore |
| **Biometric Auth** | ✅ Ready | Fingerprint/Face unlock |
| **Contact Sync** | ✅ Ready | System contacts → CHATR |
| **E2E Encryption** | ✅ Ready | Signal Protocol key exchange |
| **Crowd Caller ID** | ✅ Ready | Community spam reporting |

---

## Architecture

```
android-native/
├── app/
│   ├── src/main/
│   │   ├── java/com/chatr/app/
│   │   │   ├── config/          → SupabaseConfig (plug & play)
│   │   │   ├── di/              → Hilt modules (Supabase, WebRTC, Firebase)
│   │   │   ├── data/            → Repositories, Room DB, API
│   │   │   ├── domain/          → Interfaces (Auth, Chat, Call)
│   │   │   ├── ui/              → Compose screens & components
│   │   │   │   ├── screens/     → All 17+ screens
│   │   │   │   ├── components/  → Reusable UI parts
│   │   │   │   └── theme/       → CHATR purple theme
│   │   │   ├── viewmodel/       → 18 ViewModels
│   │   │   ├── webrtc/          → WebRTC engine + audio routing
│   │   │   ├── calling/         → TelecomManager + foreground service
│   │   │   ├── notification/    → FCM service + channels
│   │   │   ├── navigation/      → NavHost with 30+ routes
│   │   │   └── sync/            → Background sync + network recovery
│   │   └── res/
│   │       ├── values/          → Colors, strings, themes
│   │       ├── drawable/        → Icons & vectors
│   │       └── xml/             → Network config, backup rules
│   ├── build.gradle.kts         → Dependencies & signing
│   └── proguard-rules.pro       → R8 optimization rules
├── gradle/
│   └── libs.versions.toml       → Version catalog
├── build.gradle.kts             → Root plugins
├── settings.gradle.kts          → Repository config
└── gradlew                      → Gradle wrapper
```

---

## Screens (Native Compose)

| Screen | Route | Description |
|--------|-------|-------------|
| Home Dashboard | `home` | Quick actions + ecosystem grid |
| Chats List | `chats` | All conversations with search |
| Chat Detail | `chat/{id}` | Messages, media, reactions |
| Contacts | `contacts` | Synced contacts + CHATR users |
| Calls | `calls` | History + missed calls |
| Video Call | `call/ongoing/{id}` | 4K WebRTC with PIP |
| Voice Call | `call/ongoing/{id}` | HD audio with routing |
| Auth | `auth` | Phone OTP login |
| Settings | `settings` | Profile, privacy, notifications |
| AI Assistant | `ai` | AI chat interface |
| Games | `games` | Mini-games hub |
| Health Hub | `health` | Wellness tracking |
| Food | `food` | Food ordering |
| Local Jobs | `jobs` | Job listings |
| Wallet | `wallet` | Chatr coins & payments |
| Stories | `stories` | Status/story feature |
| Dhandha | `dhandha` | Business ecosystem |
| Profile | `profile` | User profile management |
| PIN Screen | `pin` | Security PIN |

---

## Release Build

```bash
# 1. Create keystore (one-time)
keytool -genkey -v -keystore chatr-release.keystore \
  -alias chatr -keyalg RSA -keysize 2048 -validity 10000

# 2. Add to local.properties
KEYSTORE_PATH=../chatr-release.keystore
KEYSTORE_PASSWORD=your_password
KEY_ALIAS=chatr
KEY_PASSWORD=your_key_password

# 3. Build release APK
./gradlew assembleRelease

# Output: app/build/outputs/apk/release/app-release.apk
```

---

## Play Store Checklist

- [ ] `google-services.json` added
- [ ] Release keystore created
- [ ] App icons generated (all densities)
- [ ] Privacy policy URL set
- [ ] Store listing screenshots captured
- [ ] VoIP disclaimer added: *"CHATR is a VoIP app and does not replace your mobile carrier"*
- [ ] Contacts permission marked as optional

---

## Only Manual Step Required

**Add `google-services.json`** — Everything else is pre-configured and ready to compile.
