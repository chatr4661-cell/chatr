package com.chatr.app.data.models

// User model - single definition
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

// Chat model
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

// Message model - unified with both API and local needs
data class Message(
    val id: String,
    val conversationId: String,
    val chatId: String = "", // Alias for conversationId for backward compat
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

// Reaction model
data class Reaction(
    val userId: String,
    val emoji: String,
    val timestamp: Long
)

// Message types and status
enum class MessageType { 
    TEXT, IMAGE, VIDEO, AUDIO, FILE, LOCATION, VOICE_NOTE, SYSTEM 
}

enum class MessageStatus { 
    PENDING, SENDING, SENT, DELIVERED, READ, FAILED 
}

// Call types
enum class CallType { AUDIO, VIDEO }
enum class CallStatus { INITIATING, RINGING, ACTIVE, ENDED, MISSED, REJECTED }

// Call data
data class CallData(
    val id: String,
    val callerId: String,
    val receiverId: String,
    val type: CallType,
    val status: CallStatus,
    val startTime: Long? = null,
    val endTime: Long? = null
)
