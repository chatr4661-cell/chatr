package com.chatr.app.domain.model

import kotlinx.serialization.Serializable

/**
 * Domain model for Message
 */
@Serializable
data class Message(
    val id: String,
    val conversationId: String,
    val senderId: String,
    val senderName: String?,
    val senderAvatar: String?,
    val content: String,
    val type: MessageType = MessageType.TEXT,
    val mediaUrl: String? = null,
    val mediaThumbnailUrl: String? = null,
    val replyToId: String? = null,
    val reactions: List<Reaction> = emptyList(),
    val status: MessageStatus = MessageStatus.PENDING,
    val isEdited: Boolean = false,
    val isDeleted: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
    val deliveredAt: Long? = null,
    val readAt: Long? = null
)

@Serializable
enum class MessageType {
    TEXT,
    IMAGE,
    VIDEO,
    AUDIO,
    VOICE_NOTE,
    DOCUMENT,
    LOCATION,
    CONTACT,
    STICKER,
    GIF,
    SYSTEM
}

@Serializable
enum class MessageStatus {
    PENDING,
    SENT,
    DELIVERED,
    READ,
    FAILED
}

@Serializable
data class Reaction(
    val userId: String,
    val emoji: String,
    val createdAt: Long = System.currentTimeMillis()
)
