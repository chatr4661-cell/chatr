# CHATR Android Native Implementation Documentation

> **Complete Technical Reference for Native Android App (Kotlin + Jetpack Compose)**

**Version:** 2.0.0  
**Last Updated:** 2026-01-26  
**Package:** `com.chatr.app`

---

## 📁 Project Structure Overview

```
android-native/
├── app/
│   ├── src/main/java/com/chatr/app/
│   │   │
│   │   ├── 📱 CORE APPLICATION
│   │   ├── ChatrApplication.kt          # Application class with Hilt + Notification channels
│   │   ├── MainActivity.kt              # Main entry point with WebView bridge
│   │   └── WebAppInterface.kt           # JavaScript bridge for hybrid features
│   │   │
│   │   ├── 🎨 UI LAYER (ui/)
│   │   │   ├── screens/                 # All screen implementations
│   │   │   │   ├── dashboard/           # Dashboard & feature screens
│   │   │   │   └── *.kt                 # Individual screens
│   │   │   ├── components/              # Reusable UI components
│   │   │   ├── activities/              # Activity classes
│   │   │   ├── call/                    # Call UI components
│   │   │   ├── navigation/              # UI navigation helpers
│   │   │   └── theme/                   # App theming (colors, typography)
│   │   │
│   │   ├── 🧭 NAVIGATION (navigation/)
│   │   │   ├── ChatrNavHost.kt          # Main navigation host with 30+ routes
│   │   │   ├── NavGraph.kt              # Route definitions & sealed classes
│   │   │   └── DeepLinkHandler.kt       # 120+ deep link handlers
│   │   │
│   │   ├── 🧠 VIEWMODELS (viewmodel/)
│   │   │   └── *ViewModel.kt            # 18 ViewModels for state management
│   │   │
│   │   ├── 💾 DATA LAYER (data/)
│   │   │   ├── api/                     # Retrofit API interfaces
│   │   │   ├── local/                   # Room database (DAOs, entities)
│   │   │   ├── models/                  # Data models
│   │   │   ├── repository/              # 21 repositories (offline-first)
│   │   │   └── SupabaseClientProvider.kt
│   │   │
│   │   ├── 💉 DEPENDENCY INJECTION (di/)
│   │   │   ├── AppModule.kt             # General app dependencies
│   │   │   ├── NetworkModule.kt         # Retrofit, OkHttp, API clients
│   │   │   ├── DatabaseModule.kt        # Room database provider
│   │   │   ├── SupabaseModule.kt        # Supabase SDK module
│   │   │   ├── FirebaseModule.kt        # Firebase Auth & FCM
│   │   │   ├── WebRtcModule.kt          # WebRTC dependencies
│   │   │   ├── SignalingModule.kt       # Signaling dependencies
│   │   │   ├── GsmServicesModule.kt     # GSM replacement services
│   │   │   └── ViewModelModule.kt       # ViewModel bindings
│   │   │
│   │   ├── 📞 CALLING SYSTEM
│   │   │   ├── call/                    # TelecomManager integration
│   │   │   │   ├── CallManager.kt       # Central call manager
│   │   │   │   └── TelecomHelper.kt     # Telecom API helper
│   │   │   ├── calling/                 # Advanced calling features
│   │   │   │   └── service/             # Connection services
│   │   │   └── webrtc/                  # WebRTC implementation
│   │   │       ├── WebRTCManager.kt     # Main WebRTC controller
│   │   │       ├── PeerConnectionManager.kt
│   │   │       ├── MediaManager.kt      # Audio/Video management
│   │   │       ├── CallSignaling.kt     # Signaling client
│   │   │       ├── VideoRenderer.kt     # Video rendering
│   │   │       ├── TurnServerConfig.kt  # TURN/STUN configuration
│   │   │       ├── audio/               # Audio processing
│   │   │       ├── bridge/              # Native-Web bridge
│   │   │       ├── core/                # Core WebRTC utilities
│   │   │       ├── e2ee/                # End-to-end encryption
│   │   │       ├── emergency/           # Emergency call handling
│   │   │       ├── forwarding/          # Call forwarding
│   │   │       ├── group/               # Group call support
│   │   │       ├── handoff/             # Call handoff
│   │   │       ├── multidevice/         # Multi-device sync
│   │   │       ├── network/             # Network quality
│   │   │       ├── quality/             # Call quality metrics
│   │   │       ├── signaling/           # Signaling implementations
│   │   │       ├── state/               # Call state management
│   │   │       ├── timeout/             # Timeout handling
│   │   │       └── voicemail/           # Voicemail support
│   │   │
│   │   ├── 🔐 SECURITY (security/)
│   │   │   ├── BiometricAuthManager.kt  # Fingerprint/Face unlock
│   │   │   ├── E2EEncryption.kt         # Signal Protocol (X3DH + Double Ratchet)
│   │   │   ├── E2ESessionManager.kt     # Encryption session management
│   │   │   ├── EncryptionUtils.kt       # Encryption utilities
│   │   │   ├── SecureStore.kt           # Encrypted preferences
│   │   │   ├── SecureTokenManager.kt    # Token management
│   │   │   └── SSLConfig.kt             # SSL/TLS configuration
│   │   │
│   │   ├── 🔔 NOTIFICATIONS (notification/)
│   │   │   ├── ChatrFirebaseService.kt  # FCM handler (single source of truth)
│   │   │   ├── NotificationChannels.kt  # Notification channel setup
│   │   │   ├── NotificationActionReceiver.kt
│   │   │   └── BootReceiver.kt          # Boot-time initialization
│   │   │
│   │   ├── ⚙️ CONFIGURATION (config/)
│   │   │   └── SupabaseConfig.kt        # Supabase credentials (plug & play)
│   │   │
│   │   ├── 🌐 WEB INTEGRATION
│   │   │   ├── web/                     # Web utilities
│   │   │   ├── webview/                 # WebView management
│   │   │   └── websocket/               # WebSocket client
│   │   │
│   │   ├── 📱 PLATFORM FEATURES
│   │   │   ├── contacts/                # Contact sync
│   │   │   ├── media/                   # Media handling
│   │   │   ├── oem/                     # OEM-specific optimizations
│   │   │   ├── onboarding/              # Onboarding flow
│   │   │   ├── os/                      # OS integrations
│   │   │   ├── performance/             # Performance monitoring
│   │   │   ├── permissions/             # Permission handling
│   │   │   ├── recovery/                # Error recovery
│   │   │   ├── service/                 # Background services
│   │   │   ├── services/                # Additional services
│   │   │   ├── sync/                    # Data synchronization
│   │   │   ├── copilot/                 # AI Copilot integration
│   │   │   ├── domain/                  # Domain layer
│   │   │   └── presentation/            # Presentation utilities
│   │   │
│   │   └── build.gradle.kts             # App-level build config
│   │
│   └── src/main/res/                    # Android resources
│       ├── values/
│       │   ├── strings.xml
│       │   ├── colors.xml
│       │   └── themes.xml
│       └── xml/
│           ├── backup_rules.xml
│           └── data_extraction_rules.xml
│
├── build.gradle.kts                     # Project-level build config
├── settings.gradle.kts                  # Gradle settings
├── gradle.properties                    # Gradle properties
└── proguard-rules.pro                   # ProGuard configuration
```

---

## 🎨 UI Screens Implementation

### Core Screens (Fully Native)

| Screen | File | Status | Data Source |
|--------|------|--------|-------------|
| **Home** | `HomeScreen.kt` | ✅ Native | Real-time profile data |
| **Chats List** | `ChatsScreen.kt` | ✅ Native | Supabase RPC |
| **Chat Detail** | `ChatDetailScreen.kt` | ✅ Native | Supabase Realtime |
| **Contacts** | `ContactsScreen.kt` | ✅ Native | Device + Supabase |
| **Calls** | `CallsScreen.kt` | ✅ Native | Supabase calls table |
| **Settings** | `SettingsScreen.kt` | ✅ Native | Local preferences |
| **Auth** | `AuthScreen.kt` | ✅ Native | Supabase Auth |
| **PIN** | `PinScreen.kt` | ✅ Native | Secure storage |
| **Splash** | `SplashScreen.kt` | ✅ Native | Local |

### Call Screens (Fully Native)

| Screen | File | Description |
|--------|------|-------------|
| **Incoming Call** | `IncomingCallScreen.kt` | Full-screen incoming call UI |
| **Ongoing Call** | `OngoingCallScreen.kt` | Active voice call interface |
| **Video Call** | `VideoCallScreen.kt` | Video call with camera switching |

### Feature Screens (Native Implementation)

| Screen | File | Category |
|--------|------|----------|
| **Dashboard** | `DashboardScreen.kt` | Main feature hub |
| **Games** | `NativeFeatureScreens.kt` | Entertainment |
| **Wallet** | `NativeFeatureScreens.kt` | Finance |
| **Health Hub** | `NativeFeatureScreens.kt` | Healthcare |
| **Food Ordering** | `NativeFeatureScreens.kt` | Services |
| **Local Jobs** | `NativeFeatureScreens.kt` | Employment |
| **Stories** | `NativeFeatureScreens.kt` | Social |
| **Profile** | `NativeFeatureScreens.kt` | User profile |

### Hybrid/WebView Screens

| Screen | File | Purpose |
|--------|------|---------|
| **WebView** | `WebViewScreen.kt` | Generic web content loader |
| **Web Auth** | `WebAuthScreen.kt` | Web-based authentication |
| **Permission Education** | `PermissionEducationScreen.kt` | Permission explanations |

---

## 🧭 Navigation Architecture

### Route Definitions (`NavGraph.kt`)

```kotlin
sealed class Screen(val route: String) {
    // Core
    object Splash : Screen("splash")
    object Auth : Screen("auth")
    object Pin : Screen("pin")
    object Home : Screen("home")
    
    // Messaging
    object Chats : Screen("chats")
    object ChatDetail : Screen("chat/{conversationId}")
    
    // Calling
    object Calls : Screen("calls")
    object IncomingCall : Screen("incoming-call/{callId}")
    object OngoingCall : Screen("ongoing-call/{callId}")
    object VideoCall : Screen("video-call/{callId}")
    
    // Features (30+ routes)
    object AIAssistant : Screen("ai")
    object Games : Screen("games")
    object Wallet : Screen("wallet")
    object HealthHub : Screen("health")
    object FoodOrdering : Screen("food")
    object LocalJobs : Screen("jobs")
    object Stories : Screen("stories")
    object Dhandha : Screen("dhandha")
    // ... and more
}
```

### Navigation Host (`ChatrNavHost.kt`)

- **30+ native routes** wired
- **Dynamic bottom navigation** visibility
- **Argument passing** for detail screens
- **Deep link support** for external navigation

---

## 🧠 ViewModels

| ViewModel | Purpose | Data Source |
|-----------|---------|-------------|
| `AuthViewModel` | Authentication state | Supabase Auth |
| `ConversationsViewModel` | Chat list | Supabase RPC |
| `ChatDetailViewModel` | Message thread | Supabase Realtime |
| `CallViewModel` | Call management | WebRTC + Supabase |
| `CallHistoryViewModel` | Call logs | Supabase calls table |
| `ContactsViewModel` | Contacts | Device + Supabase |
| `AIViewModel` | AI features | AI endpoints |
| `AIBrowserViewModel` | AI browser | AI endpoints |
| `GamesViewModel` | Games catalog | Games API |
| `PaymentsViewModel` | Wallet/Payments | Payments API |
| `LocationViewModel` | Location services | GPS + Supabase |
| `NotificationsViewModel` | Notifications | FCM + Supabase |
| `SearchViewModel` | Search | Supabase |
| `SocialViewModel` | Social features | Social API |
| `StealthModeViewModel` | Privacy mode | Local |
| `StudioViewModel` | Media studio | Storage API |
| `ChatrWorldViewModel` | Discover | World API |

---

## 💾 Data Layer

### Repositories (21 Total)

| Repository | Function |
|------------|----------|
| `SupabaseAuthRepository` | Auth with Supabase SDK |
| `SupabaseChatRepository` | Real-time messaging |
| `SupabaseRpcRepository` | RPC function calls |
| `AuthRepository` | Authentication flows |
| `ChatRepository` | Chat operations |
| `CallsRepository` | Call history |
| `ContactsRepository` | Contact management |
| `MessageRepository` | Message CRUD |
| `AiRepository` | AI operations |
| `AIBrowserRepository` | AI browser |
| `GamesRepository` | Games data |
| `PaymentsRepository` | Payment processing |
| `LocationRepository` | Location data |
| `NotificationsRepository` | Notification handling |
| `SearchRepository` | Search operations |
| `SocialRepository` | Social features |
| `StealthModeRepository` | Stealth mode |
| `StudioRepository` | Media studio |
| `ChatrWorldRepository` | Discovery |

### API Interfaces

Located in `data/api/`:
- `ChatrApi.kt` - Core API
- `AIApi.kt` - AI endpoints
- `AIBrowserApi.kt` - AI browser
- `CallsApi.kt` - Calls API
- `ContactsApi.kt` - Contacts API
- `GamesApi.kt` - Games API
- `PaymentsApi.kt` - Payments API
- And 7 more...

---

## 📞 WebRTC Calling System

### Core Components

```
webrtc/
├── WebRTCManager.kt          # Main controller
├── PeerConnectionManager.kt   # ICE, SDP handling
├── MediaManager.kt           # Audio/Video tracks
├── CallSignaling.kt          # REST-based signaling
├── VideoRenderer.kt          # Video rendering
└── TurnServerConfig.kt       # TURN/STUN servers
```

### Advanced Features

| Module | Purpose |
|--------|---------|
| `audio/` | Audio processing, noise cancellation |
| `bridge/` | Native-Web bridge communication |
| `core/` | Core WebRTC utilities |
| `e2ee/` | End-to-end encryption for calls |
| `emergency/` | Emergency call handling |
| `forwarding/` | Call forwarding logic |
| `group/` | Group call support |
| `handoff/` | Call handoff between devices |
| `multidevice/` | Multi-device synchronization |
| `network/` | Network quality monitoring |
| `quality/` | Call quality metrics |
| `signaling/` | Signaling implementations |
| `state/` | Call state management (11 states) |
| `timeout/` | Timeout handling |
| `voicemail/` | Voicemail support |

### Call State Flow

```
IDLE → INITIATING → RINGING → CONNECTING → CONNECTED
                                    ↓
                              RECONNECTING
                                    ↓
                               ENDING → ENDED
                               
Special States: PROXY_MODE, PROXY_CONNECTED, ON_HOLD
```

---

## 🔐 Security Implementation

| Component | Technology | Purpose |
|-----------|------------|---------|
| `E2EEncryption.kt` | Signal Protocol | Message encryption |
| `E2ESessionManager.kt` | X3DH + Double Ratchet | Key exchange |
| `BiometricAuthManager.kt` | BiometricPrompt | Fingerprint/Face |
| `SecureStore.kt` | EncryptedSharedPreferences | Secure storage |
| `SecureTokenManager.kt` | Android Keystore | Token security |
| `SSLConfig.kt` | Certificate pinning | Network security |

---

## 💉 Dependency Injection (Hilt)

### Modules

| Module | Provides |
|--------|----------|
| `AppModule` | Application-level dependencies |
| `NetworkModule` | Retrofit, OkHttp, Interceptors |
| `DatabaseModule` | Room database, DAOs |
| `SupabaseModule` | Supabase client |
| `FirebaseModule` | Firebase Auth, FCM |
| `WebRtcModule` | WebRTC dependencies |
| `SignalingModule` | Signaling client |
| `GsmServicesModule` | GSM replacement services |
| `ViewModelModule` | ViewModel bindings |

---

## 🔔 Push Notifications (FCM)

### Components

| File | Purpose |
|------|---------|
| `ChatrFirebaseService.kt` | FCM message handler (authoritative) |
| `NotificationChannels.kt` | Channel definitions |
| `NotificationActionReceiver.kt` | Action handling |
| `BootReceiver.kt` | Boot-time initialization |

### Notification Channels

- **Messages** - Chat notifications
- **Calls** - Incoming call alerts (high priority)
- **Updates** - App updates
- **Promotions** - Marketing notifications

---

## 🎨 Theme System

### Colors (`ui/theme/Color.kt`)

```kotlin
// CHATR Brand Colors (matching web)
val ChatrPurple = Color(0xFF7C3AED)
val ChatrPurpleLight = Color(0xFF8B5CF6)
val ChatrPurpleDark = Color(0xFF6D28D9)

// Gradient colors
val GradientStart = Color(0xFF7C3AED)
val GradientEnd = Color(0xFFEC4899)

// Status colors
val StatusOnline = Color(0xFF10B981)
val StatusAway = Color(0xFFF59E0B)
val StatusBusy = Color(0xFFEF4444)
```

### Typography (`ui/theme/Type.kt`)

- Display, Headline, Title, Body, Label scales
- Inter font family (matching web)

---

## 🔧 Configuration

### Supabase (`config/SupabaseConfig.kt`)

```kotlin
object SupabaseConfig {
    const val SUPABASE_URL = "https://sbayuqgomlflmxgicplz.supabase.co"
    const val SUPABASE_ANON_KEY = "eyJhbGciOi..."
    
    // Derived URLs
    val FUNCTIONS_URL = "$SUPABASE_URL/functions/v1"
    val STORAGE_URL = "$SUPABASE_URL/storage/v1"
    val REALTIME_URL = "wss://sbayuqgomlflmxgicplz.supabase.co/realtime/v1"
}
```

---

## 🚀 Build & Run

### Prerequisites

- Android Studio Hedgehog (2023.1.1)+
- JDK 17
- Android SDK 34
- Gradle 8.x

### Steps

```bash
# 1. Open project
cd android-native
# Open in Android Studio

# 2. Add Firebase config
# Copy google-services.json to android-native/app/

# 3. Sync Gradle
./gradlew build

# 4. Run
./gradlew installDebug
```

---

## 📊 Feature Completion Matrix

| Category | Native | WebView | Status |
|----------|--------|---------|--------|
| Authentication | ✅ | - | Complete |
| Messaging | ✅ | - | Complete |
| Voice Calls | ✅ | - | Complete |
| Video Calls | ✅ | - | Complete |
| Contacts | ✅ | - | Complete |
| Call History | ✅ | - | Complete |
| Settings | ✅ | - | Complete |
| Push Notifications | ✅ | - | Complete |
| Biometric Auth | ✅ | - | Complete |
| E2E Encryption | ✅ | - | Complete |
| Games | ✅ | - | UI Ready |
| Wallet | ✅ | - | UI Ready |
| Health Hub | ✅ | - | UI Ready |
| Food Ordering | ✅ | - | UI Ready |
| Local Jobs | ✅ | - | UI Ready |
| Stories | ✅ | - | UI Ready |
| Dhandha | ✅ | - | UI Ready |
| AI Assistant | ✅ | - | UI Ready |

---

## 📝 Architecture Decisions

### 1. **MVVM + Clean Architecture**
- ViewModels manage UI state
- Repositories abstract data sources
- Use cases in domain layer (where applicable)

### 2. **Offline-First**
- Room database for local caching
- Sync workers for background updates
- Optimistic UI updates

### 3. **Jetpack Compose**
- 100% Compose UI (no XML layouts)
- Material 3 design system
- Custom theming matching web

### 4. **Hilt Dependency Injection**
- Constructor injection
- Scoped modules
- Easy testing

### 5. **Coroutines + Flow**
- Reactive data streams
- Structured concurrency
- Lifecycle-aware collection

---

## ⚡ Performance Optimizations (Hybrid Integration)

The web app includes comprehensive performance optimizations that integrate with the native shell.

### Web Performance Files

| File | Purpose |
|------|---------|
| `src/utils/instantAppShell.ts` | Critical resource preloading |
| `src/utils/hybridAppOptimizations.ts` | WebView-specific optimizations |
| `src/utils/advancedCaching.ts` | Multi-layer caching (Memory + IndexedDB) |
| `src/hooks/useInstantData.ts` | Cache-first data hook |
| `src/components/InstantSkeleton.tsx` | Route-specific skeleton UIs |

### Native Performance Helpers

| File | Purpose |
|------|---------|
| `app/.../util/PerformanceHelper.kt` | WebView optimizations & bridge methods |
| `app/.../util/WebViewPreloader.kt` | Background WebView preloading |

### Key Metrics

| Metric | Before | After |
|--------|--------|-------|
| First Contentful Paint | ~2.5s | <300ms |
| Time to Interactive | ~4.5s | <1s |
| Initial Bundle | ~5MB | ~150KB |

### Usage in Native Code

```kotlin
// Preload WebView in Application.onCreate()
WebViewPreloader.init(this)

// Get performance metrics
PerformanceHelper.getWebMetrics(webView) { metrics ->
    Log.d("Perf", "FCP: ${metrics.firstPaint}ms")
}

// Navigate web app from native
PerformanceHelper.navigateWeb(webView, "/chat/$conversationId")
```

See [docs/PERFORMANCE_10X_HYBRID.md](./docs/PERFORMANCE_10X_HYBRID.md) for complete integration guide.

---

## 🔗 Related Documentation

- [docs/PERFORMANCE_10X_HYBRID.md](./docs/PERFORMANCE_10X_HYBRID.md) - **Performance optimization guide**
- [PLUG_AND_PLAY_STATUS.md](./PLUG_AND_PLAY_STATUS.md) - Quick start guide
- [NATIVE_BUILD_GUIDE.md](./NATIVE_BUILD_GUIDE.md) - Build instructions
- [ANDROID_COMPLETION_ANALYSIS.md](./ANDROID_COMPLETION_ANALYSIS.md) - Completion status
- [README.md](./README.md) - Project overview

---

**© 2026 CHATR - All Rights Reserved**
