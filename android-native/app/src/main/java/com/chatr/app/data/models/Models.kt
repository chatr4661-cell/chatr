package com.chatr.app.data.models

/**
 * =========================================
 * CHATR+ UNIFIED DATA MODELS
 * =========================================
 * 
 * Single source of truth for all domain models used across the app.
 * Ensures consistency between ViewModels, Repositories, and UI layers.
 * 
 * NOTE: API response models are defined in their respective API files
 * with "Response" suffix to avoid conflicts (e.g., CallDataResponse, NotificationResponse)
 */

// ==================== USER ====================
data class User(
    val id: String,
    val email: String? = null,
    val phoneNumber: String? = null,
    val username: String? = null,
    val displayName: String? = null,
    val avatarUrl: String? = null,
    val photoUrl: String? = null,
    val isOnline: Boolean = false,
    val lastSeen: Long? = null,
    val bio: String? = null
)

// ==================== CHAT ====================
data class Chat(
    val id: String,
    val participants: List<String>,
    val lastMessage: Message? = null,
    val unreadCount: Int = 0,
    val updatedAt: Long,
    val isGroup: Boolean = false,
    val groupName: String? = null,
    val groupIconUrl: String? = null,
    val otherUser: User? = null
)

// ==================== MESSAGE ====================
data class Message(
    val id: String,
    val conversationId: String,
    val chatId: String = "", // Alias for conversationId
    val senderId: String,
    val senderName: String? = null,
    val content: String,
    val timestamp: Long,
    val type: MessageType = MessageType.TEXT,
    val status: MessageStatus = MessageStatus.SENT,
    val replyTo: String? = null,
    val replyToId: String? = null,
    val mediaUrl: String? = null,
    val thumbnailUrl: String? = null,
    val mediaDuration: Int? = null,
    val reactions: List<Reaction> = emptyList(),
    val deliveredAt: Long? = null,
    val readAt: Long? = null,
    val localPath: String? = null,
    val uploadProgress: Int = 0,
    val isEdited: Boolean = false,
    val editedAt: Long? = null
)

data class Reaction(
    val userId: String,
    val emoji: String,
    val timestamp: Long
)

enum class MessageType { 
    TEXT, IMAGE, VIDEO, AUDIO, FILE, LOCATION, VOICE_NOTE, SYSTEM 
}

enum class MessageStatus { 
    PENDING, SENDING, SENT, DELIVERED, READ, FAILED 
}

// ==================== CALL ====================
enum class CallType { AUDIO, VIDEO }

enum class CallStatus { 
    INITIATING, RINGING, ACTIVE, ENDED, MISSED, REJECTED 
}

data class CallData(
    val id: String,
    val callerId: String,
    val receiverId: String,
    val type: CallType,
    val status: CallStatus,
    val startTime: Long? = null,
    val endTime: Long? = null,
    val callerName: String? = null,
    val callerAvatar: String? = null
)

// ==================== CONTACT ====================
data class Contact(
    val id: String,
    val userId: String? = null,
    val name: String,
    val phoneNumber: String? = null,
    val email: String? = null,
    val avatarUrl: String? = null,
    val isRegistered: Boolean = false,
    val isBlocked: Boolean = false,
    val isFavorite: Boolean = false
)

// ==================== NOTIFICATION ====================
data class Notification(
    val id: String,
    val type: String,
    val title: String,
    val body: String,
    val data: Map<String, String>? = null,
    val read: Boolean = false,
    val createdAt: Long
)

// ==================== SEARCH ====================
data class SearchResult(
    val id: String,
    val title: String,
    val description: String? = null,
    val url: String? = null,
    val imageUrl: String? = null,
    val rating: Double? = null,
    val distance: String? = null,
    val price: String? = null,
    val category: String? = null,
    val source: String? = null
)

data class ImageAnalysis(
    val objects: List<String>,
    val searchQuery: String
)

// ==================== SOCIAL ====================
data class Story(
    val id: String,
    val userId: String,
    val username: String? = null,
    val avatarUrl: String? = null,
    val mediaUrl: String,
    val caption: String? = null,
    val type: String,
    val viewCount: Int = 0,
    val createdAt: Long,
    val expiresAt: Long
)

data class Community(
    val id: String,
    val name: String,
    val description: String? = null,
    val iconUrl: String? = null,
    val memberCount: Int = 0,
    val createdBy: String,
    val createdAt: Long,
    val isJoined: Boolean = false
)

data class FameCamPost(
    val id: String,
    val userId: String,
    val username: String? = null,
    val avatarUrl: String? = null,
    val mediaUrl: String,
    val caption: String? = null,
    val likeCount: Int = 0,
    val commentCount: Int = 0,
    val viralityScore: Double = 0.0,
    val coinsEarned: Int = 0,
    val createdAt: Long
)

data class FameLeaderboardEntry(
    val userId: String,
    val username: String? = null,
    val avatarUrl: String? = null,
    val totalFameScore: Double,
    val totalPosts: Int,
    val totalViralPosts: Int,
    val rank: Int
)

// ==================== JOBS & HEALTHCARE ====================
data class JobListing(
    val id: String,
    val title: String,
    val company: String,
    val location: String,
    val salary: String? = null,
    val description: String? = null,
    val url: String? = null,
    val postedAt: Long? = null
)

data class HealthcareProvider(
    val id: String,
    val name: String,
    val type: String,
    val address: String,
    val phone: String? = null,
    val rating: Double? = null,
    val distance: String? = null,
    val isOpen: Boolean? = null
)

// ==================== SEND MESSAGE REQUEST ====================
data class SendMessageRequest(
    val conversationId: String,
    val content: String,
    val type: MessageType = MessageType.TEXT,
    val replyTo: String? = null,
    val mediaUrl: String? = null
) {
    // Convert to API format
    fun toApiRequest() = mapOf(
        "conversationId" to conversationId,
        "content" to content,
        "type" to type.name,
        "replyTo" to replyTo,
        "mediaUrl" to mediaUrl
    )
}
