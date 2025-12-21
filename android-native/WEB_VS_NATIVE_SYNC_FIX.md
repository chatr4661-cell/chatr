# Web vs Native Data Sync - Root Cause Analysis & Fix

## Issue Summary

**Problem**: Native Android app shows different/wrong data compared to Web app
- Web shows: `talentxcel_services`, `Sanobar Jahan`, etc. (CORRECT)
- Native shows: `Dr.Balmki`, `User_79b64174`, etc. (WRONG / MOCK DATA)
- Chat detail screen was empty on Native

## Root Cause

The Native Android `ChatsScreen.kt` and `ChatDetailScreen.kt` were using **hardcoded mock data** instead of calling the real Supabase RPC functions.

### Before (ChatsScreen.kt lines 43-51):
```kotlin
// Mock chat data - THIS WAS THE PROBLEM
val chats = remember {
    listOf(
        Chat("1", "John Doe", "Hey! How are you?", ...),
        Chat("2", "Sarah Smith", "See you tomorrow!", ...),
        // ... etc
    )
}
```

## Solution Applied

### 1. Created `ConversationsViewModel.kt`
- Uses `SupabaseRpcRepository.getConversations()` 
- Calls `get_user_conversations()` RPC (same as web)
- JWT-authenticated, no user ID params needed

### 2. Created `ChatDetailViewModel.kt`
- Uses `SupabaseRpcRepository.getMessages()`
- Calls `get_conversation_messages()` RPC (same as web)
- Handles send, load more, mark as read

### 3. Updated `ChatsScreen.kt`
- Removed all mock data
- Uses `ConversationsViewModel` via Hilt injection
- Displays real conversations from backend

### 4. Updated `ChatDetailScreen.kt`
- Removed all mock messages
- Uses `ChatDetailViewModel` via Hilt injection
- Displays real messages from backend

### 5. Updated `NetworkModule.kt`
- Added `provideSupabaseRpcRepository()` for Hilt DI

## Data Flow (Now Correct)

```
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                              │
│  get_user_conversations() RPC                                │
│  get_conversation_messages() RPC                             │
└─────────────────┬───────────────────────────────┬───────────┘
                  │                               │
                  ▼                               ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│          WEB APP            │   │       NATIVE APP             │
│  useConversations() hook    │   │  ConversationsViewModel      │
│  Supabase JS client         │   │  SupabaseRpcRepository       │
│  same data ✓                │   │  same data ✓                 │
└─────────────────────────────┘   └─────────────────────────────┘
```

## Auth Token Flow

```
Web Login (Supabase Auth)
         │
         ▼
┌─────────────────────────────┐
│  useNativeAuthSync hook     │
│  Syncs tokens to Native     │
│  via window.NativeAuth      │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  Native SharedPreferences   │
│  - access_token             │
│  - refresh_token            │
│  - user_id                  │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  AuthRepository             │
│  getAccessToken()           │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  SupabaseRpcRepository      │
│  Authorization: Bearer xxx  │
│  → get_user_conversations() │
│  → get_conversation_msgs()  │
└─────────────────────────────┘
```

## Testing Checklist

After deploying these changes:

1. **Login via WebView**: Ensure `useNativeAuthSync` syncs tokens
2. **Open Chats tab**: Should show SAME contacts as web
3. **Tap a chat**: Should show SAME messages as web
4. **Send a message**: Should appear in both native & web

## Files Changed

| File | Change |
|------|--------|
| `viewmodel/ConversationsViewModel.kt` | NEW - Fetches conversations via RPC |
| `viewmodel/ChatDetailViewModel.kt` | NEW - Fetches messages via RPC |
| `ui/screens/ChatsScreen.kt` | Updated - Uses ViewModel, removed mock data |
| `ui/screens/ChatDetailScreen.kt` | Updated - Uses ViewModel, removed mock data |
| `di/NetworkModule.kt` | Updated - Added SupabaseRpcRepository provider |

## Key Code Snippets

### ConversationsViewModel
```kotlin
@HiltViewModel
class ConversationsViewModel @Inject constructor(
    private val rpcRepository: SupabaseRpcRepository,
    private val authRepository: AuthRepository
) : ViewModel() {
    
    fun loadConversations() {
        val accessToken = authRepository.getAccessToken() ?: return
        
        viewModelScope.launch {
            rpcRepository.getConversations(accessToken)
                .onSuccess { conversations -> 
                    // Update state
                }
        }
    }
}
```

### ChatsScreen Usage
```kotlin
@Composable
fun ChatsScreen(
    viewModel: ConversationsViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    
    LazyColumn {
        items(state.conversations) { conversation ->
            ConversationRow(conversation)
        }
    }
}
```

## Common Issues & Fixes

### "Not authenticated" error
- Ensure WebView auth bridge is working
- Check `window.NativeAuth.setAuthToken()` is called
- Verify token is saved in SharedPreferences

### Empty chat list
- Check network connectivity
- Verify RPC function exists in Supabase
- Check JWT token is valid (not expired)

### Wrong user names
- If you still see old mock data, the app wasn't rebuilt
- Run `./gradlew clean assembleDebug`
- Clear app data and re-login
