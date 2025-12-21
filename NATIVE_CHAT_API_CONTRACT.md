# Chatr Native Chat API Contract

## Version 2.1.0 | December 21, 2025

---

## 1. Database Schema (Confirmed)

### conversations
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update |
| is_group | BOOLEAN | True for group chats |
| group_name | TEXT | Name for group chats |
| group_icon_url | TEXT | Avatar for group chats |
| created_by | UUID | Creator user ID |
| is_community | BOOLEAN | Community flag |
| is_muted | BOOLEAN | Muted globally |

### conversation_participants (Join Table)
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | FK to conversations |
| user_id | UUID | FK to profiles |
| joined_at | TIMESTAMPTZ | When user joined |
| role | TEXT | 'member', 'admin', 'owner' |
| is_muted | BOOLEAN | User-specific mute |
| is_archived | BOOLEAN | User-specific archive |
| last_read_at | TIMESTAMPTZ | Last read timestamp |

### messages
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| conversation_id | UUID | FK to conversations |
| sender_id | UUID | FK to profiles |
| content | TEXT | Message content |
| message_type | TEXT | 'text', 'image', 'audio', 'video', 'file' |
| created_at | TIMESTAMPTZ | Creation timestamp |
| status | TEXT | 'sent', 'delivered', 'read' |
| is_edited | BOOLEAN | Edit flag |
| is_deleted | BOOLEAN | Soft delete flag |
| media_url | TEXT | Media attachment URL |
| reactions | JSONB | Array of reactions |

### profiles
| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (matches auth.users) |
| username | TEXT | Display name |
| avatar_url | TEXT | Profile picture URL |
| is_online | BOOLEAN | Online status |
| email | TEXT | Email address |

---

## 2. Chat Ownership Model

✅ **Group-capable**: Supports both 1-to-1 and group conversations  
✅ **Join table**: `conversation_participants` manages membership  
✅ **JWT-aware**: `auth.uid()` available in all RPC functions  

---

## 3. Chat List API

### Endpoint
```
POST /rest/v1/rpc/get_user_conversations
```

### Headers
```
Authorization: Bearer <access_token>
apikey: <supabase_anon_key>
Content-Type: application/json
```

### Request Body
```json
{}
```

### Response
```json
[
  {
    "conversation_id": "be49e9eb-b7c8-4eeb-b5fe-95357de8b222",
    "is_group": false,
    "group_name": null,
    "group_icon_url": null,
    "other_user_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "other_user_name": "John Doe",
    "other_user_avatar": "https://example.com/avatar.jpg",
    "other_user_online": true,
    "last_message": "Hey, how are you?",
    "last_message_type": "text",
    "last_message_at": "2025-12-21T04:30:00Z",
    "last_message_sender_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "unread_count": 3,
    "is_muted": false,
    "is_archived": false
  }
]
```

### Key Features
- ✅ No `userId` parameter needed - inferred from JWT
- ✅ `other_user_name` included - no extra API calls
- ✅ `other_user_avatar` included - no extra API calls
- ✅ `unread_count` calculated server-side
- ✅ One API call = complete chat list screen

---

## 4. Chat Detail API

### Endpoint
```
POST /rest/v1/rpc/get_conversation_messages
```

### Headers
```
Authorization: Bearer <access_token>
apikey: <supabase_anon_key>
Content-Type: application/json
```

### Request Body
```json
{
  "p_conversation_id": "be49e9eb-b7c8-4eeb-b5fe-95357de8b222",
  "p_limit": 50,
  "p_before": "2025-12-21T04:30:00Z"  // Optional, for pagination
}
```

### Response
```json
[
  {
    "message_id": "msg-uuid-here",
    "sender_id": "user-uuid-here",
    "sender_name": "John Doe",
    "sender_avatar": "https://example.com/avatar.jpg",
    "content": "Hello!",
    "message_type": "text",
    "created_at": "2025-12-21T04:30:00Z",
    "is_edited": false,
    "is_deleted": false,
    "is_starred": false,
    "reply_to_id": null,
    "media_url": null,
    "media_attachments": [],
    "reactions": [],
    "status": "delivered"
  }
]
```

### Key Features
- ✅ JWT-scoped - verifies user is a participant
- ✅ `sender_name` and `sender_avatar` included
- ✅ Pagination via `p_before` timestamp
- ✅ One API call = complete message list

---

## 5. Send Message API

### Endpoint
```
POST /rest/v1/messages
```

### Headers
```
Authorization: Bearer <access_token>
apikey: <supabase_anon_key>
Content-Type: application/json
Prefer: return=representation
```

### Request Body
```json
{
  "conversation_id": "be49e9eb-b7c8-4eeb-b5fe-95357de8b222",
  "content": "Hello!",
  "message_type": "text"
}
```

### Response
```json
[
  {
    "id": "new-message-uuid",
    "conversation_id": "be49e9eb-b7c8-4eeb-b5fe-95357de8b222",
    "sender_id": "current-user-uuid",
    "content": "Hello!",
    "message_type": "text",
    "created_at": "2025-12-21T04:35:00Z",
    "status": "sent"
  }
]
```

---

## 6. Android Usage Example

```kotlin
// In your ViewModel or UseCase
class ChatListViewModel @Inject constructor(
    private val chatRepository: ChatRepository,
    private val authManager: AuthManager
) : ViewModel() {
    
    private val _conversations = MutableStateFlow<List<ConversationItem>>(emptyList())
    val conversations: StateFlow<List<ConversationItem>> = _conversations
    
    fun loadConversations() {
        viewModelScope.launch {
            val token = authManager.accessToken.value ?: return@launch
            
            chatRepository.getConversations(token)
                .onSuccess { conversations ->
                    _conversations.value = conversations
                }
                .onFailure { error ->
                    // Handle error
                }
        }
    }
}

// In your Composable
@Composable
fun ChatListScreen(viewModel: ChatListViewModel) {
    val conversations by viewModel.conversations.collectAsState()
    
    LazyColumn {
        items(conversations) { conversation ->
            ChatRow(
                name = conversation.displayName,  // ✅ No more "Unknown"
                avatar = conversation.avatarUrl,
                lastMessage = conversation.last_message ?: "Start chatting",
                unreadCount = conversation.unread_count.toInt(),
                isOnline = conversation.other_user_online
            )
        }
    }
}
```

---

## 7. Summary: What This Fixes

| Issue | Before | After |
|-------|--------|-------|
| Empty chat list | ❌ `participant_user_id` column error | ✅ Uses RPC with proper joins |
| "Unknown" users | ❌ No user info joined | ✅ `other_user_name` included |
| Extra API calls | ❌ Client-side joins | ✅ One call per screen |
| User ID param | ❌ Passed as query param | ✅ Inferred from JWT |

---

## 8. Realtime (Optional Enhancement)

For real-time updates, subscribe to the messages table:

```kotlin
// Supabase Realtime channel
val channel = supabase.channel("messages")
    .on("postgres_changes", 
        filter = PostgresChangeFilter(
            event = "INSERT",
            schema = "public",
            table = "messages"
        )
    ) { payload ->
        // Handle new message
    }
    .subscribe()
```

---

## 9. Error Handling

| HTTP Code | Meaning | Action |
|-----------|---------|--------|
| 401 | Token expired | Refresh token and retry |
| 403 | Not a participant | User removed from conversation |
| 404 | Conversation not found | Invalid conversation_id |
| 500 | Server error | Retry with exponential backoff |
