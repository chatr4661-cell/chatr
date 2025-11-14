package com.chatr.app.data.models

data class User(
    val id: String,
    val email: String?,
    val phoneNumber: String?,
    val displayName: String?,
    val photoUrl: String?,
    val isOnline: Boolean = false,
    val lastSeen: Long? = null
)

data class Message(
    val id: String,
    val chatId: String,
    val senderId: String,
    val content: String,
    val timestamp: Long,
    val type: MessageType = MessageType.TEXT,
    val status: MessageStatus = MessageStatus.SENT
)

enum class MessageType {
    TEXT, IMAGE, VIDEO, AUDIO, FILE
}

enum class MessageStatus {
    SENDING, SENT, DELIVERED, READ, FAILED
}

data class Chat(
    val id: String,
    val participants: List<String>,
    val lastMessage: Message?,
    val unreadCount: Int = 0,
    val updatedAt: Long
)

data class CallData(
    val id: String,
    val callerId: String,
    val receiverId: String,
    val type: CallType,
    val status: CallStatus,
    val startTime: Long? = null,
    val endTime: Long? = null
)

enum class CallType {
    AUDIO, VIDEO
}

enum class CallStatus {
    INITIATING, RINGING, ACTIVE, ENDED, MISSED, REJECTED
}
