# CHATR Android Native App - Complete Integration Guide

## Table of Contents
1. [API Configuration](#1-api-configuration)
2. [Authentication](#2-authentication)
3. [Database Schema (Room)](#3-database-schema-room)
4. [Edge Functions (68 APIs)](#4-edge-functions-68-apis)
5. [Deep Links & Routes (120+)](#5-deep-links--routes-120)
6. [WebSocket & Realtime](#6-websocket--realtime)
7. [WebRTC Calling](#7-webrtc-calling)
8. [Push Notifications (FCM)](#8-push-notifications-fcm)
9. [File Storage](#9-file-storage)
10. [Security Configuration](#10-security-configuration)
11. [Permissions](#11-permissions)
12. [Data Models](#12-data-models)
13. [Network Configuration](#13-network-configuration)

---

## 1. API Configuration

### Base URLs
```kotlin
object ApiConfig {
    // Supabase Project
    const val SUPABASE_URL = "https://sbayuqgomlflmxgicplz.supabase.co"
    const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYXl1cWdvbWxmbG14Z2ljcGx6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MTc2MDAsImV4cCI6MjA3NDk5MzYwMH0.gVSObpMtsv5W2nuLBHKT8G1_hXIprWXdn5l7Bnnj7jw"
    
    // Edge Functions Base
    const val EDGE_FUNCTIONS_URL = "$SUPABASE_URL/functions/v1"
    
    // REST API Base
    const val REST_API_URL = "$SUPABASE_URL/rest/v1"
    
    // Realtime WebSocket
    const val REALTIME_URL = "wss://sbayuqgomlflmxgicplz.supabase.co/realtime/v1/websocket"
    
    // Storage
    const val STORAGE_URL = "$SUPABASE_URL/storage/v1"
}
```

### Required Headers
```kotlin
object ApiHeaders {
    fun getHeaders(accessToken: String? = null): Map<String, String> {
        val headers = mutableMapOf(
            "apikey" to ApiConfig.SUPABASE_ANON_KEY,
            "Content-Type" to "application/json"
        )
        accessToken?.let {
            headers["Authorization"] = "Bearer $it"
        }
        return headers
    }
}
```

---

## 2. Authentication

### Firebase + Supabase Dual Auth Flow
```kotlin
// 1. Firebase Phone OTP
suspend fun signInWithPhone(phoneNumber: String): Result<String> {
    // Returns verification ID
}

// 2. Verify OTP
suspend fun verifyOTP(verificationId: String, otp: String): Result<FirebaseUser>

 // 3. Exchange Firebase token for Supabase session
suspend fun exchangeFirebaseToken(firebaseIdToken: String): Result<Session> {
    val response = supabase.auth.signInWithIdToken(
        provider = Provider.FIREBASE,
        idToken = firebaseIdToken
    )
    return response
}

// 4. Check if returning user (skip OTP)
suspend fun checkReturningUser(phoneNumber: String): Boolean {
    val result = supabase.from("profiles")
        .select("onboarding_completed")
        .eq("phone_number", phoneNumber)
        .single()
    return result.data?.onboarding_completed == true
}
```

### Token Storage (EncryptedSharedPreferences)
```kotlin
class SecureTokenManager(context: Context) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    
    private val prefs = EncryptedSharedPreferences.create(
        context,
        "chatr_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
    
    fun saveAccessToken(token: String) {
        prefs.edit().putString("access_token", token).apply()
    }
    fun getAccessToken(): String? = prefs.getString("access_token", null)
    fun saveRefreshToken(token: String) {
        prefs.edit().putString("refresh_token", token).apply()
    }
    fun getRefreshToken(): String? = prefs.getString("refresh_token", null)
    fun clearTokens() {
        prefs.edit().remove("access_token").remove("refresh_token").apply()
    }
}
```

---

## 3. Database Schema (Room)

### Entities
```kotlin
// ==================== MESSAGES ====================
@Entity(tableName = "messages")
data class MessageEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "conversation_id") val conversationId: String,
    @ColumnInfo(name = "sender_id") val senderId: String,
    val content: String?,
    @ColumnInfo(name = "message_type") val messageType: String = "text",
    @ColumnInfo(name = "media_url") val mediaUrl: String?,
    @ColumnInfo(name = "media_type") val mediaType: String?,
    @ColumnInfo(name = "reply_to_id") val replyToId: String?,
    @ColumnInfo(name = "is_edited") val isEdited: Boolean = false,
    @ColumnInfo(name = "is_deleted") val isDeleted: Boolean = false,
    @ColumnInfo(name = "is_forwarded") val isForwarded: Boolean = false,
    @ColumnInfo(name = "read_at") val readAt: Long?,
    @ColumnInfo(name = "delivered_at") val deliveredAt: Long?,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "expires_at") val expiresAt: Long?,
    @ColumnInfo(name = "location_latitude") val locationLatitude: Double?,
    @ColumnInfo(name = "location_longitude") val locationLongitude: Double?,
    @ColumnInfo(name = "location_name") val locationName: String?,
    @ColumnInfo(name = "sync_status") val syncStatus: SyncStatus = SyncStatus.SYNCED
)

enum class SyncStatus { PENDING, SYNCED, FAILED }

// ==================== CONVERSATIONS ====================
@Entity(tableName = "conversations")
data class ConversationEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "is_group") val isGroup: Boolean = false,
    @ColumnInfo(name = "is_community") val isCommunity: Boolean = false,
    @ColumnInfo(name = "group_name") val groupName: String?,
    @ColumnInfo(name = "group_icon_url") val groupIconUrl: String?,
    @ColumnInfo(name = "group_description") val groupDescription: String?,
    @ColumnInfo(name = "created_by") val createdBy: String?,
    @ColumnInfo(name = "last_message") val lastMessage: String?,
    @ColumnInfo(name = "last_message_at") val lastMessageAt: Long?,
    @ColumnInfo(name = "unread_count") val unreadCount: Int = 0,
    @ColumnInfo(name = "is_pinned") val isPinned: Boolean = false,
    @ColumnInfo(name = "is_muted") val isMuted: Boolean = false,
    @ColumnInfo(name = "is_archived") val isArchived: Boolean = false,
    @ColumnInfo(name = "disappearing_messages_duration") val disappearingDuration: Int?,
    @ColumnInfo(name = "member_count") val memberCount: Int = 0,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "updated_at") val updatedAt: Long
)

// ==================== CONTACTS ====================
@Entity(tableName = "contacts")
data class ContactEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "user_id") val userId: String,
    @ColumnInfo(name = "contact_user_id") val contactUserId: String?,
    @ColumnInfo(name = "contact_name") val contactName: String,
    @ColumnInfo(name = "contact_phone") val contactPhone: String,
    @ColumnInfo(name = "is_registered") val isRegistered: Boolean = false,
    @ColumnInfo(name = "is_favorite") val isFavorite: Boolean = false,
    @ColumnInfo(name = "avatar_url") val avatarUrl: String?,
    @ColumnInfo(name = "created_at") val createdAt: Long
)

// ==================== PROFILES ====================
@Entity(tableName = "profiles")
data class ProfileEntity(
    @PrimaryKey val id: String,
    val username: String?,
    val email: String?,
    @ColumnInfo(name = "phone_number") val phoneNumber: String?,
    @ColumnInfo(name = "avatar_url") val avatarUrl: String?,
    val bio: String?,
    @ColumnInfo(name = "is_online") val isOnline: Boolean = false,
    @ColumnInfo(name = "last_seen_at") val lastSeenAt: Long?,
    @ColumnInfo(name = "onboarding_completed") val onboardingCompleted: Boolean = false
)

// ==================== CALLS ====================
@Entity(tableName = "call_logs")
data class CallLogEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "caller_id") val callerId: String,
    @ColumnInfo(name = "receiver_id") val receiverId: String?,
    @ColumnInfo(name = "conversation_id") val conversationId: String?,
    @ColumnInfo(name = "call_type") val callType: String, // "audio" | "video"
    val status: String, // "ringing" | "answered" | "ended" | "missed" | "declined"
    @ColumnInfo(name = "started_at") val startedAt: Long?,
    @ColumnInfo(name = "ended_at") val endedAt: Long?,
    val duration: Int?,
    @ColumnInfo(name = "is_group") val isGroup: Boolean = false,
    @ColumnInfo(name = "missed") val missed: Boolean = false,
    @ColumnInfo(name = "created_at") val createdAt: Long
)

// ==================== PENDING MESSAGES (Offline Queue) ====================
@Entity(tableName = "pending_messages")
data class PendingMessageEntity(
    @PrimaryKey val id: String = UUID.randomUUID().toString(),
    @ColumnInfo(name = "conversation_id") val conversationId: String,
    val content: String?,
    @ColumnInfo(name = "message_type") val messageType: String = "text",
    @ColumnInfo(name = "media_uri") val mediaUri: String?,
    @ColumnInfo(name = "reply_to_id") val replyToId: String?,
    @ColumnInfo(name = "retry_count") val retryCount: Int = 0,
    @ColumnInfo(name = "created_at") val createdAt: Long = System.currentTimeMillis()
)

// ==================== NOTIFICATIONS ====================
@Entity(tableName = "notifications")
data class NotificationEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "user_id") val userId: String,
    val type: String,
    val title: String,
    val body: String,
    val data: String?, // JSON string
    @ColumnInfo(name = "is_read") val isRead: Boolean = false,
    @ColumnInfo(name = "created_at") val createdAt: Long
)

// ==================== STORIES ====================
@Entity(tableName = "stories")
data class StoryEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "user_id") val userId: String,
    @ColumnInfo(name = "media_url") val mediaUrl: String,
    @ColumnInfo(name = "media_type") val mediaType: String,
    val caption: String?,
    @ColumnInfo(name = "view_count") val viewCount: Int = 0,
    @ColumnInfo(name = "expires_at") val expiresAt: Long,
    @ColumnInfo(name = "created_at") val createdAt: Long
)
```

### DAOs
```kotlin
@Dao
interface MessageDao {
    @Query("SELECT * FROM messages WHERE conversation_id = :conversationId ORDER BY created_at DESC LIMIT :limit OFFSET :offset")
    fun getMessages(conversationId: String, limit: Int = 50, offset: Int = 0): Flow<List<MessageEntity>>
    
    @Query("SELECT * FROM messages WHERE sync_status = :status")
    suspend fun getPendingMessages(status: SyncStatus = SyncStatus.PENDING): List<MessageEntity>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessage(message: MessageEntity)
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertMessages(messages: List<MessageEntity>)
    
    @Update
    suspend fun updateMessage(message: MessageEntity)
    
    @Query("UPDATE messages SET sync_status = :status WHERE id = :messageId")
    suspend fun updateSyncStatus(messageId: String, status: SyncStatus)
    
    @Query("DELETE FROM messages WHERE id = :messageId")
    suspend fun deleteMessage(messageId: String)
    
    @Query("SELECT * FROM messages WHERE content LIKE '%' || :query || '%' ORDER BY created_at DESC")
    fun searchMessages(query: String): Flow<List<MessageEntity>>
}

@Dao
interface ConversationDao {
    @Query("SELECT * FROM conversations ORDER BY last_message_at DESC")
    fun getAllConversations(): Flow<List<ConversationEntity>>
    
    @Query("SELECT * FROM conversations WHERE id = :id")
    suspend fun getConversation(id: String): ConversationEntity?
    
    @Query("SELECT * FROM conversations WHERE is_archived = 0 ORDER BY is_pinned DESC, last_message_at DESC")
    fun getActiveConversations(): Flow<List<ConversationEntity>>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertConversation(conversation: ConversationEntity)
    
    @Update
    suspend fun updateConversation(conversation: ConversationEntity)
    
    @Query("UPDATE conversations SET unread_count = 0 WHERE id = :conversationId")
    suspend fun markAsRead(conversationId: String)
    
    @Query("UPDATE conversations SET is_pinned = :isPinned WHERE id = :conversationId")
    suspend fun setPinned(conversationId: String, isPinned: Boolean)
    
    @Query("UPDATE conversations SET is_muted = :isMuted WHERE id = :conversationId")
    suspend fun setMuted(conversationId: String, isMuted: Boolean)
    
    @Query("UPDATE conversations SET is_archived = :isArchived WHERE id = :conversationId")
    suspend fun setArchived(conversationId: String, isArchived: Boolean)
}

@Dao
interface ContactDao {
    @Query("SELECT * FROM contacts WHERE user_id = :userId ORDER BY contact_name ASC")
    fun getContacts(userId: String): Flow<List<ContactEntity>>
    
    @Query("SELECT * FROM contacts WHERE user_id = :userId AND is_registered = 1")
    fun getRegisteredContacts(userId: String): Flow<List<ContactEntity>>
    
    @Query("SELECT * FROM contacts WHERE user_id = :userId AND is_registered = 0")
    fun getUnregisteredContacts(userId: String): Flow<List<ContactEntity>>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertContacts(contacts: List<ContactEntity>)
    
    @Query("DELETE FROM contacts WHERE user_id = :userId")
    suspend fun clearContacts(userId: String)
}

@Dao
interface PendingMessageDao {
    @Query("SELECT * FROM pending_messages ORDER BY created_at ASC")
    suspend fun getAllPending(): List<PendingMessageEntity>
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(message: PendingMessageEntity)
    
    @Query("DELETE FROM pending_messages WHERE id = :id")
    suspend fun delete(id: String)
    
    @Query("UPDATE pending_messages SET retry_count = retry_count + 1 WHERE id = :id")
    suspend fun incrementRetry(id: String)
}
```

### Database
```kotlin
@Database(
    entities = [
        MessageEntity::class,
        ConversationEntity::class,
        ContactEntity::class,
        ProfileEntity::class,
        CallLogEntity::class,
        PendingMessageEntity::class,
        NotificationEntity::class,
        StoryEntity::class
    ],
    version = 1,
    exportSchema = true
)
@TypeConverters(Converters::class)
abstract class ChatrDatabase : RoomDatabase() {
    abstract fun messageDao(): MessageDao
    abstract fun conversationDao(): ConversationDao
    abstract fun contactDao(): ContactDao
    abstract fun profileDao(): ProfileDao
    abstract fun callLogDao(): CallLogDao
    abstract fun pendingMessageDao(): PendingMessageDao
    abstract fun notificationDao(): NotificationDao
    abstract fun storyDao(): StoryDao
    
    companion object {
        @Volatile
        private var INSTANCE: ChatrDatabase? = null
        
        fun getDatabase(context: Context): ChatrDatabase {
            return INSTANCE ?: synchronized(this) {
                Room.databaseBuilder(
                    context.applicationContext,
                    ChatrDatabase::class.java,
                    "chatr_database"
                )
                .fallbackToDestructiveMigration()
                .build()
                .also { INSTANCE = it }
            }
        }
    }
}
```

---

## 4. Edge Functions (68 APIs)

### Complete Edge Function List
```kotlin
object EdgeFunctions {
    private const val BASE = "${ApiConfig.EDGE_FUNCTIONS_URL}"
    
    // ==================== AI & SEARCH ====================
    const val AI_CHAT = "$BASE/ai-chat"
    const val AI_GENERATE = "$BASE/ai-generate"
    const val AI_SEARCH = "$BASE/ai-search"
    const val AI_ASSISTANT = "$BASE/ai-assistant"
    const val AI_TRANSLATE = "$BASE/ai-translate"
    const val UNIVERSAL_SEARCH = "$BASE/universal-search"
    const val CHATR_WORLD_SEARCH = "$BASE/chatr-world-search"
    const val CHATR_WORLD_AI = "$BASE/chatr-world-ai"
    const val CHATR_GAMES_AI = "$BASE/chatr-games-ai"
    const val GEO_SEARCH = "$BASE/geo-search"
    const val SMART_SEARCH = "$BASE/smart-search"
    
    // ==================== AUTHENTICATION ====================
    const val VERIFY_OTP = "$BASE/verify-otp"
    const val SEND_OTP = "$BASE/send-otp"
    const val QR_LOGIN = "$BASE/qr-login"
    const val AUTH_CALLBACK = "$BASE/auth-callback"
    
    // ==================== MESSAGING ====================
    const val SEND_MESSAGE = "$BASE/send-message"
    const val GET_MESSAGES = "$BASE/get-messages"
    const val DELETE_MESSAGE = "$BASE/delete-message"
    const val EDIT_MESSAGE = "$BASE/edit-message"
    const val FORWARD_MESSAGE = "$BASE/forward-message"
    const val MESSAGE_REACTIONS = "$BASE/message-reactions"
    const val TYPING_INDICATOR = "$BASE/typing-indicator"
    const val READ_RECEIPTS = "$BASE/read-receipts"
    
    // ==================== CONVERSATIONS ====================
    const val CREATE_CONVERSATION = "$BASE/create-conversation"
    const val GET_CONVERSATIONS = "$BASE/get-conversations"
    const val UPDATE_CONVERSATION = "$BASE/update-conversation"
    const val DELETE_CONVERSATION = "$BASE/delete-conversation"
    const val ADD_PARTICIPANTS = "$BASE/add-participants"
    const val REMOVE_PARTICIPANT = "$BASE/remove-participant"
    const val LEAVE_GROUP = "$BASE/leave-group"
    
    // ==================== CALLS ====================
    const val INITIATE_CALL = "$BASE/initiate-call"
    const val END_CALL = "$BASE/end-call"
    const val CALL_STATUS = "$BASE/call-status"
    const val WEBRTC_SIGNALING = "$BASE/webrtc-signaling"
    const val GET_CALL_HISTORY = "$BASE/get-call-history"
    
    // ==================== CONTACTS ====================
    const val SYNC_CONTACTS = "$BASE/sync-contacts"
    const val GET_CONTACTS = "$BASE/get-contacts"
    const val ADD_CONTACT = "$BASE/add-contact"
    const val REMOVE_CONTACT = "$BASE/remove-contact"
    const val BLOCK_CONTACT = "$BASE/block-contact"
    const val UNBLOCK_CONTACT = "$BASE/unblock-contact"
    const val IMPORT_GMAIL_CONTACTS = "$BASE/import-gmail-contacts"
    
    // ==================== NOTIFICATIONS ====================
    const val PUSH_NOTIFICATIONS = "$BASE/push-notifications"
    const val REGISTER_DEVICE = "$BASE/register-device"
    const val SEND_NOTIFICATION = "$BASE/send-notification"
    const val GET_NOTIFICATIONS = "$BASE/get-notifications"
    const val MARK_NOTIFICATION_READ = "$BASE/mark-notification-read"
    
    // ==================== STORIES/STATUS ====================
    const val CREATE_STORY = "$BASE/create-story"
    const val GET_STORIES = "$BASE/get-stories"
    const val VIEW_STORY = "$BASE/view-story"
    const val DELETE_STORY = "$BASE/delete-story"
    const val REACT_TO_STORY = "$BASE/react-to-story"
    
    // ==================== PROFILE ====================
    const val UPDATE_PROFILE = "$BASE/update-profile"
    const val GET_PROFILE = "$BASE/get-profile"
    const val UPDATE_AVATAR = "$BASE/update-avatar"
    const val UPDATE_STATUS = "$BASE/update-status"
    const val PRESENCE_UPDATE = "$BASE/presence-update"
    
    // ==================== CHATR WORLD ====================
    const val CHATR_WORLD = "$BASE/chatr-world"
    const val LOCAL_JOBS = "$BASE/local-jobs"
    const val HEALTHCARE_BOOKING = "$BASE/healthcare-booking"
    const val FOOD_ORDERING = "$BASE/food-ordering"
    const val LOCAL_DEALS = "$BASE/local-deals"
    const val HOME_SERVICES = "$BASE/home-services"
    
    // ==================== PAYMENTS ====================
    const val WALLET_TRANSACTION = "$BASE/wallet-transaction"
    const val GET_WALLET_BALANCE = "$BASE/get-wallet-balance"
    const val PROCESS_PAYMENT = "$BASE/process-payment"
    const val VERIFY_UPI_PAYMENT = "$BASE/verify-upi-payment"
    
    // ==================== REFERRALS ====================
    const val GENERATE_REFERRAL = "$BASE/generate-referral"
    const val APPLY_REFERRAL = "$BASE/apply-referral"
    const val GET_REFERRAL_STATS = "$BASE/get-referral-stats"
    const val SEND_INVITE = "$BASE/send-invite"
    
    // ==================== MISC ====================
    const val UPLOAD_FILE = "$BASE/upload-file"
    const val GENERATE_PRESIGNED_URL = "$BASE/generate-presigned-url"
    const val REPORT_CONTENT = "$BASE/report-content"
    const val GET_APP_CONFIG = "$BASE/get-app-config"
    const val FEEDBACK = "$BASE/feedback"
    const val ANALYTICS_EVENT = "$BASE/analytics-event"
}
```

### API Response Models
```kotlin
// Generic API Response
data class ApiResponse<T>(
    val success: Boolean,
    val data: T?,
    val error: String?,
    val message: String?
)

// Pagination Response
data class PaginatedResponse<T>(
    val data: List<T>,
    val page: Int,
    val pageSize: Int,
    val totalCount: Int,
    val hasMore: Boolean
)
```

---

## 5. Deep Links & Routes (120+)

### Complete Route Configuration
```kotlin
object DeepLinks {
    const val SCHEME = "chatr"
    const val HOST = "app"
    const val WEB_HOST = "chatr.chat"
    
    // ==================== CORE NAVIGATION ====================
    object Core {
        const val HOME = "/"
        const val AUTH = "/auth"
        const val ONBOARDING = "/onboarding"
        const val PROFILE = "/profile"
        const val SETTINGS = "/settings"
        const val NOTIFICATIONS = "/notifications"
    }
    
    // ==================== CHAT ====================
    object Chat {
        const val LIST = "/chat"
        const val CONVERSATION = "/chat/{conversationId}"
        const val NEW = "/chat/new"
        const val GROUP_INFO = "/chat/{conversationId}/info"
        const val MEDIA = "/chat/{conversationId}/media"
        const val SEARCH = "/chat/search"
        const val ARCHIVED = "/chat/archived"
        const val STARRED = "/chat/starred"
    }
    
    // ==================== CALLS ====================
    object Calls {
        const val LIST = "/calls"
        const val ACTIVE = "/call/{callId}"
        const val INCOMING = "/call/incoming/{callId}"
        const val OUTGOING = "/call/outgoing/{userId}"
        const val VIDEO = "/call/video/{callId}"
        const val GROUP = "/call/group/{conversationId}"
    }
    
    // ==================== CONTACTS ====================
    object Contacts {
        const val LIST = "/contacts"
        const val DETAIL = "/contacts/{contactId}"
        const val ADD = "/contacts/add"
        const val BLOCKED = "/contacts/blocked"
        const val INVITE = "/contacts/invite"
    }
    
    // ==================== STORIES ====================
    object Stories {
        const val LIST = "/stories"
        const val VIEW = "/stories/{userId}"
        const val CREATE = "/stories/create"
        const val MY_STORY = "/stories/my"
    }
    
    // ==================== CHATR WORLD ====================
    object ChatrWorld {
        const val HOME = "/chatr-world"
        const val JOBS = "/chatr-world/jobs"
        const val JOB_DETAIL = "/chatr-world/jobs/{jobId}"
        const val HEALTHCARE = "/chatr-world/healthcare"
        const val DOCTOR_DETAIL = "/chatr-world/healthcare/{doctorId}"
        const val FOOD = "/chatr-world/food"
        const val RESTAURANT = "/chatr-world/food/{restaurantId}"
        const val DEALS = "/chatr-world/deals"
        const val DEAL_DETAIL = "/chatr-world/deals/{dealId}"
        const val SERVICES = "/chatr-world/services"
    }
    
    // ==================== AI FEATURES ====================
    object AI {
        const val ASSISTANT = "/ai-assistant"
        const val AGENTS = "/ai-agents"
        const val AGENT_CHAT = "/ai-agents/{agentId}"
        const val BROWSER = "/ai-browser"
        const val SEARCH = "/ai-search"
    }
    
    // ==================== GAMES ====================
    object Games {
        const val HOME = "/chatr-games"
        const val PLAY = "/chatr-games/{gameId}"
        const val LEADERBOARD = "/chatr-games/leaderboard"
        const val AIR_RUNNER = "/chatr-games/air-runner"
    }
    
    // ==================== STUDIO ====================
    object Studio {
        const val HOME = "/chatr-studio"
        const val EDITOR = "/chatr-studio/editor"
        const val TEMPLATES = "/chatr-studio/templates"
        const val MY_DESIGNS = "/chatr-studio/my-designs"
    }
    
    // ==================== WALLET & PAYMENTS ====================
    object Wallet {
        const val HOME = "/chatr-wallet"
        const val HISTORY = "/chatr-wallet/history"
        const val ADD_MONEY = "/chatr-wallet/add"
        const val TRANSFER = "/chatr-wallet/transfer"
        const val POINTS = "/chatr-points"
        const val REWARDS = "/chatr-points/rewards"
    }
    
    // ==================== HEALTH ====================
    object Health {
        const val HUB = "/health-hub"
        const val TRACKER = "/health-hub/tracker"
        const val RECORDS = "/health-hub/records"
        const val PASSPORT = "/health-passport"
        const val CARE_ACCESS = "/care-access"
    }
    
    // ==================== COMMUNITY ====================
    object Community {
        const val LIST = "/communities"
        const val DETAIL = "/communities/{communityId}"
        const val CREATE = "/communities/create"
        const val DISCOVER = "/communities/discover"
    }
    
    // ==================== SETTINGS ====================
    object Settings {
        const val HOME = "/settings"
        const val ACCOUNT = "/settings/account"
        const val PRIVACY = "/settings/privacy"
        const val NOTIFICATIONS = "/settings/notifications"
        const val APPEARANCE = "/settings/appearance"
        const val STORAGE = "/settings/storage"
        const val HELP = "/settings/help"
        const val ABOUT = "/settings/about"
        const val LINKED_DEVICES = "/settings/linked-devices"
        const val BLOCKED = "/settings/blocked"
        const val TWO_FACTOR = "/settings/two-factor"
    }
    
    // ==================== STEALTH MODE ====================
    object StealthMode {
        const val HOME = "/stealth-mode"
        const val SELLER = "/stealth-mode/seller"
        const val REWARDS = "/stealth-mode/rewards"
        const val SUBSCRIBE = "/stealth-mode/subscribe"
    }
    
    // ==================== MINI APPS ====================
    object MiniApps {
        const val HOME = "/native-apps"
        const val DETAIL = "/native-apps/{appId}"
        const val STORE = "/app-store"
    }
    
    // ==================== BUSINESS ====================
    object Business {
        const val DASHBOARD = "/business"
        const val PROFILE = "/business/profile"
        const val CATALOG = "/business/catalog"
        const val ORDERS = "/business/orders"
        const val ANALYTICS = "/business/analytics"
        const val BROADCASTS = "/business/broadcasts"
    }
    
    // ==================== REFERRALS ====================
    object Referrals {
        const val HOME = "/referrals"
        const val INVITE = "/invite"
        const val JOIN = "/join"  // /join?ref=USER_ID
    }
    
    // ==================== EMERGENCY ====================
    object Emergency {
        const val HOME = "/emergency"
        const val SOS = "/emergency/sos"
        const val NEARBY = "/emergency/nearby"
    }
}
```

### Deep Link Handler
```kotlin
class DeepLinkHandler @Inject constructor(
    private val navController: NavController
) {
    fun handleDeepLink(uri: Uri): Boolean {
        val path = uri.path ?: return false
        
        return when {
            path.startsWith("/chat/") -> {
                val conversationId = uri.lastPathSegment
                navController.navigate("chat/$conversationId")
                true
            }
            path.startsWith("/call/incoming/") -> {
                val callId = uri.lastPathSegment
                navController.navigate("call/incoming/$callId")
                true
            }
            path.startsWith("/join") -> {
                val refCode = uri.getQueryParameter("ref")
                navController.navigate("join?ref=$refCode")
                true
            }
            // Add more handlers...
            else -> false
        }
    }
}
```

---

## 6. WebSocket & Realtime

### Supabase Realtime Configuration
```kotlin
class RealtimeManager @Inject constructor(
    private val supabase: SupabaseClient
) {
    private var messagesChannel: RealtimeChannel? = null
    private var presenceChannel: RealtimeChannel? = null
    private var typingChannel: RealtimeChannel? = null
    
    // Subscribe to messages for a conversation
    suspend fun subscribeToMessages(
        conversationId: String,
        onMessage: (Message) -> Unit
    ) {
        messagesChannel = supabase.channel("messages:$conversationId")
        
        messagesChannel?.postgresChangeFlow<PostgresAction.Insert>(
            schema = "public",
            table = "messages",
            filter = FilterOperation("conversation_id", FilterOperator.EQ, conversationId)
        )?.onEach { change ->
            change.record?.let { record ->
                onMessage(record.toMessage())
            }
        }?.launchIn(CoroutineScope(Dispatchers.IO))
        
        messagesChannel?.subscribe()
    }
    
    // User presence
    suspend fun trackPresence(userId: String) {
        presenceChannel = supabase.channel("presence:online")
        
        presenceChannel?.presence(
            key = userId,
            payload = mapOf(
                "user_id" to userId,
                "online_at" to System.currentTimeMillis()
            )
        )
        
        presenceChannel?.subscribe()
    }
    
    // Typing indicators
    suspend fun sendTypingIndicator(conversationId: String, userId: String) {
        typingChannel = supabase.channel("typing:$conversationId")
        
        typingChannel?.broadcast(
            event = "typing",
            payload = mapOf(
                "user_id" to userId,
                "typing" to true
            )
        )
    }
    
    // Listen for typing
    suspend fun subscribeToTyping(
        conversationId: String,
        onTyping: (String, Boolean) -> Unit
    ) {
        typingChannel = supabase.channel("typing:$conversationId")
        
        typingChannel?.broadcastFlow<TypingEvent>("typing")
            ?.onEach { event ->
                onTyping(event.userId, event.typing)
            }
            ?.launchIn(CoroutineScope(Dispatchers.IO))
        
        typingChannel?.subscribe()
    }
    
    fun unsubscribeAll() {
        messagesChannel?.unsubscribe()
        presenceChannel?.unsubscribe()
        typingChannel?.unsubscribe()
    }
}
```

---

## 7. WebRTC Calling

### STUN/TURN Configuration
```kotlin
object WebRTCConfig {
    val iceServers = listOf(
        PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer(),
        PeerConnection.IceServer.builder("stun:stun1.l.google.com:19302").createIceServer(),
        PeerConnection.IceServer.builder("stun:stun2.l.google.com:19302").createIceServer(),
        PeerConnection.IceServer.builder("stun:stun3.l.google.com:19302").createIceServer(),
        PeerConnection.IceServer.builder("stun:stun4.l.google.com:19302").createIceServer(),
        // TURN server (needs to be configured)
        // PeerConnection.IceServer.builder("turn:your-turn-server.com:3478")
        //     .setUsername("username")
        //     .setPassword("password")
        //     .createIceServer()
    )
    
    val rtcConfig = PeerConnection.RTCConfiguration(iceServers).apply {
        sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN
        continualGatheringPolicy = PeerConnection.ContinualGatheringPolicy.GATHER_CONTINUALLY
        iceTransportsType = PeerConnection.IceTransportsType.ALL
    }
}
```

### WebRTC Manager
```kotlin
class WebRTCManager @Inject constructor(
    private val context: Context,
    private val signalingClient: SignalingClient
) {
    private var peerConnectionFactory: PeerConnectionFactory? = null
    private var peerConnection: PeerConnection? = null
    private var localAudioTrack: AudioTrack? = null
    private var localVideoTrack: VideoTrack? = null
    private var videoCapturer: VideoCapturer? = null
    
    // Call state
    private val _callState = MutableStateFlow<CallState>(CallState.Idle)
    val callState: StateFlow<CallState> = _callState
    
    fun initialize() {
        PeerConnectionFactory.initialize(
            PeerConnectionFactory.InitializationOptions.builder(context)
                .setEnableInternalTracer(true)
                .createInitializationOptions()
        )
        
        val options = PeerConnectionFactory.Options()
        peerConnectionFactory = PeerConnectionFactory.builder()
            .setOptions(options)
            .setVideoDecoderFactory(DefaultVideoDecoderFactory(EglBase.create().eglBaseContext))
            .setVideoEncoderFactory(DefaultVideoEncoderFactory(EglBase.create().eglBaseContext, true, true))
            .createPeerConnectionFactory()
    }
    
    suspend fun initiateCall(
        callId: String,
        receiverId: String,
        isVideo: Boolean
    ) {
        createPeerConnection(callId)
        
        if (isVideo) {
            createLocalVideoTrack()
        }
        createLocalAudioTrack()
        
        // Create offer
        val offer = peerConnection?.createOffer(MediaConstraints())
        peerConnection?.setLocalDescription(offer!!)
        
        // Send offer via signaling
        signalingClient.sendOffer(callId, receiverId, offer.description)
        
        _callState.value = CallState.Calling(callId, receiverId, isVideo)
    }
    
    suspend fun answerCall(callId: String, offer: SessionDescription) {
        createPeerConnection(callId)
        
        peerConnection?.setRemoteDescription(offer)
        
        // Create answer
        val answer = peerConnection?.createAnswer(MediaConstraints())
        peerConnection?.setLocalDescription(answer!!)
        
        // Send answer via signaling
        signalingClient.sendAnswer(callId, answer.description)
        
        _callState.value = CallState.Connected(callId)
    }
    
    fun endCall() {
        peerConnection?.close()
        peerConnection = null
        localAudioTrack?.dispose()
        localVideoTrack?.dispose()
        videoCapturer?.stopCapture()
        _callState.value = CallState.Idle
    }
    
    private fun createPeerConnection(callId: String) {
        peerConnection = peerConnectionFactory?.createPeerConnection(
            WebRTCConfig.rtcConfig,
            object : PeerConnection.Observer {
                override fun onIceCandidate(candidate: IceCandidate) {
                    signalingClient.sendIceCandidate(callId, candidate)
                }
                
                override fun onIceConnectionChange(state: PeerConnection.IceConnectionState) {
                    when (state) {
                        PeerConnection.IceConnectionState.CONNECTED -> {
                            _callState.value = CallState.Connected(callId)
                        }
                        PeerConnection.IceConnectionState.DISCONNECTED,
                        PeerConnection.IceConnectionState.FAILED -> {
                            endCall()
                        }
                        else -> {}
                    }
                }
                
                override fun onAddStream(stream: MediaStream) {
                    // Handle remote stream
                }
                
                // ... other callbacks
            }
        )
    }
    
    fun toggleMute(): Boolean {
        localAudioTrack?.setEnabled(!(localAudioTrack?.enabled() ?: true))
        return localAudioTrack?.enabled() ?: false
    }
    
    fun toggleVideo(): Boolean {
        localVideoTrack?.setEnabled(!(localVideoTrack?.enabled() ?: true))
        return localVideoTrack?.enabled() ?: false
    }
    
    fun switchCamera() {
        (videoCapturer as? CameraVideoCapturer)?.switchCamera(null)
    }
}

sealed class CallState {
    object Idle : CallState()
    data class Ringing(val callId: String, val callerId: String, val isVideo: Boolean) : CallState()
    data class Calling(val callId: String, val receiverId: String, val isVideo: Boolean) : CallState()
    data class Connected(val callId: String) : CallState()
    data class Ended(val duration: Long) : CallState()
}
```

### Signaling Client
```kotlin
class SignalingClient @Inject constructor(
    private val supabase: SupabaseClient
) {
    private var signalingChannel: RealtimeChannel? = null
    
    suspend fun connect(callId: String, onSignal: (SignalMessage) -> Unit) {
        signalingChannel = supabase.channel("call:$callId")
        
        signalingChannel?.broadcastFlow<SignalMessage>("signal")
            ?.onEach { signal -> onSignal(signal) }
            ?.launchIn(CoroutineScope(Dispatchers.IO))
        
        signalingChannel?.subscribe()
    }
    
    suspend fun sendOffer(callId: String, receiverId: String, sdp: String) {
        signalingChannel?.broadcast(
            event = "signal",
            payload = SignalMessage(
                type = "offer",
                callId = callId,
                receiverId = receiverId,
                sdp = sdp
            )
        )
    }
    
    suspend fun sendAnswer(callId: String, sdp: String) {
        signalingChannel?.broadcast(
            event = "signal",
            payload = SignalMessage(
                type = "answer",
                callId = callId,
                sdp = sdp
            )
        )
    }
    
    suspend fun sendIceCandidate(callId: String, candidate: IceCandidate) {
        signalingChannel?.broadcast(
            event = "signal",
            payload = SignalMessage(
                type = "ice-candidate",
                callId = callId,
                candidate = candidate.sdp,
                sdpMid = candidate.sdpMid,
                sdpMLineIndex = candidate.sdpMLineIndex
            )
        )
    }
    
    fun disconnect() {
        signalingChannel?.unsubscribe()
    }
}

@Serializable
data class SignalMessage(
    val type: String,
    val callId: String,
    val receiverId: String? = null,
    val sdp: String? = null,
    val candidate: String? = null,
    val sdpMid: String? = null,
    val sdpMLineIndex: Int? = null
)
```

---

## 8. Push Notifications (FCM)

### FCM Service
```kotlin
class ChatrFirebaseService : FirebaseMessagingService() {
    
    @Inject
    lateinit var notificationRepository: NotificationRepository
    
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        
        CoroutineScope(Dispatchers.IO).launch {
            notificationRepository.registerDevice(token)
        }
    }
    
    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)
        
        val data = message.data
        
        when (data["type"]) {
            "message" -> handleNewMessage(data)
            "call" -> handleIncomingCall(data)
            "story" -> handleNewStory(data)
            "notification" -> handleNotification(data)
        }
    }
    
    private fun handleNewMessage(data: Map<String, String>) {
        val notification = NotificationCompat.Builder(this, CHANNEL_MESSAGES)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(data["sender_name"])
            .setContentText(data["content"])
            .setCategory(NotificationCompat.CATEGORY_MESSAGE)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .addAction(
                R.drawable.ic_reply,
                "Reply",
                getReplyPendingIntent(data["conversation_id"]!!)
            )
            .setContentIntent(getChatPendingIntent(data["conversation_id"]!!))
            .build()
        
        NotificationManagerCompat.from(this).notify(
            data["message_id"].hashCode(),
            notification
        )
    }
    
    private fun handleIncomingCall(data: Map<String, String>) {
        // Acquire wake lock
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        val wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "chatr:call_wake_lock"
        )
        wakeLock.acquire(60000L)
        
        // Start call activity
        val intent = Intent(this, IncomingCallActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP
            putExtra("call_id", data["call_id"])
            putExtra("caller_id", data["caller_id"])
            putExtra("caller_name", data["caller_name"])
            putExtra("caller_avatar", data["caller_avatar"])
            putExtra("is_video", data["is_video"]?.toBoolean() ?: false)
        }
        startActivity(intent)
        
        // Show heads-up notification
        showIncomingCallNotification(data)
    }
    
    private fun showIncomingCallNotification(data: Map<String, String>) {
        val fullScreenIntent = Intent(this, IncomingCallActivity::class.java).apply {
            putExtra("call_id", data["call_id"])
            putExtra("caller_id", data["caller_id"])
            putExtra("caller_name", data["caller_name"])
            putExtra("is_video", data["is_video"]?.toBoolean() ?: false)
        }
        
        val fullScreenPendingIntent = PendingIntent.getActivity(
            this, 0, fullScreenIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        
        val notification = NotificationCompat.Builder(this, CHANNEL_CALLS)
            .setSmallIcon(R.drawable.ic_call)
            .setContentTitle("Incoming ${if (data["is_video"] == "true") "Video" else "Voice"} Call")
            .setContentText("${data["caller_name"]} is calling...")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setOngoing(true)
            .addAction(R.drawable.ic_decline, "Decline", getDeclinePendingIntent(data["call_id"]!!))
            .addAction(R.drawable.ic_accept, "Accept", getAcceptPendingIntent(data["call_id"]!!))
            .build()
        
        NotificationManagerCompat.from(this).notify(
            INCOMING_CALL_NOTIFICATION_ID,
            notification
        )
    }
    
    companion object {
        const val CHANNEL_MESSAGES = "messages"
        const val CHANNEL_CALLS = "calls"
        const val CHANNEL_STORIES = "stories"
        const val CHANNEL_GENERAL = "general"
        const val INCOMING_CALL_NOTIFICATION_ID = 1001
    }
}
```

### Notification Channels Setup
```kotlin
class ChatrApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }
    
    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channels = listOf(
                NotificationChannel(
                    "messages",
                    "Messages",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "New message notifications"
                    enableVibration(true)
                    setShowBadge(true)
                },
                NotificationChannel(
                    "calls",
                    "Calls",
                    NotificationManager.IMPORTANCE_MAX
                ).apply {
                    description = "Incoming call notifications"
                    enableVibration(true)
                    setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE), null)
                    lockscreenVisibility = Notification.VISIBILITY_PUBLIC
                },
                NotificationChannel(
                    "stories",
                    "Stories",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "Story update notifications"
                },
                NotificationChannel(
                    "general",
                    "General",
                    NotificationManager.IMPORTANCE_DEFAULT
                ).apply {
                    description = "General notifications"
                }
            )
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            channels.forEach { notificationManager.createNotificationChannel(it) }
        }
    }
}
```

---

## 9. File Storage

### Storage Buckets
```kotlin
object StorageBuckets {
    const val CHAT_MEDIA = "chat-media"      // Public - chat images/videos/files
    const val STORIES = "stories"            // Public - story media
    const val SOCIAL_MEDIA = "social-media"  // Public - profile pics, posts
    const val SCREENSHOTS = "screenshots"    // Public - payment screenshots
    const val CHAT_BACKUPS = "chat-backups"  // Private - encrypted chat backups
    const val KYC_DOCUMENTS = "kyc-documents" // Private - KYC verification
    const val LAB_REPORTS = "lab-reports"    // Private - health records
    const val PAYMENT_SCREENSHOTS = "payment-screenshots" // Private - UPI payments
    const val PROVIDER_CERTIFICATES = "provider-certificates" // Private
}
```

### File Upload Manager
```kotlin
class FileUploadManager @Inject constructor(
    private val supabase: SupabaseClient,
    private val context: Context
) {
    suspend fun uploadChatMedia(
        uri: Uri,
        conversationId: String,
        onProgress: (Float) -> Unit
    ): Result<String> {
        return try {
            val file = uri.toFile(context)
            val fileName = "${conversationId}/${UUID.randomUUID()}.${file.extension}"
            
            val result = supabase.storage
                .from(StorageBuckets.CHAT_MEDIA)
                .upload(fileName, file.readBytes()) {
                    upsert = false
                }
            
            val publicUrl = supabase.storage
                .from(StorageBuckets.CHAT_MEDIA)
                .publicUrl(fileName)
            
            Result.success(publicUrl)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun uploadAvatar(uri: Uri, userId: String): Result<String> {
        return try {
            val file = uri.toFile(context)
            val fileName = "avatars/$userId.${file.extension}"
            
            supabase.storage
                .from(StorageBuckets.SOCIAL_MEDIA)
                .upload(fileName, file.readBytes()) {
                    upsert = true
                }
            
            val publicUrl = supabase.storage
                .from(StorageBuckets.SOCIAL_MEDIA)
                .publicUrl(fileName)
            
            Result.success(publicUrl)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun uploadStory(uri: Uri, userId: String): Result<String> {
        return try {
            val file = uri.toFile(context)
            val fileName = "$userId/${System.currentTimeMillis()}.${file.extension}"
            
            supabase.storage
                .from(StorageBuckets.STORIES)
                .upload(fileName, file.readBytes())
            
            val publicUrl = supabase.storage
                .from(StorageBuckets.STORIES)
                .publicUrl(fileName)
            
            Result.success(publicUrl)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun downloadFile(url: String, destinationFile: File): Result<File> {
        return try {
            val response = supabase.storage
                .from(StorageBuckets.CHAT_MEDIA)
                .downloadAuthenticated(url.substringAfterLast("/"))
            
            destinationFile.writeBytes(response)
            Result.success(destinationFile)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

---

## 10. Security Configuration

### SSL Pinning
```kotlin
object SSLPinning {
    // Supabase certificate pins
    val certificatePins = arrayOf(
        "sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=", // Primary
        "sha256/BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB="  // Backup
    )
    
    fun getOkHttpClient(): OkHttpClient {
        val certificatePinner = CertificatePinner.Builder()
            .add("sbayuqgomlflmxgicplz.supabase.co", *certificatePins)
            .build()
        
        return OkHttpClient.Builder()
            .certificatePinner(certificatePinner)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
    }
}
```

### Encryption Utils
```kotlin
object EncryptionUtils {
    private const val ALGORITHM = "AES/GCM/NoPadding"
    private const val KEY_SIZE = 256
    private const val IV_SIZE = 12
    private const val TAG_SIZE = 128
    
    fun generateKey(): SecretKey {
        val keyGenerator = KeyGenerator.getInstance("AES")
        keyGenerator.init(KEY_SIZE)
        return keyGenerator.generateKey()
    }
    
    fun encrypt(data: ByteArray, key: SecretKey): ByteArray {
        val cipher = Cipher.getInstance(ALGORITHM)
        val iv = ByteArray(IV_SIZE).apply { SecureRandom().nextBytes(this) }
        cipher.init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(TAG_SIZE, iv))
        val encrypted = cipher.doFinal(data)
        return iv + encrypted
    }
    
    fun decrypt(encryptedData: ByteArray, key: SecretKey): ByteArray {
        val cipher = Cipher.getInstance(ALGORITHM)
        val iv = encryptedData.copyOfRange(0, IV_SIZE)
        val data = encryptedData.copyOfRange(IV_SIZE, encryptedData.size)
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(TAG_SIZE, iv))
        return cipher.doFinal(data)
    }
}
```

### Secure Storage
```kotlin
class SecureStore @Inject constructor(
    private val context: Context
) {
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    
    private val encryptedPrefs = EncryptedSharedPreferences.create(
        context,
        "chatr_secure_storage",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )
    
    fun saveString(key: String, value: String) {
        encryptedPrefs.edit().putString(key, value).apply()
    }
    
    fun getString(key: String): String? {
        return encryptedPrefs.getString(key, null)
    }
    
    fun saveBytes(key: String, value: ByteArray) {
        encryptedPrefs.edit().putString(key, Base64.encodeToString(value, Base64.DEFAULT)).apply()
    }
    
    fun getBytes(key: String): ByteArray? {
        return encryptedPrefs.getString(key, null)?.let {
            Base64.decode(it, Base64.DEFAULT)
        }
    }
    
    fun clear() {
        encryptedPrefs.edit().clear().apply()
    }
}
```

---

## 11. Permissions

### AndroidManifest.xml Permissions
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Internet -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    
    <!-- Contacts -->
    <uses-permission android:name="android.permission.READ_CONTACTS" />
    <uses-permission android:name="android.permission.WRITE_CONTACTS" />
    
    <!-- Camera & Media -->
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="29" />
    
    <!-- Audio/Calls -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    
    <!-- Location -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    
    <!-- Notifications -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.VIBRATE" />
    
    <!-- Background Services -->
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_PHONE_CALL" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS" />
    
    <!-- Phone State -->
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    <uses-permission android:name="android.permission.CALL_PHONE" />
    <uses-permission android:name="android.permission.ANSWER_PHONE_CALLS" />
    <uses-permission android:name="android.permission.MANAGE_OWN_CALLS" />
    
    <!-- Biometrics -->
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.USE_FINGERPRINT" />

    <!-- Features -->
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
    <uses-feature android:name="android.hardware.microphone" android:required="true" />
    <uses-feature android:name="android.hardware.telephony" android:required="false" />

    <!-- App Visibility Queries (Android 11+) -->
    <queries>
        <!-- Mini Apps Package Names -->
        <package android:name="com.google.android.apps.maps" />
        <package android:name="com.whatsapp" />
        <package android:name="org.telegram.messenger" />
        <package android:name="com.instagram.android" />
        <package android:name="com.facebook.katana" />
        <package android:name="com.twitter.android" />
        <package android:name="com.snapchat.android" />
        <package android:name="com.linkedin.android" />
        <package android:name="com.spotify.music" />
        <package android:name="com.netflix.mediaclient" />
        <package android:name="com.amazon.mShop.android.shopping" />
        <package android:name="in.amazon.mShop.android.shopping" />
        <package android:name="com.flipkart.android" />
        <package android:name="com.application.zomato" />
        <package android:name="in.swiggy.android" />
        <package android:name="com.grofers.customerapp" />
        <package android:name="com.bigbasket.mobileapp" />
        <package android:name="net.one97.paytm" />
        <package android:name="com.phonepe.app" />
        <package android:name="com.google.android.apps.nbu.paisa.user" />
        <package android:name="com.dreamplug.androidapp" />
        <package android:name="com.olacabs.customer" />
        <package android:name="com.ubercab" />
        <package android:name="com.irctc.rail.connect" />
        <package android:name="com.makemytrip" />
        <package android:name="com.goibibo" />
        <package android:name="com.bookmyshow.entertainment" />
        <package android:name="com.myntra.android" />
        <package android:name="com.jio.media.jiobeats" />
        <package android:name="com.gaana" />
        <package android:name="com.bsbportal.music" />
        <package android:name="com.hotstar.android" />
        <package android:name="com.jio.jioplay.tv" />
        <package android:name="com.sonyliv" />
        <package android:name="com.zee5.hipi" />
        <package android:name="com.practo.fabric" />
        <package android:name="com.lybrate.lybrate" />
        <package android:name="com.application.healthyways" />
        <package android:name="com.phonepe.stocksapio" />
        <package android:name="com.upstox.pro" />
        <package android:name="com.zerodha.kite3" />
        <package android:name="com.groww.android" />
        <package android:name="com.angelone.a1" />
        <package android:name="net.dineout.app" />
        <package android:name="com.eatsure" />
        <package android:name="com.dunzo.user" />
        <package android:name="com.urbanclap.urbanclap" />
        <package android:name="com.housejoy.android" />
        <package android:name="com.meesho.supply" />
        <package android:name="club.ajio" />
        <package android:name="com.nykaa.android" />
        <package android:name="com.lenskart.app" />
        <!-- Intent schemes -->
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="https" />
        </intent>
        <intent>
            <action android:name="android.intent.action.VIEW" />
            <data android:scheme="http" />
        </intent>
    </queries>

</manifest>
```

### Runtime Permission Handler
```kotlin
class PermissionHandler @Inject constructor(
    private val activity: Activity
) {
    companion object {
        const val REQUEST_CAMERA = 100
        const val REQUEST_CONTACTS = 101
        const val REQUEST_LOCATION = 102
        const val REQUEST_MICROPHONE = 103
        const val REQUEST_NOTIFICATIONS = 104
        const val REQUEST_STORAGE = 105
    }
    
    fun checkAndRequestPermissions(permissions: Array<String>, requestCode: Int): Boolean {
        val permissionsNeeded = permissions.filter {
            ContextCompat.checkSelfPermission(activity, it) != PackageManager.PERMISSION_GRANTED
        }
        
        return if (permissionsNeeded.isNotEmpty()) {
            ActivityCompat.requestPermissions(activity, permissionsNeeded.toTypedArray(), requestCode)
            false
        } else {
            true
        }
    }
    
    val cameraPermissions = arrayOf(
        Manifest.permission.CAMERA,
        Manifest.permission.RECORD_AUDIO
    )
    
    val contactsPermissions = arrayOf(
        Manifest.permission.READ_CONTACTS
    )
    
    val locationPermissions = arrayOf(
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.ACCESS_COARSE_LOCATION
    )
    
    val storagePermissions = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        arrayOf(
            Manifest.permission.READ_MEDIA_IMAGES,
            Manifest.permission.READ_MEDIA_VIDEO,
            Manifest.permission.READ_MEDIA_AUDIO
        )
    } else {
        arrayOf(
            Manifest.permission.READ_EXTERNAL_STORAGE,
            Manifest.permission.WRITE_EXTERNAL_STORAGE
        )
    }
    
    val notificationPermissions = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        arrayOf(Manifest.permission.POST_NOTIFICATIONS)
    } else {
        emptyArray()
    }
}
```

---

## 12. Data Models

### API Request/Response Models
```kotlin
// ==================== AUTH ====================
@Serializable
data class LoginRequest(
    val phone: String,
    val otp: String? = null,
    val provider: String = "phone"
)

@Serializable
data class AuthResponse(
    val user: UserData,
    val session: SessionData
)

@Serializable
data class SessionData(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
    @SerialName("expires_in") val expiresIn: Long,
    @SerialName("token_type") val tokenType: String = "bearer"
)

// ==================== USER ====================
@Serializable
data class UserData(
    val id: String,
    val email: String?,
    @SerialName("phone_number") val phoneNumber: String?,
    val username: String?,
    @SerialName("avatar_url") val avatarUrl: String?,
    val bio: String?,
    @SerialName("is_online") val isOnline: Boolean = false,
    @SerialName("last_seen_at") val lastSeenAt: String?,
    @SerialName("onboarding_completed") val onboardingCompleted: Boolean = false
)

@Serializable
data class UpdateProfileRequest(
    val username: String? = null,
    val bio: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null
)

// ==================== MESSAGES ====================
@Serializable
data class SendMessageRequest(
    @SerialName("conversation_id") val conversationId: String,
    val content: String?,
    @SerialName("message_type") val messageType: String = "text",
    @SerialName("media_url") val mediaUrl: String? = null,
    @SerialName("media_type") val mediaType: String? = null,
    @SerialName("reply_to_id") val replyToId: String? = null,
    @SerialName("location_latitude") val locationLatitude: Double? = null,
    @SerialName("location_longitude") val locationLongitude: Double? = null,
    @SerialName("location_name") val locationName: String? = null
)

@Serializable
data class MessageData(
    val id: String,
    @SerialName("conversation_id") val conversationId: String,
    @SerialName("sender_id") val senderId: String,
    val content: String?,
    @SerialName("message_type") val messageType: String,
    @SerialName("media_url") val mediaUrl: String?,
    @SerialName("media_type") val mediaType: String?,
    @SerialName("reply_to_id") val replyToId: String?,
    @SerialName("is_edited") val isEdited: Boolean,
    @SerialName("is_deleted") val isDeleted: Boolean,
    @SerialName("read_at") val readAt: String?,
    @SerialName("delivered_at") val deliveredAt: String?,
    @SerialName("created_at") val createdAt: String,
    val sender: UserData? = null,
    @SerialName("reply_to") val replyTo: MessageData? = null,
    val reactions: List<ReactionData>? = null
)

@Serializable
data class ReactionData(
    val id: String,
    @SerialName("user_id") val userId: String,
    val emoji: String,
    @SerialName("created_at") val createdAt: String
)

// ==================== CONVERSATIONS ====================
@Serializable
data class CreateConversationRequest(
    @SerialName("participant_ids") val participantIds: List<String>,
    @SerialName("is_group") val isGroup: Boolean = false,
    @SerialName("group_name") val groupName: String? = null,
    @SerialName("group_icon_url") val groupIconUrl: String? = null
)

@Serializable
data class ConversationData(
    val id: String,
    @SerialName("is_group") val isGroup: Boolean,
    @SerialName("is_community") val isCommunity: Boolean,
    @SerialName("group_name") val groupName: String?,
    @SerialName("group_icon_url") val groupIconUrl: String?,
    @SerialName("group_description") val groupDescription: String?,
    @SerialName("created_by") val createdBy: String?,
    @SerialName("last_message") val lastMessage: String?,
    @SerialName("last_message_at") val lastMessageAt: String?,
    @SerialName("unread_count") val unreadCount: Int,
    val participants: List<ParticipantData>? = null,
    @SerialName("other_user") val otherUser: UserData? = null,
    @SerialName("created_at") val createdAt: String
)

@Serializable
data class ParticipantData(
    val id: String,
    @SerialName("user_id") val userId: String,
    val role: String,
    val user: UserData? = null
)

// ==================== CALLS ====================
@Serializable
data class InitiateCallRequest(
    @SerialName("receiver_id") val receiverId: String? = null,
    @SerialName("conversation_id") val conversationId: String? = null,
    @SerialName("call_type") val callType: String, // "audio" | "video"
    @SerialName("is_group") val isGroup: Boolean = false
)

@Serializable
data class CallData(
    val id: String,
    @SerialName("caller_id") val callerId: String,
    @SerialName("receiver_id") val receiverId: String?,
    @SerialName("conversation_id") val conversationId: String?,
    @SerialName("call_type") val callType: String,
    val status: String,
    @SerialName("started_at") val startedAt: String?,
    @SerialName("ended_at") val endedAt: String?,
    val duration: Int?,
    @SerialName("is_group") val isGroup: Boolean,
    val missed: Boolean,
    val caller: UserData? = null,
    val receiver: UserData? = null,
    @SerialName("created_at") val createdAt: String
)

// ==================== CONTACTS ====================
@Serializable
data class SyncContactsRequest(
    val contacts: List<ContactInput>
)

@Serializable
data class ContactInput(
    val name: String,
    val phone: String,
    val email: String? = null
)

@Serializable
data class ContactData(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("contact_user_id") val contactUserId: String?,
    @SerialName("contact_name") val contactName: String,
    @SerialName("contact_phone") val contactPhone: String,
    @SerialName("is_registered") val isRegistered: Boolean,
    @SerialName("is_favorite") val isFavorite: Boolean,
    @SerialName("contact_user") val contactUser: UserData? = null
)

// ==================== STORIES ====================
@Serializable
data class CreateStoryRequest(
    @SerialName("media_url") val mediaUrl: String,
    @SerialName("media_type") val mediaType: String, // "image" | "video"
    val caption: String? = null
)

@Serializable
data class StoryData(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("media_url") val mediaUrl: String,
    @SerialName("media_type") val mediaType: String,
    val caption: String?,
    @SerialName("view_count") val viewCount: Int,
    @SerialName("expires_at") val expiresAt: String,
    @SerialName("created_at") val createdAt: String,
    val user: UserData? = null,
    val viewers: List<StoryViewerData>? = null
)

@Serializable
data class StoryViewerData(
    val id: String,
    @SerialName("user_id") val userId: String,
    @SerialName("viewed_at") val viewedAt: String,
    val user: UserData? = null
)

// ==================== SEARCH ====================
@Serializable
data class SearchRequest(
    val query: String,
    val category: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val radius: Int? = null,
    val page: Int = 1,
    val limit: Int = 20
)

@Serializable
data class SearchResponse(
    val results: List<SearchResult>,
    @SerialName("ai_summary") val aiSummary: String?,
    val page: Int,
    val total: Int,
    @SerialName("has_more") val hasMore: Boolean
)

@Serializable
data class SearchResult(
    val id: String,
    val title: String,
    val description: String?,
    val url: String?,
    @SerialName("image_url") val imageUrl: String?,
    val category: String?,
    val source: String?,
    val distance: Double?,
    val rating: Double?,
    val price: String?
)

// ==================== WALLET ====================
@Serializable
data class WalletData(
    val id: String,
    @SerialName("user_id") val userId: String,
    val balance: Double,
    @SerialName("total_spent") val totalSpent: Double,
    @SerialName("total_earned") val totalEarned: Double,
    @SerialName("cashback_balance") val cashbackBalance: Double,
    @SerialName("referral_earnings") val referralEarnings: Double
)

@Serializable
data class WalletTransactionRequest(
    val type: String, // "credit" | "debit" | "cashback" | "referral"
    val amount: Double,
    val description: String,
    @SerialName("reference_type") val referenceType: String? = null,
    @SerialName("reference_id") val referenceId: String? = null
)

// ==================== NOTIFICATIONS ====================
@Serializable
data class RegisterDeviceRequest(
    @SerialName("fcm_token") val fcmToken: String,
    @SerialName("device_id") val deviceId: String,
    @SerialName("device_name") val deviceName: String,
    val platform: String = "android",
    @SerialName("app_version") val appVersion: String
)

@Serializable
data class NotificationData(
    val id: String,
    @SerialName("user_id") val userId: String,
    val type: String,
    val title: String,
    val body: String,
    val data: Map<String, String>?,
    @SerialName("is_read") val isRead: Boolean,
    @SerialName("created_at") val createdAt: String
)
```

---

## 13. Network Configuration

### Retrofit Setup
```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    
    @Provides
    @Singleton
    fun provideOkHttpClient(
        tokenManager: SecureTokenManager
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(AuthInterceptor(tokenManager))
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            })
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }
    
    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(ApiConfig.EDGE_FUNCTIONS_URL + "/")
            .client(okHttpClient)
            .addConverterFactory(Json {
                ignoreUnknownKeys = true
                coerceInputValues = true
            }.asConverterFactory("application/json".toMediaType()))
            .build()
    }
    
    @Provides
    @Singleton
    fun provideChatrApi(retrofit: Retrofit): ChatrApi {
        return retrofit.create(ChatrApi::class.java)
    }
}

class AuthInterceptor(
    private val tokenManager: SecureTokenManager
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request().newBuilder()
            .addHeader("apikey", ApiConfig.SUPABASE_ANON_KEY)
            .addHeader("Content-Type", "application/json")
        
        tokenManager.getAccessToken()?.let { token ->
            request.addHeader("Authorization", "Bearer $token")
        }
        
        return chain.proceed(request.build())
    }
}
```

### Retrofit API Interface
```kotlin
interface ChatrApi {
    // Auth
    @POST("verify-otp")
    suspend fun verifyOtp(@Body request: LoginRequest): Response<AuthResponse>
    
    @POST("send-otp")
    suspend fun sendOtp(@Body request: Map<String, String>): Response<ApiResponse<Unit>>
    
    // Messages
    @POST("send-message")
    suspend fun sendMessage(@Body request: SendMessageRequest): Response<ApiResponse<MessageData>>
    
    @GET("get-messages")
    suspend fun getMessages(
        @Query("conversation_id") conversationId: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<PaginatedResponse<MessageData>>
    
    // Conversations
    @POST("create-conversation")
    suspend fun createConversation(@Body request: CreateConversationRequest): Response<ApiResponse<ConversationData>>
    
    @GET("get-conversations")
    suspend fun getConversations(): Response<ApiResponse<List<ConversationData>>>
    
    // Calls
    @POST("initiate-call")
    suspend fun initiateCall(@Body request: InitiateCallRequest): Response<ApiResponse<CallData>>
    
    @POST("end-call")
    suspend fun endCall(@Body request: Map<String, String>): Response<ApiResponse<Unit>>
    
    // Contacts
    @POST("sync-contacts")
    suspend fun syncContacts(@Body request: SyncContactsRequest): Response<ApiResponse<List<ContactData>>>
    
    @GET("get-contacts")
    suspend fun getContacts(): Response<ApiResponse<List<ContactData>>>
    
    // Stories
    @POST("create-story")
    suspend fun createStory(@Body request: CreateStoryRequest): Response<ApiResponse<StoryData>>
    
    @GET("get-stories")
    suspend fun getStories(): Response<ApiResponse<List<StoryData>>>
    
    // Profile
    @POST("update-profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<ApiResponse<UserData>>
    
    @GET("get-profile")
    suspend fun getProfile(@Query("user_id") userId: String): Response<ApiResponse<UserData>>
    
    // Notifications
    @POST("register-device")
    suspend fun registerDevice(@Body request: RegisterDeviceRequest): Response<ApiResponse<Unit>>
    
    @GET("get-notifications")
    suspend fun getNotifications(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<PaginatedResponse<NotificationData>>
    
    // Search
    @POST("universal-search")
    suspend fun search(@Body request: SearchRequest): Response<SearchResponse>
    
    // Wallet
    @GET("get-wallet-balance")
    suspend fun getWalletBalance(): Response<ApiResponse<WalletData>>
    
    @POST("wallet-transaction")
    suspend fun walletTransaction(@Body request: WalletTransactionRequest): Response<ApiResponse<Unit>>
}
```

---

## Quick Start Checklist

### Before Building:
- [ ] Add `google-services.json` to `app/` folder
- [ ] Configure Firebase project with FCM enabled
- [ ] Update `local.properties` with SDK paths
- [ ] Set up signing configuration for release builds

### Required Environment Variables:
```properties
# local.properties
SUPABASE_URL=https://sbayuqgomlflmxgicplz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Build Commands:
```bash
# Debug build
./gradlew assembleDebug

# Release build
./gradlew assembleRelease

# Install on device
./gradlew installDebug

# Run tests
./gradlew test
```

---

## Implementation Status

### ✅ Completed Features
1. **E2E Encryption** - `com.chatr.app.security.E2EEncryption` + `E2ESessionManager`
   - Signal Protocol (X3DH + Double Ratchet)
   - ECDH key exchange, AES-256-GCM encryption
   - Android Keystore integration
   
2. **TURN Server** - `com.chatr.app.webrtc.TurnServerConfig`
   - Twilio, Metered, Xirsys, COTURN support
   - Time-limited credential generation
   - HMAC-SHA1 authentication
   
3. **Background Sync** - `com.chatr.app.sync.MessageSyncWorker`
   - WorkManager for periodic/one-time sync
   - Pending message queue with retry
   - Contact sync, Story sync workers
   
4. **Biometric Auth** - `com.chatr.app.security.BiometricAuthManager`
   - Fingerprint, Face, Iris support
   - PIN fallback with encrypted storage
   - Configurable timeout settings

### ⏳ Remaining
5. **App Backup** - Chat backup to Google Drive (optional)

---

## Version Info
- **Document Version**: 1.0.0
- **Last Updated**: December 2025
- **Android Min SDK**: 24 (Android 7.0)
- **Android Target SDK**: 34 (Android 14)
- **Kotlin Version**: 1.9.x
- **Compose Version**: 1.5.x
