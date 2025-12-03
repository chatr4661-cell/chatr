package com.chatr.app.data.models

// User model
data class User(
    val id: String,
    val email: String?,
    val phoneNumber: String?,
    val username: String?,
    val avatarUrl: String?,
    val isOnline: Boolean = false,
    val lastSeen: Long? = null,
    val bio: String? = null
)

// Chat model
data class Chat(
    val id: String,
    val participants: List<String>,
    val lastMessage: Message?,
    val unreadCount: Int = 0,
    val updatedAt: Long,
    val isGroup: Boolean = false,
    val groupName: String? = null,
    val groupIconUrl: String? = null,
    val otherUser: User? = null
)

// Message model
data class Message(
    val id: String,
    val conversationId: String,
    val senderId: String,
    val senderName: String? = null,
    val content: String,
    val timestamp: Long,
    val type: String = "TEXT",
    val status: String = "SENT",
    val replyTo: String? = null,
    val mediaUrl: String? = null,
    val deliveredAt: Long? = null,
    val readAt: Long? = null
)

// Call types
enum class CallType { AUDIO, VIDEO }
enum class CallStatus { INITIATING, RINGING, ACTIVE, ENDED, MISSED, REJECTED }

// Message types and status
enum class MessageType { TEXT, IMAGE, VIDEO, AUDIO, FILE, LOCATION, VOICE_NOTE, SYSTEM }
enum class MessageStatus { PENDING, SENDING, SENT, DELIVERED, READ, FAILED }
