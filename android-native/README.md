# CHATR Native Mobile Apps

This repository contains the fully native Android and iOS implementations of the CHATR application.

## Project Structure

```
├── android-native/          # Native Android app (Kotlin + Jetpack Compose)
│   └── app/
│       ├── src/main/java/com/chatr/app/
│       │   ├── ui/
│       │   │   ├── screens/      # All screen implementations
│       │   │   ├── components/   # Reusable UI components
│       │   │   └── theme/        # App theming (colors, typography)
│       │   ├── MainActivity.kt
│       │   └── AppModule.kt
│       └── build.gradle.kts
│
└── ios-native/              # Native iOS app (Swift + SwiftUI)
    └── CHATR/
        ├── CHATR/
        │   ├── Views/           # All screen views
        │   ├── Components/      # Reusable UI components
        │   ├── Theme/           # App theming (colors)
        │   ├── Models/          # Data models
        │   └── CHATRApp.swift
        └── CHATR.xcodeproj
```

## Android Setup

### Prerequisites
- Android Studio Hedgehog (2023.1.1) or later
- JDK 17
- Android SDK 34

### Steps
1. Open `android-native/` in Android Studio
2. Sync Gradle
3. Add `google-services.json` to `app/` directory
4. Create `local.properties`:
   ```properties
   sdk.dir=/path/to/Android/sdk
   ```
5. Build and run on emulator or device

## iOS Setup

### Prerequisites
- macOS 13.0 or later
- Xcode 15.0 or later
- CocoaPods or Swift Package Manager

### Steps
1. Open `ios-native/CHATR/CHATR.xcodeproj` in Xcode
2. Add `GoogleService-Info.plist` to the project
3. Select your development team in Signing & Capabilities
4. Build and run on simulator or device

## Features Implemented

### Phase 1 ✅
- [x] Project structure setup
- [x] Theme system (colors, typography)
- [x] Bottom navigation
- [x] Home screen with ecosystem grid
- [x] Chats list screen
- [x] Reusable components (SearchBar, EcosystemCard, ChatRow)

### Phase 2 (In Progress)
- [ ] Calls screen
- [ ] Contacts screen
- [ ] Settings screen
- [ ] Chat detail screen
- [ ] Native WebRTC calling
- [ ] Firebase push notifications
- [ ] Supabase integration

### Phase 3 (Planned)
- [ ] Background tasks
- [ ] Contacts sync
- [ ] Location services
- [ ] File storage
- [ ] End-to-end encryption

## Configuration

### Supabase
Create `Config.kt` (Android) and `Config.swift` (iOS):

```kotlin
// Android: app/src/main/java/com/chatr/app/Config.kt
object Config {
    const val SUPABASE_URL = "https://sbayuqgomlflmxgicplz.supabase.co"
    const val SUPABASE_ANON_KEY = "your-anon-key"
}
```

```swift
// iOS: CHATR/Config.swift
enum Config {
    static let supabaseURL = "https://sbayuqgomlflmxgicplz.supabase.co"
    static let supabaseAnonKey = "your-anon-key"
}
```

## Development Guidelines

1. **UI Consistency**: Match the web app exactly - same colors, spacing, fonts
2. **Performance**: Target 60+ FPS, <1s cold start
3. **Native Features**: Use platform-specific APIs (CallKit, Telecom API)
4. **Testing**: Write unit tests for business logic, UI tests for critical flows

## License

Proprietary - All rights reserved
