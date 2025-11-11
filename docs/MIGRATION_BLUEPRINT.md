# Migration Blueprint — Chatr (Compact)

## Overview
- **Goal**: Incremental migration from Capacitor (React/TS) → Native Android (Kotlin + Jetpack Compose)
- **Approach**: 6 phases (Planning → Parallel UI → Incremental migration → Replace core plugins → Finalize → Release)
- **Current State**: Capacitor hybrid app (WebView) with React/TS frontend
- **Target State**: Fully native Android app with Kotlin + Jetpack Compose

## Phases

### Phase 1: Planning & Architecture ✅
- Analyze current Capacitor + React/TS structure
- Create migration blueprint and component mapping
- Design modular architecture
- Set up development branches

### Phase 2: Scaffold Compose Alongside WebView (Current Phase)
- Create `MainActivity.kt` (extends BridgeActivity to preserve Capacitor)
- Set up Material 3 theme and Compose dependencies
- Implement basic navigation (`ChatrNavHost`)
- Migrate POC screen (Dashboard)
- Validate both UIs can coexist

### Phase 3: Incremental Screen Migration
**Priority Order**:
1. Dashboard ✅ (POC done in Phase 2)
2. Authentication (Login/Signup)
3. Chat List
4. Chat Detail
5. Profile/Settings
6. Contacts
7. Location Sharing
8. Health Tracking
9. Call UI

**Process**: Create Compose UI → ViewModel → API integration → Test → Enable

### Phase 4: Replace Core Plugins
**Migration Map**:
- Push Notifications → FirebaseMessagingService
- Geolocation → FusedLocationProviderClient
- Camera → CameraX / MediaStore
- Preferences → DataStore
- Filesystem → Native File I/O
- Background Tasks → WorkManager

### Phase 5: Remove WebView & Finalize
- Switch from `BridgeActivity` to `ComponentActivity`
- Delete web assets and Capacitor dependencies
- Consolidate modules
- Final UI polish

### Phase 6: Optimize & Release
- Enable R8/ProGuard
- Performance profiling
- QA testing and accessibility audit
- Release to Google Play Store

## Component Mapping (Sample)

| React Component | Compose Equivalent | Notes |
|----------------|-------------------|-------|
| `Dashboard.tsx` | `DashboardScreen.kt` | Main home screen |
| `TopNav` | `TopAppBar` | Material 3 component |
| `IconGrid` | `LazyRow` of Cards | Horizontal scrolling |
| `ChatList.tsx` | `ChatListScreen.kt` | Conversation list |
| `Button` | `Button` / `OutlinedButton` | Material 3 variants |

## Plugin Migration (Sample)

| Capacitor Plugin | Native Replacement | Complexity |
|-----------------|-------------------|------------|
| Push Notifications | FirebaseMessagingService + WorkManager | High |
| Geolocation | FusedLocationProviderClient | Low |
| Camera | CameraX / MediaStore | Medium |
| Preferences | DataStore / Room | Low |
| Filesystem | Native File I/O | Low |
| Contacts | ContactsContract | Medium |
| Background Tasks | WorkManager | Medium |

## Immediate Next Steps (Phase 2)

1. **Add the provided Kotlin files** into `com.chatr.app` package structure
2. **Update AndroidManifest.xml**: 
   - Set `android:name=".ChatrApplication"` in `<application>`
   - Ensure MainActivity is registered
   - Add required permissions
3. **Add Compose dependencies** in `app/build.gradle.kts`:
   ```kotlin
   implementation platform('androidx.compose:compose-bom:2024.08.00')
   implementation 'androidx.compose.material3:material3'
   implementation 'androidx.navigation:navigation-compose:2.7.0'
   implementation 'androidx.lifecycle:lifecycle-viewmodel-compose:2.6.2'
   ```
4. **Enable Compose** in `buildFeatures` and set `kotlinCompilerExtensionVersion`
5. **Run the app** and validate navigation works
6. **Wire a ViewModel** for Dashboard to load real data (Phase 3)

## Deliverables for Phase 2

- ✅ Compose scaffold (MainActivity, NavHost, Theme)
- ✅ DashboardScreen POC with static UI
- ✅ Migration docs (this blueprint)
- 🔄 Updated build.gradle with Compose dependencies
- 🔄 AndroidManifest updates

## Next: Phase 3 Preview

Once DashboardScreen is validated, we'll:
1. Add ViewModel and real data
2. Migrate AuthScreen
3. Continue with Chat screens
4. Replace native plugins one by one

---

## References
- [Component Mapping Table](COMPONENT_MAPPING.md)
- [Plugin Migration Guide](PLUGIN_MIGRATION.md)
- [Jetpack Compose Docs](https://developer.android.com/jetpack/compose)
- [Material 3 Design](https://m3.material.io/)
